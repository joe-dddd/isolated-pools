import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Addresses
  const ORACLE = "0xAf0FcfB7B6a0EF5f5947FD96384c9cBCe3170ffe";
  const ALPHA = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const ALPHA_USDT_LP = "0xD869ad81C78F0525a429569bEa9565207449a5c2";

  console.log("Oracle:", ORACLE);
  console.log("AlphaToken:", ALPHA);
  console.log("ALPHA/USDT LP:", ALPHA_USDT_LP);

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // 1. Add pair
  console.log("\n1. Adding ALPHA/USDT pair to oracle...");
  const tx1 = await oracle.addPair(ALPHA, ALPHA_USDT_LP);
  await tx1.wait();
  console.log("   Pair added! Tx:", tx1.hash);

  // 2. Initialize TWAP (CRITICAL)
  console.log("\n2. Initializing TWAP for ALPHA...");
  const tx2 = await oracle.updateAssetPrice(ALPHA);
  await tx2.wait();
  console.log("   TWAP initialized! Tx:", tx2.hash);

  // 3. Verify
  console.log("\n3. Verifying oracle setup...");
  const observation = await oracle.observations(ALPHA);
  console.log("   Observation initialized:", observation.initialized);

  try {
    const price = await oracle.getPrice(ALPHA);
    console.log("   ALPHA price:", ethers.utils.formatUnits(price, 18), "USD");
  } catch (error: any) {
    console.log("   Error getting price:", error.message);
  }

  console.log("\n=== Oracle Setup Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
