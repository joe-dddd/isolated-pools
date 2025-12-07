import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001"; // ADDRESS_ONE, not using shortfall

// Deploy vMockUSDT and vMockTKN in Stablecoins pool
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get required contracts
  const comptrollerStablecoins = await get("Comptroller_Stablecoins");
  const vTokenBeacon = await get("VTokenBeacon");
  const mockUSDT = await get("MockUSDT");
  const mockTKN = await get("MockTKN");
  const poolRegistry = await get("PoolRegistry_Proxy");

  // Use existing JumpRateModel for stablecoins
  const jumpRateModel = await get("JumpRateModelV2_base200bps_slope1000bps_jump25000bps_kink8000bps_bpy42048000");

  console.log("Deploying vMockUSDT and vMockTKN to Stablecoins pool...");
  console.log("Comptroller:", comptrollerStablecoins.address);
  console.log("VTokenBeacon:", vTokenBeacon.address);
  console.log("JumpRateModel:", jumpRateModel.address);
  console.log("PoolRegistry:", poolRegistry.address);
  console.log("PSR:", OUR_PSR_ADDRESS);

  const VToken = await ethers.getContractFactory("VToken");

  // Deploy vMockUSDT (6 decimals underlying)
  const vUSDTDecimals = 8;
  const usdtExchangeRate = ethers.utils.parseUnits("1", 6 + 18 - vUSDTDecimals); // 10^16
  const usdtReserveFactor = ethers.utils.parseUnits("0.1", 18); // 10%

  const vUSDTInitData = VToken.interface.encodeFunctionData("initialize", [
    mockUSDT.address,
    comptrollerStablecoins.address,
    jumpRateModel.address,
    usdtExchangeRate,
    "Venus MockUSDT (Stablecoins)",
    "vMockUSDT_Stablecoins",
    vUSDTDecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    usdtReserveFactor,
  ]);

  const vMockUSDT = await deploy("VToken_vMockUSDT_Stablecoins", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vUSDTInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vMockUSDT deployed at:", vMockUSDT.address);

  // Deploy vMockTKN (18 decimals underlying)
  const vTKNDecimals = 8;
  const tknExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vTKNDecimals); // 10^28
  const tknReserveFactor = ethers.utils.parseUnits("0.2", 18); // 20%

  const vTKNInitData = VToken.interface.encodeFunctionData("initialize", [
    mockTKN.address,
    comptrollerStablecoins.address,
    jumpRateModel.address,
    tknExchangeRate,
    "Venus MockToken (Stablecoins)",
    "vMockTKN_Stablecoins",
    vTKNDecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    tknReserveFactor,
  ]);

  const vMockTKN = await deploy("VToken_vMockTKN_Stablecoins", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vTKNInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vMockTKN deployed at:", vMockTKN.address);

  // Grant ACM permissions for PoolRegistry.addMarket
  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry.address);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerStablecoins.address);

  // Check if deployer has permission to addMarket
  const addMarketSig = "addMarket(AddMarketInput)";
  const hasAddMarketPerm = await acm.isAllowedToCall(deployer, addMarketSig);
  if (!hasAddMarketPerm) {
    console.log("Granting addMarket permission to deployer...");
    const tx = await acm.giveCallPermission(poolRegistry.address, addMarketSig, deployer);
    await tx.wait();
    console.log("addMarket permission granted");
  }

  // Get MockToken contracts to approve initial supply
  const MockToken = await ethers.getContractFactory("MockToken");
  const usdtToken = MockToken.attach(mockUSDT.address);
  const tknToken = MockToken.attach(mockTKN.address);

  // Check if markets already added
  const allMarkets = await comptroller.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  // Initial supply amounts
  const usdtInitialSupply = ethers.utils.parseUnits("1000", 6); // 1000 USDT
  const tknInitialSupply = ethers.utils.parseUnits("1000", 18); // 1000 TKN

  if (!marketsLower.includes(vMockUSDT.address.toLowerCase())) {
    console.log("Adding vMockUSDT to Stablecoins pool via PoolRegistry...");

    // Approve PoolRegistry to spend initial supply
    const approveTx1 = await usdtToken.approve(poolRegistry.address, usdtInitialSupply);
    await approveTx1.wait();

    // Add market via PoolRegistry
    const addMarketInput1 = {
      vToken: vMockUSDT.address,
      collateralFactor: ethers.utils.parseUnits("0.7", 18), // 70%
      liquidationThreshold: ethers.utils.parseUnits("0.8", 18), // 80%
      initialSupply: usdtInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000000", 6),
      borrowCap: ethers.utils.parseUnits("8000000", 6),
    };

    const tx1 = await poolRegistryContract.addMarket(addMarketInput1);
    await tx1.wait();
    console.log("vMockUSDT added to pool");
  }

  if (!marketsLower.includes(vMockTKN.address.toLowerCase())) {
    console.log("Adding vMockTKN to Stablecoins pool via PoolRegistry...");

    // Approve PoolRegistry to spend initial supply
    const approveTx2 = await tknToken.approve(poolRegistry.address, tknInitialSupply);
    await approveTx2.wait();

    // Add market via PoolRegistry
    const addMarketInput2 = {
      vToken: vMockTKN.address,
      collateralFactor: ethers.utils.parseUnits("0.6", 18), // 60%
      liquidationThreshold: ethers.utils.parseUnits("0.7", 18), // 70%
      initialSupply: tknInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000000", 18),
      borrowCap: ethers.utils.parseUnits("8000000", 18),
    };

    const tx2 = await poolRegistryContract.addMarket(addMarketInput2);
    await tx2.wait();
    console.log("vMockTKN added to pool");
  }

  console.log("Test VTokens deployed and configured!");
  console.log("vMockUSDT:", vMockUSDT.address);
  console.log("vMockTKN:", vMockTKN.address);
};

func.tags = ["TestVTokens"];
func.dependencies = ["TestTokens"];

export default func;
