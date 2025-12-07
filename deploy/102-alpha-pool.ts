import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001"; // ADDRESS_ONE, not using shortfall

// Create Alpha Pool with vMockUSDT and vMockTKN
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get required contracts
  const comptrollerBeacon = await get("ComptrollerBeacon");
  const vTokenBeacon = await get("VTokenBeacon");
  const mockUSDT = await get("MockUSDT");
  const mockTKN = await get("MockTKN");
  const poolRegistry = await get("PoolRegistry_Proxy");
  const oracle = await get("PancakeV2TWAPOracle");

  // Use existing JumpRateModel
  const jumpRateModel = await get("JumpRateModelV2_base200bps_slope1000bps_jump25000bps_kink8000bps_bpy42048000");

  console.log("Creating Alpha Pool...");
  console.log("ComptrollerBeacon:", comptrollerBeacon.address);
  console.log("VTokenBeacon:", vTokenBeacon.address);
  console.log("PoolRegistry:", poolRegistry.address);
  console.log("Oracle:", oracle.address);

  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry.address);

  // First, grant ACM permissions
  const addPoolSig = "addPool(string,address,uint256,uint256,uint256)";
  const addMarketSig = "addMarket(AddMarketInput)";

  const hasAddPoolPerm = await acm.isAllowedToCall(deployer, addPoolSig);
  if (!hasAddPoolPerm) {
    console.log("Granting addPool permission to deployer...");
    const tx = await acm.giveCallPermission(poolRegistry.address, addPoolSig, deployer);
    await tx.wait();
    console.log("addPool permission granted");
  }

  const hasAddMarketPerm = await acm.isAllowedToCall(deployer, addMarketSig);
  if (!hasAddMarketPerm) {
    console.log("Granting addMarket permission to deployer...");
    const tx = await acm.giveCallPermission(poolRegistry.address, addMarketSig, deployer);
    await tx.wait();
    console.log("addMarket permission granted");
  }

  // Deploy Comptroller for Alpha Pool
  const Comptroller = await ethers.getContractFactory("Comptroller");
  const comptrollerInitData = Comptroller.interface.encodeFunctionData("initialize", [
    poolRegistry.address,
    OUR_ACM_ADDRESS,
  ]);

  const alphaComptroller = await deploy("Comptroller_Alpha", {
    contract: "BeaconProxy",
    from: deployer,
    args: [comptrollerBeacon.address, comptrollerInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("Alpha Comptroller deployed at:", alphaComptroller.address);

  // Set oracle for Alpha Comptroller
  const alphaComptrollerContract = await ethers.getContractAt("Comptroller", alphaComptroller.address);

  // Grant permissions for Comptroller functions
  const setPriceOracleSig = "setPriceOracle(address)";
  const hasSetOraclePerm = await acm.isAllowedToCall(deployer, setPriceOracleSig);
  if (!hasSetOraclePerm) {
    console.log("Granting setPriceOracle permission to deployer...");
    const tx = await acm.giveCallPermission(alphaComptroller.address, setPriceOracleSig, deployer);
    await tx.wait();
  }

  // Set oracle
  const currentOracle = await alphaComptrollerContract.oracle();
  if (currentOracle === ethers.constants.AddressZero) {
    console.log("Setting oracle for Alpha Comptroller...");
    const tx = await alphaComptrollerContract.setPriceOracle(oracle.address);
    await tx.wait();
    console.log("Oracle set");
  }

  // Check if Alpha Pool is registered
  const allPools = await poolRegistryContract.getAllPools();
  const poolComptrollers = allPools.map((p: any) => p.comptroller.toLowerCase());

  if (!poolComptrollers.includes(alphaComptroller.address.toLowerCase())) {
    console.log("Registering Alpha Pool in PoolRegistry...");

    // Grant setCloseFactor, setLiquidationIncentive, setMinLiquidatableCollateral permissions
    const setCloseFactorSig = "setCloseFactor(uint256)";
    const setLiquidationIncentiveSig = "setLiquidationIncentive(uint256)";
    const setMinLiquidatableSig = "setMinLiquidatableCollateral(uint256)";

    // Grant permissions to PoolRegistry (it calls Comptroller functions)
    const hasCloseFactor = await acm.isAllowedToCall(poolRegistry.address, setCloseFactorSig);
    if (!hasCloseFactor) {
      console.log("Granting setCloseFactor permission to PoolRegistry...");
      const tx = await acm.giveCallPermission(alphaComptroller.address, setCloseFactorSig, poolRegistry.address);
      await tx.wait();
    }
    const hasLiqIncentive = await acm.isAllowedToCall(poolRegistry.address, setLiquidationIncentiveSig);
    if (!hasLiqIncentive) {
      console.log("Granting setLiquidationIncentive permission to PoolRegistry...");
      const tx = await acm.giveCallPermission(
        alphaComptroller.address,
        setLiquidationIncentiveSig,
        poolRegistry.address,
      );
      await tx.wait();
    }
    const hasMinLiq = await acm.isAllowedToCall(poolRegistry.address, setMinLiquidatableSig);
    if (!hasMinLiq) {
      console.log("Granting setMinLiquidatableCollateral permission to PoolRegistry...");
      const tx = await acm.giveCallPermission(alphaComptroller.address, setMinLiquidatableSig, poolRegistry.address);
      await tx.wait();
    }

    const closeFactor = ethers.utils.parseUnits("0.5", 18); // 50%
    const liquidationIncentive = ethers.utils.parseUnits("1.1", 18); // 10% bonus
    const minLiquidatableCollateral = ethers.utils.parseUnits("100", 18); // 100 USD

    const addPoolTx = await poolRegistryContract.addPool(
      "Alpha Pool",
      alphaComptroller.address,
      closeFactor,
      liquidationIncentive,
      minLiquidatableCollateral,
    );
    await addPoolTx.wait();
    console.log("Alpha Pool registered");
  }

  // Deploy VTokens for Alpha Pool
  const VToken = await ethers.getContractFactory("VToken");

  // vMockUSDT (6 decimals underlying)
  const vUSDTDecimals = 8;
  const usdtExchangeRate = ethers.utils.parseUnits("1", 6 + 18 - vUSDTDecimals); // 10^16
  const usdtReserveFactor = ethers.utils.parseUnits("0.1", 18); // 10%

  const vUSDTInitData = VToken.interface.encodeFunctionData("initialize", [
    mockUSDT.address,
    alphaComptroller.address,
    jumpRateModel.address,
    usdtExchangeRate,
    "Venus MockUSDT (Alpha)",
    "vMockUSDT_Alpha",
    vUSDTDecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    usdtReserveFactor,
  ]);

  const vMockUSDT = await deploy("VToken_vMockUSDT_Alpha", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vUSDTInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vMockUSDT deployed at:", vMockUSDT.address);

  // vMockTKN (18 decimals underlying)
  const vTKNDecimals = 8;
  const tknExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vTKNDecimals); // 10^28
  const tknReserveFactor = ethers.utils.parseUnits("0.2", 18); // 20%

  const vTKNInitData = VToken.interface.encodeFunctionData("initialize", [
    mockTKN.address,
    alphaComptroller.address,
    jumpRateModel.address,
    tknExchangeRate,
    "Venus MockToken (Alpha)",
    "vMockTKN_Alpha",
    vTKNDecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    tknReserveFactor,
  ]);

  const vMockTKN = await deploy("VToken_vMockTKN_Alpha", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vTKNInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vMockTKN deployed at:", vMockTKN.address);

  // Add markets to Alpha Pool
  const MockToken = await ethers.getContractFactory("MockToken");
  const usdtToken = MockToken.attach(mockUSDT.address);
  const tknToken = MockToken.attach(mockTKN.address);

  const allMarkets = await alphaComptrollerContract.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  // Grant setCollateralFactor and setCaps permissions to PoolRegistry
  const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
  const hasCollateral = await acm.isAllowedToCall(poolRegistry.address, setCollateralSig);
  if (!hasCollateral) {
    console.log("Granting setCollateralFactor permission to PoolRegistry...");
    const tx = await acm.giveCallPermission(alphaComptroller.address, setCollateralSig, poolRegistry.address);
    await tx.wait();
  }

  const setSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
  const hasSupplyCaps = await acm.isAllowedToCall(poolRegistry.address, setSupplyCapsSig);
  if (!hasSupplyCaps) {
    console.log("Granting setMarketSupplyCaps permission to PoolRegistry...");
    const tx = await acm.giveCallPermission(alphaComptroller.address, setSupplyCapsSig, poolRegistry.address);
    await tx.wait();
  }

  const setBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
  const hasBorrowCaps = await acm.isAllowedToCall(poolRegistry.address, setBorrowCapsSig);
  if (!hasBorrowCaps) {
    console.log("Granting setMarketBorrowCaps permission to PoolRegistry...");
    const tx = await acm.giveCallPermission(alphaComptroller.address, setBorrowCapsSig, poolRegistry.address);
    await tx.wait();
  }

  const usdtInitialSupply = ethers.utils.parseUnits("1000", 6); // 1000 USDT
  const tknInitialSupply = ethers.utils.parseUnits("1000", 18); // 1000 TKN

  if (!marketsLower.includes(vMockUSDT.address.toLowerCase())) {
    console.log("Adding vMockUSDT to Alpha Pool...");
    await usdtToken.approve(poolRegistry.address, usdtInitialSupply);
    const tx = await poolRegistryContract.addMarket({
      vToken: vMockUSDT.address,
      collateralFactor: ethers.utils.parseUnits("0.7", 18),
      liquidationThreshold: ethers.utils.parseUnits("0.8", 18),
      initialSupply: usdtInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000000", 6),
      borrowCap: ethers.utils.parseUnits("8000000", 6),
    });
    await tx.wait();
    console.log("vMockUSDT added to pool");
  }

  if (!marketsLower.includes(vMockTKN.address.toLowerCase())) {
    console.log("Adding vMockTKN to Alpha Pool...");
    const approveTx = await tknToken.approve(poolRegistry.address, tknInitialSupply);
    await approveTx.wait();
    const tx = await poolRegistryContract.addMarket({
      vToken: vMockTKN.address,
      collateralFactor: ethers.utils.parseUnits("0", 18),
      liquidationThreshold: ethers.utils.parseUnits("0.7", 18),
      initialSupply: tknInitialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000000", 18),
      borrowCap: ethers.utils.parseUnits("8000000", 18),
    });
    await tx.wait();
    console.log("vMockTKN added to pool");
  }

  console.log("\n=== Alpha Pool Deployed ===");
  console.log("Comptroller:", alphaComptroller.address);
  console.log("vMockUSDT:", vMockUSDT.address);
  console.log("vMockTKN:", vMockTKN.address);
};

func.tags = ["AlphaPool"];
func.dependencies = ["TestTokens", "Oracle"];

export default func;
