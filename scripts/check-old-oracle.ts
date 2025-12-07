import { ethers } from "hardhat";

const OLD_ORACLE = "0x551CFdd2085dcEaaA8982aaa420D8E746B1C958a";
const NEW_ORACLE = "0x83995f5c5fEd8A10551e380d9f987b5572f8A1e5";
const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

async function main() {
  console.log("\n=== Checking Oracles ===");

  // Check old oracle
  try {
    const oldOracle = await ethers.getContractAt("PancakeV2TWAPOracle", OLD_ORACLE);
    const oldQuote = await oldOracle.quoteAsset();
    console.log(`\nOLD Oracle: ${OLD_ORACLE}`);
    console.log(`  Quote asset: ${oldQuote}`);
    console.log(`  Status: EXISTS`);
  } catch (e) {
    console.log(`\nOLD Oracle: ${OLD_ORACLE}`);
    console.log(`  Status: NOT FOUND`);
  }

  // Check new oracle
  const newOracle = await ethers.getContractAt("PancakeV2TWAPOracle", NEW_ORACLE);
  const newQuote = await newOracle.quoteAsset();
  console.log(`\nNEW Oracle: ${NEW_ORACLE}`);
  console.log(`  Quote asset: ${newQuote}`);

  // Check which oracle Comptroller uses
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);
  const comptrollerOracle = await comptroller.oracle();
  console.log(`\nComptroller Oracle: ${comptrollerOracle}`);
  console.log(`  Using: ${comptrollerOracle === NEW_ORACLE ? 'NEW' : comptrollerOracle === OLD_ORACLE ? 'OLD' : 'UNKNOWN'}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
