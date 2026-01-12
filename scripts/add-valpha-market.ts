import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ALPHA = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const POOL_REGISTRY = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const ACM = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";

  const poolRegistry = await ethers.getContractAt("PoolRegistry", POOL_REGISTRY);
  const alphaToken = await ethers.getContractAt("MockToken", ALPHA);
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);
  const acm = await ethers.getContractAt("AccessControlManager", ACM);

  // Check if already exists
  const allMarkets = await comptroller.getAllMarkets();
  console.log("Current markets:", allMarkets.length);

  // Grant permissions
  console.log("\nGranting permissions...");
  const addMarketSig = "addMarket(AddMarketInput)";
  const hasAddMarketPerm = await acm.isAllowedToCall(deployer.address, addMarketSig);
  if (!hasAddMarketPerm) {
    console.log("Granting addMarket...");
    const tx = await acm.giveCallPermission(POOL_REGISTRY, addMarketSig, deployer.address);
    await tx.wait();
  }

  // Use PoolRegistry.addMarket() - it deploys VToken internally
  console.log("\nAdding ALPHA market via PoolRegistry.addMarket()...");

  const initialSupply = ethers.utils.parseUnits("1000", 18);
  await alphaToken.approve(POOL_REGISTRY, initialSupply);

  const tx = await poolRegistry.addMarket({
    vToken: ethers.constants.AddressZero, // PoolRegistry will deploy
    comptroller: COMPTROLLER,
    asset: ALPHA,
    decimals: 8,
    name: "Venus AlphaToken",
    symbol: "vALPHA",
    rateModel: "0xc5f83De7e31bdB07057f98D2c5f05f0b2B3D55a4",
    collateralFactor: ethers.utils.parseUnits("0.6", 18),
    liquidationThreshold: ethers.utils.parseUnits("0.7", 18),
    initialSupply: initialSupply,
    vTokenReceiver: deployer.address,
    supplyCap: ethers.utils.parseUnits("10000000", 18),
    borrowCap: ethers.utils.parseUnits("8000000", 18),
  });

  const receipt = await tx.wait();
  console.log("Market added! Tx:", receipt.transactionHash);

  const newMarkets = await comptroller.getAllMarkets();
  const vALPHA = newMarkets[newMarkets.length - 1];
  console.log("\nvALPHA deployed at:", vALPHA);
}

main().catch(console.error);
