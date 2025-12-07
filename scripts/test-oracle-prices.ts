import { ethers } from "hardhat";

async function main() {
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const mockUSDTAddr = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr);
  const oracle = await comptroller.oracle();

  console.log("Comptroller:", comptrollerAddr);
  console.log("Oracle:", oracle);
  console.log();

  // Get oracle contract
  const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle);

  // Test direct asset prices
  console.log("=== Direct Asset Prices ===");
  const usdtPrice = await oracleContract.getPrice(mockUSDTAddr);
  console.log("MockUSDT price:", ethers.utils.formatUnits(usdtPrice, 18), "USDT");

  const tknPrice = await oracleContract.getPrice(mockTKNAddr);
  console.log("MockTKN price:", ethers.utils.formatUnits(tknPrice, 18), "USDT");

  console.log();

  // Test vToken prices (via Comptroller oracle interface)
  console.log("=== VToken Prices (via Comptroller) ===");
  const vUSDTPrice = await oracleContract.getUnderlyingPrice(vMockUSDTAddr);
  console.log("vMockUSDT underlying price:", ethers.utils.formatUnits(vUSDTPrice, 18), "USDT");

  const vTKNPrice = await oracleContract.getUnderlyingPrice(vMockTKNAddr);
  console.log("vMockTKN underlying price:", ethers.utils.formatUnits(vTKNPrice, 18), "USDT");

  console.log();

  // Check LP info
  console.log("=== LP Info ===");
  const pair = await oracleContract.assetToPair(mockTKNAddr);
  console.log("MockTKN LP pair:", pair);

  const isToken0 = await oracleContract.isToken0(mockTKNAddr);
  console.log("MockTKN is token0:", isToken0);

  const obs = await oracleContract.observations(pair);
  console.log("Observation initialized:", obs.initialized);
  console.log("Price0Average:", ethers.utils.formatUnits(obs.price0Average, 18));
  console.log("Price1Average:", ethers.utils.formatUnits(obs.price1Average, 18));

  // Check decimals
  console.log();
  console.log("=== Decimals ===");
  const quoteAsset = await oracleContract.quoteAsset();
  const quoteDecimals = await oracleContract.quoteDecimals();
  console.log("Quote asset:", quoteAsset);
  console.log("Quote decimals:", quoteDecimals);

  const assetDecimals = await oracleContract.assetDecimals(mockTKNAddr);
  console.log("MockTKN decimals (cached):", assetDecimals);

  // Direct price check
  const directPrice = await oracleContract.directPrices(mockTKNAddr);
  if (!directPrice.eq(0)) {
    console.log();
    console.log("WARNING: Direct price is set:", ethers.utils.formatUnits(directPrice, 18));
    console.log("Direct price takes precedence over TWAP!");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
