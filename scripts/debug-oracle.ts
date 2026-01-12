import { ethers } from "hardhat";

const ORACLE = "0xAf0FcfB7B6a0EF5f5947FD96384c9cBCe3170ffe";
const TKN = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
const vWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";
const vUSDT = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
const WBNB_USDT_LP = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";

async function main() {
  console.log("\n=== Debug Oracle State ===");

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // Check immutable values
  console.log("\n=== Oracle Config ===");
  const usdt = await oracle.usdt();
  const wbnb = await oracle.wbnb();
  const wbnbUsdtLp = await oracle.wbnbUsdtLp();
  console.log(`USDT: ${usdt}`);
  console.log(`WBNB: ${wbnb}`);
  console.log(`WBNB-USDT LP: ${wbnbUsdtLp}`);

  // Check WBNB pair config
  console.log("\n=== WBNB Pair Config ===");
  const wbnbPair = await oracle.assetToPair(WBNB);
  const wbnbIsToken0 = await oracle.isToken0(WBNB);
  const wbnbDecimals = await oracle.assetDecimals(WBNB);
  const wbnbQuote = await oracle.assetQuoteToken(WBNB);
  console.log(`WBNB pair: ${wbnbPair}`);
  console.log(`WBNB isToken0: ${wbnbIsToken0}`);
  console.log(`WBNB decimals: ${wbnbDecimals}`);
  console.log(`WBNB quote token: ${wbnbQuote}`);

  // Check observations for WBNB-USDT LP
  console.log("\n=== WBNB-USDT LP Observations ===");
  const obs = await oracle.observations(WBNB_USDT_LP);
  console.log(`price0CumulativeLast: ${obs.price0CumulativeLast.toString()}`);
  console.log(`price1CumulativeLast: ${obs.price1CumulativeLast.toString()}`);
  console.log(`blockTimestampLast: ${obs.blockTimestampLast}`);
  console.log(`price0Average: ${obs.price0Average.toString()}`);
  console.log(`price1Average: ${obs.price1Average.toString()}`);
  console.log(`initialized: ${obs.initialized}`);

  // Check canUpdate
  console.log("\n=== Can Update ===");
  const canUpdateWbnb = await oracle.canUpdate(WBNB);
  console.log(`WBNB canUpdate: ${canUpdateWbnb}`);

  // Try to get prices
  console.log("\n=== Prices ===");
  try {
    const wbnbPrice = await oracle.getPrice(WBNB);
    console.log(`WBNB price: ${ethers.utils.formatUnits(wbnbPrice, 18)} USD`);
  } catch (e) {
    console.log(`WBNB price ERROR: ${(e as Error).message}`);
  }

  try {
    const usdtPrice = await oracle.getPrice(USDT);
    console.log(`USDT price: ${ethers.utils.formatUnits(usdtPrice, 18)} USD`);
  } catch (e) {
    console.log(`USDT price ERROR: ${(e as Error).message}`);
  }

  // Try to get underlying prices
  console.log("\n=== Underlying Prices (vToken interface) ===");
  try {
    const vWbnbPrice = await oracle.getUnderlyingPrice(vWBNB);
    console.log(`vWBNB underlying price: ${ethers.utils.formatUnits(vWbnbPrice, 18)} USD`);
  } catch (e) {
    console.log(`vWBNB underlying price ERROR: ${(e as Error).message}`);
  }

  try {
    const vUsdtPrice = await oracle.getUnderlyingPrice(vUSDT);
    console.log(`vUSDT underlying price: ${ethers.utils.formatUnits(vUsdtPrice, 18)} USD`);
  } catch (e) {
    console.log(`vUSDT underlying price ERROR: ${(e as Error).message}`);
  }

  // If price averages are 0, we need to update twice with 1 minute gap
  if (obs.price0Average.toString() === "0" || obs.price1Average.toString() === "0") {
    console.log("\n⚠️  Price averages are 0! Need to update twice with 1 min gap.");
    console.log("Running first update...");
    const tx1 = await oracle.updateAssetPrice(WBNB);
    await tx1.wait();
    console.log("First update done. Wait 65 seconds...");

    await new Promise(resolve => setTimeout(resolve, 65000));

    console.log("Running second update...");
    const tx2 = await oracle.updateAssetPrice(WBNB);
    await tx2.wait();
    console.log("Second update done.");

    // Check again
    const obs2 = await oracle.observations(WBNB_USDT_LP);
    console.log(`price0Average after update: ${obs2.price0Average.toString()}`);
    console.log(`price1Average after update: ${obs2.price1Average.toString()}`);

    const wbnbPrice2 = await oracle.getPrice(WBNB);
    console.log(`WBNB price after update: ${ethers.utils.formatUnits(wbnbPrice2, 18)} USD`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
