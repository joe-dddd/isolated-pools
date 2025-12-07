import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001"; // ADDRESS_ONE

// Add vWBNB to Alpha Pool
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy WrappedNative (WBNB) for testnet
  const wbnb = await deploy("WBNB", {
    contract: "WrappedNative",
    from: deployer,
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("WBNB deployed at:", wbnb.address);

  // Get required contracts
  const vTokenBeacon = await get("VTokenBeacon");
  const alphaComptroller = await get("Comptroller_Alpha");
  const poolRegistry = await get("PoolRegistry_Proxy");
  const oracle = await get("PancakeV2TWAPOracle");
  const jumpRateModel = await get("JumpRateModelV2_base200bps_slope1000bps_jump25000bps_kink8000bps_bpy42048000");

  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry.address);
  const alphaComptrollerContract = await ethers.getContractAt("Comptroller", alphaComptroller.address);

  // Deploy vWBNB VToken
  const VToken = await ethers.getContractFactory("VToken");
  const vWBNBDecimals = 8;
  const wbnbExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vWBNBDecimals); // 10^28
  const wbnbReserveFactor = ethers.utils.parseUnits("0.25", 18); // 25%

  const vWBNBInitData = VToken.interface.encodeFunctionData("initialize", [
    wbnb.address,
    alphaComptroller.address,
    jumpRateModel.address,
    wbnbExchangeRate,
    "Venus Wrapped BNB (Alpha)",
    "vWBNB_Alpha",
    vWBNBDecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    wbnbReserveFactor,
  ]);

  const vWBNB = await deploy("VToken_vWBNB_Alpha", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vWBNBInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vWBNB deployed at:", vWBNB.address);

  // Set WBNB price in oracle FIRST (600 USD for BNB)
  const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle.address);
  const currentWbnbPrice = await oracleContract.directPrices(wbnb.address);
  if (currentWbnbPrice.eq(0)) {
    console.log("Setting WBNB price to 600 USD...");
    const wbnbPrice = ethers.utils.parseUnits("600", 18);
    const tx = await oracleContract.setDirectPrice(wbnb.address, wbnbPrice);
    await tx.wait();
    console.log("WBNB price set");
  }

  // Check if vWBNB already added to pool
  const allMarkets = await alphaComptrollerContract.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (!marketsLower.includes(vWBNB.address.toLowerCase())) {
    console.log("Adding vWBNB to Alpha Pool...");

    // Grant permissions
    const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
    const hasCollateral = await acm.isAllowedToCall(poolRegistry.address, setCollateralSig);
    if (!hasCollateral) {
      console.log("Granting setCollateralFactor permission...");
      const tx = await acm.giveCallPermission(alphaComptroller.address, setCollateralSig, poolRegistry.address);
      await tx.wait();
    }

    const setSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
    const hasSupplyCaps = await acm.isAllowedToCall(poolRegistry.address, setSupplyCapsSig);
    if (!hasSupplyCaps) {
      const tx = await acm.giveCallPermission(alphaComptroller.address, setSupplyCapsSig, poolRegistry.address);
      await tx.wait();
    }

    const setBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
    const hasBorrowCaps = await acm.isAllowedToCall(poolRegistry.address, setBorrowCapsSig);
    if (!hasBorrowCaps) {
      const tx = await acm.giveCallPermission(alphaComptroller.address, setBorrowCapsSig, poolRegistry.address);
      await tx.wait();
    }

    const addMarketSig = "addMarket(AddMarketInput)";
    const hasAddMarketPerm = await acm.isAllowedToCall(deployer, addMarketSig);
    if (!hasAddMarketPerm) {
      console.log("Granting addMarket permission...");
      const tx = await acm.giveCallPermission(poolRegistry.address, addMarketSig, deployer);
      await tx.wait();
    }

    // Wrap some BNB for initial liquidity
    const wbnbContract = await ethers.getContractAt("WrappedNative", wbnb.address);
    const wbnbInitialSupply = ethers.utils.parseUnits("0.1", 18); // 0.1 WBNB
    const depositTx = await wbnbContract.deposit({ value: wbnbInitialSupply });
    await depositTx.wait();
    console.log("Wrapped 0.1 BNB to WBNB");

    // Approve and add market
    await wbnbContract.approve(poolRegistry.address, wbnbInitialSupply);
    const tx = await poolRegistryContract.addMarket({
      vToken: vWBNB.address,
      collateralFactor: ethers.utils.parseUnits("0.75", 18), // 75% LTV
      liquidationThreshold: ethers.utils.parseUnits("0.8", 18), // 80%
      initialSupply: wbnbInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000", 18), // 10k BNB
      borrowCap: ethers.utils.parseUnits("8000", 18), // 8k BNB
    });
    await tx.wait();
    console.log("vWBNB added to Alpha Pool");
  }

  // Deploy NativeTokenGateway
  const gateway = await deploy("NativeTokenGateway_Alpha", {
    contract: "NativeTokenGateway",
    from: deployer,
    args: [vWBNB.address],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("NativeTokenGateway deployed at:", gateway.address);

  console.log("\n=== Alpha Pool Native Token Deployed ===");
  console.log("WBNB:", wbnb.address);
  console.log("vWBNB:", vWBNB.address);
  console.log("NativeTokenGateway:", gateway.address);
};

func.tags = ["AlphaPoolNative"];
func.dependencies = ["AlphaPool"];

export default func;
