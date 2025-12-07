import { ethers } from "hardhat";

async function main() {
  const comptroller = await ethers.getContractAt("Comptroller", "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7");

  const allMarkets = await comptroller.getAllMarkets();
  console.log("Comptroller Status Check:");
  console.log("=========================\n");

  // Action enum: MINT=0, REDEEM=1, BORROW=2, REPAY=3, SEIZE=4, LIQUIDATE=5, TRANSFER=6, ENTER_MARKET=7, EXIT_MARKET=8
  const actionNames = ["MINT", "REDEEM", "BORROW", "REPAY", "SEIZE", "LIQUIDATE", "TRANSFER", "ENTER_MARKET", "EXIT_MARKET"];

  for (const market of allMarkets) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    const marketInfo = await comptroller.markets(market);
    const isListed = marketInfo.isListed;

    console.log(`${symbol} (${market})`);
    console.log(`  Status: ${isListed ? "✓ ACTIVE" : "✗ UNLISTED"}`);
    console.log(`  Collateral Factor: ${ethers.utils.formatUnits(marketInfo.collateralFactorMantissa, 18)}`);
    console.log(`  Liquidation Threshold: ${ethers.utils.formatUnits(marketInfo.liquidationThresholdMantissa, 18)}`);

    // Check borrow and supply caps
    const borrowCap = await comptroller.borrowCaps(market);
    const supplyCap = await comptroller.supplyCaps(market);
    console.log(`  Borrow Cap: ${ethers.utils.formatUnits(borrowCap, 18)}`);
    console.log(`  Supply Cap: ${ethers.utils.formatUnits(supplyCap, 18)}`);

    // Check action paused status
    console.log("  Actions:");
    for (let i = 0; i < actionNames.length; i++) {
      const isPaused = await comptroller.actionPaused(market, i);
      const status = isPaused ? "❌ PAUSED" : "✅ OPEN";
      console.log(`    ${actionNames[i]}: ${status}`);
    }
    console.log("");
  }

  // Check oracle
  const oracle = await comptroller.oracle();
  console.log(`Oracle: ${oracle}`);
}

main().catch(console.error);
