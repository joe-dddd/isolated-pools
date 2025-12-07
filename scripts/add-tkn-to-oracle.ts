import { ethers } from "hardhat";

const ORACLE = "0xa29fb7cc0a1960b6fd6936F68921d96f9B86e40E";
const TKN = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
const TKN_USDT_LP = "0x022b929a39Dd4593F828837b5a7fB3796472Ee85";

async function main() {
  console.log("\n=== Adding TKN/USDT LP to Oracle ===");
  console.log(`Oracle: ${ORACLE}`);
  console.log(`TKN: ${TKN}`);
  console.log(`TKN/USDT LP: ${TKN_USDT_LP}`);

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // Check if already added
  const existingPair = await oracle.assetToPair(TKN);
  if (existingPair !== ethers.constants.AddressZero) {
    console.log(`\n❌ TKN LP already added: ${existingPair}`);
    return;
  }

  // Add pair
  console.log("\nAdding TKN/USDT LP to oracle...");
  const tx = await oracle.addPair(TKN, TKN_USDT_LP);
  await tx.wait();
  console.log("✅ TKN/USDT LP added successfully");

  // Verify
  const newPair = await oracle.assetToPair(TKN);
  console.log(`\nVerification:`);
  console.log(`TKN pair in oracle: ${newPair}`);
  console.log(`Match: ${newPair === TKN_USDT_LP ? "✅" : "❌"}`);

  const quoteToken = await oracle.assetQuoteToken(TKN);
  const usdt = await oracle.usdt();
  console.log(`Quote token: ${quoteToken}`);
  console.log(`Is USDT: ${quoteToken === usdt ? "✅" : "❌"}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
