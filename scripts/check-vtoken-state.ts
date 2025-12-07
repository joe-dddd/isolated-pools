import { ethers } from "hardhat";

async function main() {
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

  const vUSDT = await ethers.getContractAt("VToken", vMockUSDTAddr);
  const vTKN = await ethers.getContractAt("VToken", vMockTKNAddr);

  console.log("=== vMockUSDT State ===");
  const usdtTotalSupply = await vUSDT.totalSupply();
  console.log("totalSupply:", ethers.utils.formatUnits(usdtTotalSupply, 8), "vUSDT");

  const usdtCash = await vUSDT.getCash();
  console.log("getCash:", ethers.utils.formatUnits(usdtCash, 6), "USDT (raw:", usdtCash.toString(), ")");

  const usdtBorrows = await vUSDT.totalBorrows();
  console.log("totalBorrows:", ethers.utils.formatUnits(usdtBorrows, 6), "USDT");

  const usdtReserves = await vUSDT.totalReserves();
  console.log("totalReserves:", ethers.utils.formatUnits(usdtReserves, 6), "USDT");

  const usdtExchangeRate = await vUSDT.callStatic.exchangeRateCurrent();
  console.log("exchangeRateCurrent:", usdtExchangeRate.toString());
  console.log("  formatted (18 decimals):", ethers.utils.formatUnits(usdtExchangeRate, 18));

  const usdtDecimals = await vUSDT.decimals();
  const usdtUnderlyingDecimals = 6;
  console.log("vToken decimals:", usdtDecimals);
  console.log("underlying decimals:", usdtUnderlyingDecimals);

  // Calculate expected exchange rate
  // exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
  // exchangeRate has (18 - 8 + underlyingDecimals) decimals = 10 + 6 = 16 decimals
  const usdtExpectedNumerator = usdtCash.add(usdtBorrows).sub(usdtReserves);
  console.log("Expected numerator:", usdtExpectedNumerator.toString());
  console.log();

  console.log("=== vMockTKN State ===");
  const tknTotalSupply = await vTKN.totalSupply();
  console.log("totalSupply:", ethers.utils.formatUnits(tknTotalSupply, 8), "vTKN");

  const tknCash = await vTKN.getCash();
  console.log("getCash:", ethers.utils.formatUnits(tknCash, 18), "TKN (raw:", tknCash.toString(), ")");

  const tknBorrows = await vTKN.totalBorrows();
  console.log("totalBorrows:", ethers.utils.formatUnits(tknBorrows, 18), "TKN");

  const tknReserves = await vTKN.totalReserves();
  console.log("totalReserves:", ethers.utils.formatUnits(tknReserves, 18), "TKN");

  const tknExchangeRate = await vTKN.callStatic.exchangeRateCurrent();
  console.log("exchangeRateCurrent:", tknExchangeRate.toString());
  console.log("  formatted (18 decimals):", ethers.utils.formatUnits(tknExchangeRate, 18));

  const tknDecimals = await vTKN.decimals();
  const tknUnderlyingDecimals = 18;
  console.log("vToken decimals:", tknDecimals);
  console.log("underlying decimals:", tknUnderlyingDecimals);

  const tknExpectedNumerator = tknCash.add(tknBorrows).sub(tknReserves);
  console.log("Expected numerator:", tknExpectedNumerator.toString());
  console.log();

  // Test price oracle call from Comptroller perspective
  console.log("=== Oracle Test ===");
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr);
  const oracleAddr = await comptroller.oracle();
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr);

  const usdtPrice = await oracle.getUnderlyingPrice(vMockUSDTAddr);
  console.log("vMockUSDT price from oracle:", ethers.utils.formatUnits(usdtPrice, 18));

  const tknPrice = await oracle.getUnderlyingPrice(vMockTKNAddr);
  console.log("vMockTKN price from oracle:", ethers.utils.formatUnits(tknPrice, 18));

  // Try to see if there's an issue with the price call
  try {
    const tknUnderlyingAddr = await vTKN.underlying();
    const tknDirectPrice = await oracle.getPrice(tknUnderlyingAddr);
    console.log("MockTKN direct price:", ethers.utils.formatUnits(tknDirectPrice, 18));
  } catch (err) {
    console.log("Error getting direct price:", (err as Error).message);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
