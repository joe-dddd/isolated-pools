import { ethers } from "hardhat";

async function main() {
  const ORACLE = "0xAf0FcfB7B6a0EF5f5947FD96384c9cBCe3170ffe";
  const ALPHA = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  console.log("Updating ALPHA price...");
  const tx = await oracle.updateAssetPrice(ALPHA);
  await tx.wait();
  console.log("Updated! Tx:", tx.hash);

  const price = await oracle.getPrice(ALPHA);
  console.log("\nALPHA price:", ethers.utils.formatUnits(price, 18), "USD");
}

main().catch(console.error);
