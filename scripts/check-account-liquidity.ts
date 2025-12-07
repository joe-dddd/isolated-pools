import { ethers } from "hardhat";

async function main() {
  const userAddress = process.env.USER_ADDRESS || "0xEB05A243275897b50cC93A9Cf7d6B393A0e91eF6";

  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const mockUSDTAddr = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";

  console.log("User:", userAddress);
  console.log();

  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr);
  const vUSDT = await ethers.getContractAt("VToken", vMockUSDTAddr);
  const vTKN = await ethers.getContractAt("VToken", vMockTKNAddr);
  const mockUSDT = await ethers.getContractAt("MockToken", mockUSDTAddr);

  // Get oracle
  const oracleAddr = await comptroller.oracle();
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr);

  console.log("=== Oracle Prices ===");
  const usdtPrice = await oracle.getUnderlyingPrice(vMockUSDTAddr);
  console.log("vMockUSDT price:", ethers.utils.formatUnits(usdtPrice, 18), "USD (18 decimals)");

  const tknPrice = await oracle.getUnderlyingPrice(vMockTKNAddr);
  console.log("vMockTKN price:", ethers.utils.formatUnits(tknPrice, 18), "USD (18 decimals)");
  console.log();

  // Get market info
  console.log("=== Market Info ===");
  const usdtMarket = await comptroller.markets(vMockUSDTAddr);
  console.log("vMockUSDT collateralFactorMantissa:", usdtMarket.collateralFactorMantissa.toString(), "(" + ethers.utils.formatUnits(usdtMarket.collateralFactorMantissa, 18) + ")");
  console.log("vMockUSDT isListed:", usdtMarket.isListed);

  const tknMarket = await comptroller.markets(vMockTKNAddr);
  console.log("vMockTKN collateralFactorMantissa:", tknMarket.collateralFactorMantissa.toString(), "(" + ethers.utils.formatUnits(tknMarket.collateralFactorMantissa, 18) + ")");
  console.log("vMockTKN isListed:", tknMarket.isListed);
  console.log();

  // Get user balances
  console.log("=== User Balances ===");
  const usdtBalance = await mockUSDT.balanceOf(userAddress);
  console.log("MockUSDT balance:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");

  const vUSDTBalance = await vUSDT.balanceOf(userAddress);
  console.log("vMockUSDT balance:", ethers.utils.formatUnits(vUSDTBalance, 8), "vUSDT");

  const vTKNBalance = await vTKN.balanceOf(userAddress);
  console.log("vMockTKN balance:", ethers.utils.formatUnits(vTKNBalance, 8), "vTKN");
  console.log();

  // Get exchange rates
  console.log("=== Exchange Rates ===");
  const usdtExchangeRate = await vUSDT.callStatic.exchangeRateCurrent();
  console.log("vMockUSDT exchangeRate:", usdtExchangeRate.toString());
  console.log("  formatted:", ethers.utils.formatUnits(usdtExchangeRate, 18));

  const tknExchangeRate = await vTKN.callStatic.exchangeRateCurrent();
  console.log("vMockTKN exchangeRate:", tknExchangeRate.toString());
  console.log("  formatted:", ethers.utils.formatUnits(tknExchangeRate, 18));
  console.log();

  // Calculate underlying amounts
  console.log("=== Underlying Amounts ===");
  const underlyingUSDT = vUSDTBalance.mul(usdtExchangeRate).div(ethers.constants.WeiPerEther);
  console.log("Underlying USDT:", ethers.utils.formatUnits(underlyingUSDT, 6), "USDT (raw:", underlyingUSDT.toString(), ")");

  const underlyingTKN = vTKNBalance.mul(tknExchangeRate).div(ethers.constants.WeiPerEther);
  console.log("Underlying TKN:", ethers.utils.formatUnits(underlyingTKN, 18), "TKN (raw:", underlyingTKN.toString(), ")");
  console.log();

  // Calculate collateral value manually
  console.log("=== Manual Collateral Calculation ===");
  const usdtDecimals = await mockUSDT.decimals();
  console.log("USDT decimals:", usdtDecimals);

  // Value = underlying * price / 10^decimals
  // For USDT: underlying (6 decimals) * price (18 decimals) = need to divide by 10^6 to normalize
  const usdtValue = underlyingUSDT.mul(usdtPrice).div(ethers.BigNumber.from(10).pow(usdtDecimals));
  console.log("USDT value (USD, 18 decimals):", ethers.utils.formatUnits(usdtValue, 18), "USD");

  const tknValue = underlyingTKN.mul(tknPrice).div(ethers.constants.WeiPerEther);
  console.log("TKN value (USD, 18 decimals):", ethers.utils.formatUnits(tknValue, 18), "USD");

  const totalValue = usdtValue.add(tknValue);
  console.log("Total collateral value:", ethers.utils.formatUnits(totalValue, 18), "USD");

  const expectedLiquidity = totalValue.mul(usdtMarket.collateralFactorMantissa).div(ethers.constants.WeiPerEther);
  console.log("Expected liquidity (70% CF):", ethers.utils.formatUnits(expectedLiquidity, 18), "USD");
  console.log();

  // Get actual account liquidity
  console.log("=== Actual Account Liquidity ===");
  const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(userAddress);
  console.log("Error:", error);
  console.log("Liquidity:", ethers.utils.formatUnits(liquidity, 18), "USD");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall, 18), "USD");
  console.log();

  // Check if user entered market
  console.log("=== Market Membership ===");
  const assetsIn = await comptroller.getAssetsIn(userAddress);
  console.log("Markets entered:", assetsIn);
  console.log("Entered vMockUSDT:", assetsIn.includes(vMockUSDTAddr));
  console.log("Entered vMockTKN:", assetsIn.includes(vMockTKNAddr));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
