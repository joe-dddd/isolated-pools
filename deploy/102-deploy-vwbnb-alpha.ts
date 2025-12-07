import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const comptrollerAlpha = await get("Comptroller_Alpha");
  const vTokenBeacon = await get("VTokenBeacon");
  const wbnb = await get("WBNB");
  const poolRegistry = await get("PoolRegistry_Proxy");
  const jumpRateModel = await get("JumpRateModelV2_base200bps_slope1000bps_jump25000bps_kink8000bps_bpy42048000");

  console.log("Deploying vWBNB to Alpha pool...");
  console.log("Comptroller:", comptrollerAlpha.address);
  console.log("WBNB:", wbnb.address);

  const VToken = await ethers.getContractFactory("VToken");

  // vWBNB: 18 decimals underlying (WBNB)
  const vWBNBDecimals = 8;
  const wbnbExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vWBNBDecimals); // 10^28
  const wbnbReserveFactor = ethers.utils.parseUnits("0.15", 18); // 15%

  const vWBNBInitData = VToken.interface.encodeFunctionData("initialize", [
    wbnb.address,
    comptrollerAlpha.address,
    ethers.utils.getAddress(jumpRateModel.address),
    wbnbExchangeRate,
    "Venus WBNB (Alpha)",
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

  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry.address);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha.address);

  // Grant ACM permission
  const addMarketSig = "addMarket(AddMarketInput)";
  const hasAddMarketPerm = await acm.isAllowedToCall(deployer, addMarketSig);
  if (!hasAddMarketPerm) {
    console.log("Granting addMarket permission...");
    const tx = await acm.giveCallPermission(poolRegistry.address, addMarketSig, deployer);
    await tx.wait();
  }

  // Check if market already added
  const allMarkets = await comptroller.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (!marketsLower.includes(vWBNB.address.toLowerCase())) {
    console.log("Adding vWBNB to Alpha pool via PoolRegistry...");

    // Initial supply
    const wbnbInitialSupply = ethers.utils.parseUnits("0.1", 18); // 0.1 WBNB

    // Wrap BNB to WBNB
    const wbnbContract = await ethers.getContractAt("IWrappedNative", wbnb.address);
    const depositTx = await wbnbContract.deposit({ value: wbnbInitialSupply });
    await depositTx.wait();
    console.log("Deposited 0.1 BNB to WBNB");

    // Approve PoolRegistry
    const approveTx = await wbnbContract.approve(poolRegistry.address, wbnbInitialSupply);
    await approveTx.wait();

    // Add market
    const addMarketInput = {
      vToken: vWBNB.address,
      collateralFactor: ethers.utils.parseUnits("0.75", 18), // 75%
      liquidationThreshold: ethers.utils.parseUnits("0.8", 18), // 80%
      initialSupply: wbnbInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("1000", 18),
      borrowCap: ethers.utils.parseUnits("800", 18),
    };

    const tx = await poolRegistryContract.addMarket(addMarketInput);
    await tx.wait();
    console.log("vWBNB added to Alpha pool");
  }

  console.log("vWBNB deployment complete!");
  console.log("vWBNB address:", vWBNB.address);
};

func.tags = ["AlphaVWBNB"];

export default func;
