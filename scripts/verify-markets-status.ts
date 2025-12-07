import { ethers } from "hardhat";

async function main() {
  const comptroller = await ethers.getContractAt("Comptroller", "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7");
  const oldVWBNB = "0x7f856c846bCFbBf2E59569Fc3bE6d1827F4dE473";
  const newVWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";

  const allMarkets = await comptroller.getAllMarkets();
  console.log("All markets in Alpha pool:");

  for (const market of allMarkets) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    const marketInfo = await comptroller.markets(market);
    const isListed = marketInfo.isListed;
    const collateralFactor = ethers.utils.formatUnits(marketInfo.collateralFactorMantissa, 18);

    const status = isListed ? "✓ ACTIVE" : "✗ UNLISTED";
    console.log(`  ${status} - ${symbol}: ${market}`);
    console.log(`           Collateral Factor: ${collateralFactor}`);
  }
}

main().catch(console.error);
