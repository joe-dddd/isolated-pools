import { ethers } from "hardhat";

const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const ORACLE = "0xAf0FcfB7B6a0EF5f5947FD96384c9cBCe3170ffe";
const vWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";
const vUSDT = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
const vTKN = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

// User who failed the borrow
const USER = "0xEB05A243275897b50cC93A9Cf7d6B393A0e91eF6"; // deployer

async function main() {
  console.log("\n=== Debug Borrow Failure ===");

  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", ORACLE);

  // Check oracle in comptroller
  console.log("\n=== Comptroller Config ===");
  const comptrollerOracle = await comptroller.oracle();
  console.log(`Oracle: ${comptrollerOracle}`);
  console.log(`Expected: ${ORACLE}`);
  console.log(`Match: ${comptrollerOracle.toLowerCase() === ORACLE.toLowerCase()}`);

  // Check market states
  console.log("\n=== Market States ===");
  for (const [name, addr] of [["vWBNB", vWBNB], ["vUSDT", vUSDT], ["vTKN", vTKN]]) {
    console.log(`\n${name} (${addr}):`);
    const market = await comptroller.markets(addr);
    console.log(`  isListed: ${market.isListed}`);
    console.log(`  collateralFactorMantissa: ${market.collateralFactorMantissa.toString()} (${Number(market.collateralFactorMantissa) / 1e18 * 100}%)`);
    console.log(`  liquidationThresholdMantissa: ${market.liquidationThresholdMantissa.toString()} (${Number(market.liquidationThresholdMantissa) / 1e18 * 100}%)`);

    const borrowCap = await comptroller.borrowCaps(addr);
    const supplyCap = await comptroller.supplyCaps(addr);
    console.log(`  borrowCap: ${borrowCap.toString()}`);
    console.log(`  supplyCap: ${supplyCap.toString()}`);

    // Check paused states
    const mintPaused = await comptroller.actionPaused(addr, 0);
    const redeemPaused = await comptroller.actionPaused(addr, 1);
    const borrowPaused = await comptroller.actionPaused(addr, 2);
    console.log(`  mintPaused: ${mintPaused}`);
    console.log(`  redeemPaused: ${redeemPaused}`);
    console.log(`  borrowPaused: ${borrowPaused}`);

    // Get vToken info
    const vToken = await ethers.getContractAt("VToken", addr);
    const totalBorrows = await vToken.totalBorrows();
    const totalSupply = await vToken.totalSupply();
    const cash = await vToken.getCash();
    console.log(`  totalBorrows: ${totalBorrows.toString()}`);
    console.log(`  totalSupply: ${totalSupply.toString()}`);
    console.log(`  cash: ${cash.toString()}`);
  }

  // Check user's position
  console.log("\n=== User Position ===");
  console.log(`User: ${USER}`);

  const assetsIn = await comptroller.getAssetsIn(USER);
  console.log(`Assets in: ${assetsIn.length > 0 ? assetsIn.join(", ") : "NONE"}`);

  // Get borrowing power
  console.log("\n=== Borrowing Power ===");
  try {
    const [error, liquidity, shortfall] = await comptroller.getBorrowingPower(USER);
    console.log(`Error: ${error}`);
    console.log(`Liquidity: ${ethers.utils.formatUnits(liquidity, 18)} USD`);
    console.log(`Shortfall: ${ethers.utils.formatUnits(shortfall, 18)} USD`);
  } catch (e) {
    console.log(`Error getting borrowing power: ${(e as Error).message}`);
  }

  // Check user balances in each market
  console.log("\n=== User Balances ===");
  for (const [name, addr] of [["vWBNB", vWBNB], ["vUSDT", vUSDT], ["vTKN", vTKN]]) {
    const vToken = await ethers.getContractAt("VToken", addr);
    const balance = await vToken.balanceOf(USER);
    const borrowBalance = await vToken.borrowBalanceStored(USER);
    const exchangeRate = await vToken.exchangeRateStored();

    const underlying = Number(balance) * Number(exchangeRate) / 1e18;
    console.log(`${name}:`);
    console.log(`  vToken balance: ${balance.toString()}`);
    console.log(`  underlying (approx): ${underlying}`);
    console.log(`  borrow balance: ${borrowBalance.toString()}`);
  }

  // Try simulating the borrow
  console.log("\n=== Simulate Borrow ===");
  const borrowAmount = ethers.utils.parseUnits("1", 6); // 1 USDT
  try {
    const [error, liquidity, shortfall] = await comptroller.getHypotheticalAccountLiquidity(
      USER,
      vUSDT,
      0,
      borrowAmount
    );
    console.log(`Hypothetical after borrowing 1 USDT:`);
    console.log(`  Error: ${error}`);
    console.log(`  Liquidity: ${ethers.utils.formatUnits(liquidity, 18)} USD`);
    console.log(`  Shortfall: ${ethers.utils.formatUnits(shortfall, 18)} USD`);
  } catch (e) {
    console.log(`Error simulating borrow: ${(e as Error).message}`);
  }

  // Simulate max borrow (what frontend calculates)
  console.log("\n=== Simulate MAX Borrow (frontend calc) ===");
  const [, currentLiquidity] = await comptroller.getAccountLiquidity(USER);
  const usdtPrice = await oracle.getUnderlyingPrice(vUSDT);
  console.log(`Current liquidity: ${ethers.utils.formatUnits(currentLiquidity, 18)} USD`);
  console.log(`USDT oracle price (raw): ${usdtPrice.toString()}`);

  // Frontend calc: maxBorrowUsd = liquidity / 1e18, priceUsd = oraclePrice / 1e30 (for 6 decimals)
  const liquidityNum = Number(currentLiquidity) / 1e18;
  const priceUsd = Number(usdtPrice) / 1e30; // 36 - 6 decimals
  const maxBorrowTokens = liquidityNum / priceUsd;
  const safeMax = maxBorrowTokens * 0.95;
  console.log(`Liquidity USD: ${liquidityNum}`);
  console.log(`USDT price USD: ${priceUsd}`);
  console.log(`Max borrow tokens: ${maxBorrowTokens}`);
  console.log(`Safe max (95%): ${safeMax}`);

  // Try simulating this amount
  const maxBorrowAmount = ethers.utils.parseUnits(safeMax.toFixed(6), 6);
  console.log(`Max borrow amount (raw): ${maxBorrowAmount.toString()}`);
  try {
    const [error2, liquidity2, shortfall2] = await comptroller.getHypotheticalAccountLiquidity(
      USER,
      vUSDT,
      0,
      maxBorrowAmount
    );
    console.log(`Hypothetical after borrowing ${safeMax.toFixed(2)} USDT:`);
    console.log(`  Error: ${error2}`);
    console.log(`  Liquidity: ${ethers.utils.formatUnits(liquidity2, 18)} USD`);
    console.log(`  Shortfall: ${ethers.utils.formatUnits(shortfall2, 18)} USD`);
  } catch (e) {
    console.log(`Error simulating max borrow: ${(e as Error).message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
