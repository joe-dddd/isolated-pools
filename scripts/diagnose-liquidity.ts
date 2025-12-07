import { ethers } from "hardhat";

async function main() {
  const userAddress = process.env.USER_ADDRESS || "0xEB05A243275897b50cC93A9Cf7d6B393A0e91eF6";

  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

  console.log("User:", userAddress);
  console.log();

  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr);
  const vUSDT = await ethers.getContractAt("VToken", vMockUSDTAddr);
  const vTKN = await ethers.getContractAt("VToken", vMockTKNAddr);

  // Get oracle
  const oracleAddr = await comptroller.oracle();
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr);

  // Get user's market membership
  const assetsIn = await comptroller.getAssetsIn(userAddress);
  console.log("=== Market Membership ===");
  console.log("Markets entered:", assetsIn);
  console.log();

  if (assetsIn.length === 0) {
    console.log("ERROR: User has not entered any markets!");
    console.log("Call comptroller.enterMarkets([vUSDT, vTKN]) first");
    return;
  }

  // Process each market
  for (const vTokenAddr of assetsIn) {
    const isUSDT = vTokenAddr.toLowerCase() === vMockUSDTAddr.toLowerCase();
    const name = isUSDT ? "vMockUSDT" : "vMockTKN";
    const vToken = await ethers.getContractAt("VToken", vTokenAddr);

    console.log(`=== ${name} Calculation ===`);

    // Get balances
    const vTokenBalance = await vToken.balanceOf(userAddress);
    console.log("1. vToken balance:", ethers.utils.formatUnits(vTokenBalance, 8), `(raw: ${vTokenBalance.toString()})`);

    const exchangeRate = await vToken.callStatic.exchangeRateCurrent();
    console.log("2. exchangeRate:", exchangeRate.toString());

    const underlyingAmount = vTokenBalance.mul(exchangeRate).div(ethers.constants.WeiPerEther);
    const underlyingDecimals = isUSDT ? 6 : 18;
    console.log("3. underlying amount:", ethers.utils.formatUnits(underlyingAmount, underlyingDecimals), `(raw: ${underlyingAmount.toString()})`);

    // Get oracle price
    const oraclePrice = await oracle.getUnderlyingPrice(vTokenAddr);
    console.log("4. oracle price (18 decimals):", ethers.utils.formatUnits(oraclePrice, 18), `(raw: ${oraclePrice.toString()})`);

    // Get collateral factor
    const market = await comptroller.markets(vTokenAddr);
    console.log("5. collateralFactor:", ethers.utils.formatUnits(market.collateralFactorMantissa, 18));

    // Manual calculation
    console.log("\n--- Manual Calculation ---");

    // vTokenPrice = exchangeRate * oraclePrice / 1e18
    const vTokenPrice = exchangeRate.mul(oraclePrice).div(ethers.constants.WeiPerEther);
    console.log("6. vTokenPrice = exchangeRate * oraclePrice / 1e18");
    console.log("   =", exchangeRate.toString(), "*", oraclePrice.toString(), "/ 1e18");
    console.log("   =", vTokenPrice.toString());

    // weightedVTokenPrice = collateralFactor * vTokenPrice / 1e18
    const weightedVTokenPrice = market.collateralFactorMantissa.mul(vTokenPrice).div(ethers.constants.WeiPerEther);
    console.log("7. weightedVTokenPrice = collateralFactor * vTokenPrice / 1e18");
    console.log("   =", market.collateralFactorMantissa.toString(), "*", vTokenPrice.toString(), "/ 1e18");
    console.log("   =", weightedVTokenPrice.toString());

    // product = weightedVTokenPrice * vTokenBalance
    const product = weightedVTokenPrice.mul(vTokenBalance);
    console.log("8. product = weightedVTokenPrice * vTokenBalance");
    console.log("   =", weightedVTokenPrice.toString(), "*", vTokenBalance.toString());
    console.log("   =", product.toString());

    // collateral = product / 1e18
    const collateral = product.div(ethers.constants.WeiPerEther);
    console.log("9. collateral = product / 1e18");
    console.log("   =", product.toString(), "/ 1e18");
    console.log("   =", collateral.toString());
    console.log("   = ~", ethers.utils.formatUnits(collateral, 0), "(as integer)");

    console.log();
  }

  // Get actual liquidity
  console.log("=== Comptroller getAccountLiquidity ===");
  const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(userAddress);
  console.log("Liquidity:", ethers.utils.formatUnits(liquidity, 18), "USD (raw:", liquidity.toString(), ")");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall, 18), "USD");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
