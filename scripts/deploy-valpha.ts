import { ethers } from "hardhat";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Addresses
  const ALPHA_TOKEN = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const POOL_REGISTRY = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const VTOKEN_BEACON = "0x7461D15ac1DB42abE22Afcd264B471baEbA44Be0";
  const JUMP_RATE_MODEL = ethers.utils.getAddress("0xc5f83de7e31bdb07057f98d2c5f05f0b2b3d55a4");

  console.log("\n=== Deploying vALPHA VToken ===");

  const VToken = await ethers.getContractFactory("VToken");

  // vALPHA (18 decimals underlying)
  const vALPHADecimals = 8;
  const alphaExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vALPHADecimals); // 10^28
  const alphaReserveFactor = ethers.utils.parseUnits("0.2", 18); // 20%

  const vALPHAInitData = VToken.interface.encodeFunctionData("initialize", [
    ALPHA_TOKEN,
    COMPTROLLER,
    JUMP_RATE_MODEL,
    alphaExchangeRate,
    "Venus AlphaToken (Alpha)",
    "vALPHA_Alpha",
    vALPHADecimals,
    deployer.address,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    alphaReserveFactor,
  ]);

  // Deploy BeaconProxy for vALPHA
  const BeaconProxy = await ethers.getContractFactory("BeaconProxy");
  const vALPHA = await BeaconProxy.deploy(VTOKEN_BEACON, vALPHAInitData);
  await vALPHA.deployed();

  console.log("vALPHA deployed at:", vALPHA.address);

  // Add market to Alpha Pool
  console.log("\n=== Adding vALPHA to Alpha Pool ===");

  const poolRegistry = await ethers.getContractAt("PoolRegistry", POOL_REGISTRY);
  const alphaToken = await ethers.getContractAt("MockToken", ALPHA_TOKEN);
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);

  // Check if market already exists
  const allMarkets = await comptroller.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (marketsLower.includes(vALPHA.address.toLowerCase())) {
    console.log("vALPHA already in pool");
    return;
  }

  // Grant ACM permissions if needed
  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);

  const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
  const hasCollateral = await acm.isAllowedToCall(POOL_REGISTRY, setCollateralSig);
  if (!hasCollateral) {
    console.log("Granting setCollateralFactor permission...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setCollateralSig, POOL_REGISTRY);
    await tx.wait();
  }

  const setSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
  const hasSupplyCaps = await acm.isAllowedToCall(POOL_REGISTRY, setSupplyCapsSig);
  if (!hasSupplyCaps) {
    console.log("Granting setMarketSupplyCaps permission...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setSupplyCapsSig, POOL_REGISTRY);
    await tx.wait();
  }

  const setBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
  const hasBorrowCaps = await acm.isAllowedToCall(POOL_REGISTRY, setBorrowCapsSig);
  if (!hasBorrowCaps) {
    console.log("Granting setMarketBorrowCaps permission...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setBorrowCapsSig, POOL_REGISTRY);
    await tx.wait();
  }

  // Approve and add market
  const initialSupply = ethers.utils.parseUnits("1000", 18); // 1000 ALPHA
  console.log("Approving PoolRegistry to spend ALPHA...");
  const approveTx = await alphaToken.approve(POOL_REGISTRY, initialSupply);
  await approveTx.wait();

  console.log("Adding vALPHA market...");
  const addMarketTx = await poolRegistry.addMarket({
    vToken: vALPHA.address,
    collateralFactor: ethers.utils.parseUnits("0.6", 18), // 60%
    liquidationThreshold: ethers.utils.parseUnits("0.7", 18), // 70%
    initialSupply: initialSupply,
    vTokenReceiver: deployer.address,
    supplyCap: ethers.utils.parseUnits("10000000", 18),
    borrowCap: ethers.utils.parseUnits("8000000", 18),
  });
  await addMarketTx.wait();

  console.log("\n=== vALPHA Deployment Complete ===");
  console.log("vALPHA:", vALPHA.address);
  console.log("Collateral Factor: 60%");
  console.log("Liquidation Threshold: 70%");
  console.log("Initial Supply: 1000 ALPHA");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
