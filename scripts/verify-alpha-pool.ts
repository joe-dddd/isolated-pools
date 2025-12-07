import { ethers } from "hardhat";

const COMPTROLLER_ALPHA = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const ORACLE = "0x83995f5c5fEd8A10551e380d9f987b5572f8A1e5";

async function main() {
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER_ALPHA);
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  console.log("\n=== Alpha Pool Markets ===");
  const markets = await comptroller.getAllMarkets();
  console.log(`Total markets: ${markets.length}`);

  for (const marketAddr of markets) {
    const vToken = await ethers.getContractAt("VToken", marketAddr);
    const name = await vToken.name();
    const symbol = await vToken.symbol();
    const underlying = await vToken.underlying();
    const market = await comptroller.markets(marketAddr);

    const price = await oracle.getPrice(underlying);

    console.log(`\n${symbol} (${name})`);
    console.log(`  Address: ${marketAddr}`);
    console.log(`  Underlying: ${underlying}`);
    console.log(`  Price: ${ethers.utils.formatUnits(price, 18)} USD`);
    console.log(`  Collateral Factor: ${ethers.utils.formatUnits(market.collateralFactorMantissa, 18)}`);
    console.log(`  Liquidation Threshold: ${ethers.utils.formatUnits(market.liquidationThresholdMantissa, 18)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
