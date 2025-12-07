import { ethers } from "hardhat";

const ORACLE = "0xa29fb7cc0a1960b6fd6936F68921d96f9B86e40E";
const TKN = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

async function main() {
  console.log("\n=== Updating Oracle Prices ===");
  console.log(`Oracle: ${ORACLE}`);
  console.log(`TKN: ${TKN}`);
  console.log(`WBNB: ${WBNB}`);

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // Check if prices can be updated
  console.log("\n=== Checking if prices can be updated ===");
  const canUpdateTkn = await oracle.canUpdate(TKN);
  const canUpdateWbnb = await oracle.canUpdate(WBNB);
  console.log(`TKN can update: ${canUpdateTkn ? "✅" : "❌"}`);
  console.log(`WBNB can update: ${canUpdateWbnb ? "✅" : "❌"}`);

  // Get current prices before update
  console.log("\n=== Current Prices ===");
  try {
    const tknPrice = await oracle.getPrice(TKN);
    console.log(`TKN price: $${ethers.utils.formatUnits(tknPrice, 18)}`);
  } catch (e) {
    console.log(`TKN price: Not initialized or error - ${(e as Error).message}`);
  }

  try {
    const wbnbPrice = await oracle.getPrice(WBNB);
    console.log(`WBNB price: $${ethers.utils.formatUnits(wbnbPrice, 18)}`);
  } catch (e) {
    console.log(`WBNB price: Not initialized or error - ${(e as Error).message}`);
  }

  // Update TKN price
  if (canUpdateTkn) {
    console.log("\n=== Updating TKN Price ===");
    const tx1 = await oracle.updateAssetPrice(TKN);
    await tx1.wait();
    console.log("✅ TKN price updated");
  } else {
    console.log("\n⏳ TKN price cannot be updated yet (need to wait for PERIOD to elapse)");
  }

  // Update WBNB price
  if (canUpdateWbnb) {
    console.log("\n=== Updating WBNB Price ===");
    const tx2 = await oracle.updateAssetPrice(WBNB);
    await tx2.wait();
    console.log("✅ WBNB price updated");
  } else {
    console.log("\n⏳ WBNB price cannot be updated yet (need to wait for PERIOD to elapse)");
  }

  // Get new prices after update
  console.log("\n=== New Prices ===");
  try {
    const tknPrice = await oracle.getPrice(TKN);
    console.log(`TKN price: $${ethers.utils.formatUnits(tknPrice, 18)}`);
  } catch (e) {
    console.log(`TKN price: Not initialized or error - ${(e as Error).message}`);
  }

  try {
    const wbnbPrice = await oracle.getPrice(WBNB);
    console.log(`WBNB price: $${ethers.utils.formatUnits(wbnbPrice, 18)}`);
  } catch (e) {
    console.log(`WBNB price: Not initialized or error - ${(e as Error).message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
