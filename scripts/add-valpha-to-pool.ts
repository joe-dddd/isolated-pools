import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const ALPHA = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const VALPHA = "0x664a7313c341931b1a44A8f23db76E1D3E6a5e07";
  const POOL_REGISTRY = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const ACM = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";

  console.log("Adding vALPHA to Alpha Pool...\n");

  const poolRegistry = await ethers.getContractAt("PoolRegistry", POOL_REGISTRY);
  const alphaToken = await ethers.getContractAt("MockToken", ALPHA);
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);
  const acm = await ethers.getContractAt("AccessControlManager", ACM);

  // Check if already exists
  const allMarkets = await comptroller.getAllMarkets();
  console.log("Current markets:", allMarkets);

  if (allMarkets.map((m: string) => m.toLowerCase()).includes(VALPHA.toLowerCase())) {
    console.log("vALPHA already in pool");
    return;
  }

  // Grant ACM permissions
  const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
  const hasCollateral = await acm.isAllowedToCall(POOL_REGISTRY, setCollateralSig);
  if (!hasCollateral) {
    console.log("Granting setCollateralFactor...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setCollateralSig, POOL_REGISTRY);
    await tx.wait();
  }

  const setSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
  const hasSupplyCaps = await acm.isAllowedToCall(POOL_REGISTRY, setSupplyCapsSig);
  if (!hasSupplyCaps) {
    console.log("Granting setMarketSupplyCaps...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setSupplyCapsSig, POOL_REGISTRY);
    await tx.wait();
  }

  const setBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
  const hasBorrowCaps = await acm.isAllowedToCall(POOL_REGISTRY, setBorrowCapsSig);
  if (!hasBorrowCaps) {
    console.log("Granting setMarketBorrowCaps...");
    const tx = await acm.giveCallPermission(COMPTROLLER, setBorrowCapsSig, POOL_REGISTRY);
    await tx.wait();
  }

  // Approve and add market
  const initialSupply = ethers.utils.parseUnits("1000", 18);
  console.log("\nApproving PoolRegistry...");
  const approveTx = await alphaToken.approve(POOL_REGISTRY, initialSupply);
  await approveTx.wait();
  console.log("Approved!");

  console.log("Adding vALPHA market...");
  const tx = await poolRegistry.addMarket({
    vToken: VALPHA,
    collateralFactor: ethers.utils.parseUnits("0.6", 18), // 60%
    liquidationThreshold: ethers.utils.parseUnits("0.7", 18), // 70%
    initialSupply: initialSupply,
    vTokenReceiver: deployer.address,
    supplyCap: ethers.utils.parseUnits("10000000", 18),
    borrowCap: ethers.utils.parseUnits("8000000", 18),
  });
  await tx.wait();

  console.log("\n✅ vALPHA added to Alpha Pool!");
  console.log("Transaction:", tx.hash);
}

main().catch(console.error);
