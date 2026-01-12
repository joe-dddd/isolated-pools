import { ethers } from "hardhat";

const ORACLE = "0xAf0FcfB7B6a0EF5f5947FD96384c9cBCe3170ffe";
const TKN = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
const TKN_USDT_LP = "0x022b929a39Dd4593F828837b5a7fB3796472Ee85";

async function main() {
  console.log("\n=== Checking TKN Oracle Configuration ===");
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // Check pair configuration
  const pair = await oracle.assetToPair(TKN);
  console.log(`TKN pair: ${pair}`);
  console.log(`Expected LP: ${TKN_USDT_LP}`);
  console.log(`Match: ${pair === TKN_USDT_LP ? "✅" : "❌"}`);

  // Check observation initialization
  const obs = await oracle.observations(TKN_USDT_LP);
  console.log(`\nObservation for TKN/USDT LP:`);
  console.log(`  initialized: ${obs.initialized}`);
  console.log(`  price0Average: ${obs.price0Average}`);
  console.log(`  price1Average: ${obs.price1Average}`);

  // Try to get price
  console.log(`\nAttempting to get TKN price...`);
  try {
    const price = await oracle.getPrice(TKN);
    console.log(`✅ TKN price: $${ethers.utils.formatUnits(price, 18)}`);
  } catch (e) {
    console.log(`❌ Error: ${(e as Error).message}`);
  }

  // Check if can update
  const canUpdate = await oracle.canUpdate(TKN);
  console.log(`\nCan update: ${canUpdate ? "✅" : "❌"}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
