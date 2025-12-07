import { task } from "hardhat/config";

// Helper task to manually update TWAP price
task("update-twap", "Update TWAP price for MockTKN")
  .addOptionalParam("asset", "Asset address (defaults to MockTKN)", "")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments, getNamedAccounts } = hre;
    const { get } = deployments;
    const { deployer } = await getNamedAccounts();

    const oracle = await get("PancakeV2TWAPOracle");
    const mockTKN = await get("MockTKN");
    const assetAddr = taskArgs.asset || mockTKN.address;

    console.log("Oracle:", oracle.address);
    console.log("Asset:", assetAddr);

    const signer = await ethers.getSigner(deployer);
    const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle.address, signer);

    // Check if can update
    const canUpdate = await oracleContract.canUpdate(assetAddr);
    console.log("Can update:", canUpdate);

    if (!canUpdate) {
      const pair = await oracleContract.assetToPair(assetAddr);
      const obs = await oracleContract.observations(pair);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - obs.blockTimestampLast;
      const remaining = Math.max(0, 300 - elapsed);
      console.log(`Need to wait ${remaining} more seconds (${Math.ceil(remaining / 60)} minutes)`);
      return;
    }

    // Update TWAP
    console.log("Updating TWAP price...");
    const tx = await oracleContract.updateAssetPrice(assetAddr);
    await tx.wait();
    console.log("TWAP updated!");

    // Get price
    const price = await oracleContract.getPrice(assetAddr);
    console.log("Current TWAP price:", ethers.utils.formatUnits(price, 18), "USDT");

    // Get observation details
    const pair = await oracleContract.assetToPair(assetAddr);
    const obs = await oracleContract.observations(pair);
    const isToken0 = await oracleContract.isToken0(assetAddr);

    console.log("\nObservation details:");
    console.log("  Initialized:", obs.initialized);
    console.log("  Price0Average:", ethers.utils.formatUnits(obs.price0Average, 18));
    console.log("  Price1Average:", ethers.utils.formatUnits(obs.price1Average, 18));
    console.log("  Asset is token0:", isToken0);
    console.log("  Used price:", isToken0 ? "price0Average" : "price1Average");
  });

// Helper task to check TWAP status
task("check-twap", "Check TWAP status for MockTKN")
  .addOptionalParam("asset", "Asset address (defaults to MockTKN)", "")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    const { get } = deployments;

    const oracle = await get("PancakeV2TWAPOracle");
    const mockTKN = await get("MockTKN");
    const mockUSDT = await get("MockUSDT");
    const assetAddr = taskArgs.asset || mockTKN.address;

    console.log("Oracle:", oracle.address);
    console.log("Asset:", assetAddr);
    console.log("Quote (USDT):", mockUSDT.address);

    const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle.address);

    // Check pair
    const pair = await oracleContract.assetToPair(assetAddr);
    console.log("\nPair address:", pair);

    if (pair === ethers.constants.AddressZero) {
      console.log("No pair configured for this asset");
      return;
    }

    // Check observation
    const obs = await oracleContract.observations(pair);
    console.log("\nObservation:");
    console.log("  Initialized:", obs.initialized);
    console.log("  Price0Average:", ethers.utils.formatUnits(obs.price0Average, 18));
    console.log("  Price1Average:", ethers.utils.formatUnits(obs.price1Average, 18));
    console.log("  Last update:", new Date(obs.blockTimestampLast * 1000).toISOString());

    // Check if can update
    const canUpdate = await oracleContract.canUpdate(assetAddr);
    console.log("\nCan update:", canUpdate);

    if (!canUpdate && obs.initialized) {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - obs.blockTimestampLast;
      const remaining = Math.max(0, 300 - elapsed);
      console.log(`Wait ${remaining} more seconds (${Math.ceil(remaining / 60)} minutes) before next update`);
    }

    // Get current price
    try {
      const price = await oracleContract.getPrice(assetAddr);
      console.log("\nCurrent price:", ethers.utils.formatUnits(price, 18), "USDT");
    } catch (err) {
      console.log("\nPrice not available yet:", (err as Error).message);
    }

    // Check if using direct price
    const directPrice = await oracleContract.directPrices(assetAddr);
    if (!directPrice.eq(0)) {
      console.log("\nWarning: Direct price is set:", ethers.utils.formatUnits(directPrice, 18));
      console.log("Direct price takes precedence over TWAP");
    }
  });

// Helper task to check LP reserves
task("check-lp", "Check LP pair reserves")
  .addOptionalParam("pair", "Pair address (defaults to USDT/TKN pair)", "")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    const { get } = deployments;

    const lpPair = await get("PancakeLPPair_USDT_TKN");
    const pairAddr = taskArgs.pair || lpPair.address;

    const pairAbi = [
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
      "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      "function totalSupply() external view returns (uint256)",
    ];

    const pair = await ethers.getContractAt(pairAbi, pairAddr);

    const token0 = await pair.token0();
    const token1 = await pair.token1();
    const [reserve0, reserve1, timestamp] = await pair.getReserves();
    const totalSupply = await pair.totalSupply();

    console.log("Pair:", pairAddr);
    console.log("\nTokens:");
    console.log("  Token0:", token0);
    console.log("  Token1:", token1);

    console.log("\nReserves:");
    console.log("  Reserve0:", reserve0.toString(), "(raw)");
    console.log("  Reserve1:", reserve1.toString(), "(raw)");
    console.log("  Timestamp:", new Date(timestamp * 1000).toISOString());

    console.log("\nLP Supply:");
    console.log("  Total Supply:", ethers.utils.formatUnits(totalSupply, 18));

    // Try to detect decimals
    const mockUSDT = await get("MockUSDT");
    const mockTKN = await get("MockTKN");

    if (token0.toLowerCase() === mockUSDT.address.toLowerCase()) {
      console.log("\nFormatted Reserves:");
      console.log("  Reserve0 (USDT):", ethers.utils.formatUnits(reserve0, 6));
      console.log("  Reserve1 (TKN):", ethers.utils.formatUnits(reserve1, 18));
      console.log("\nPrices:");
      console.log("  1 TKN =", ethers.utils.formatUnits(reserve0.mul(ethers.constants.WeiPerEther).div(reserve1), 6), "USDT");
      console.log("  1 USDT =", ethers.utils.formatUnits(reserve1.mul(1000000).div(reserve0), 18), "TKN");
    } else if (token1.toLowerCase() === mockUSDT.address.toLowerCase()) {
      console.log("\nFormatted Reserves:");
      console.log("  Reserve0 (TKN):", ethers.utils.formatUnits(reserve0, 18));
      console.log("  Reserve1 (USDT):", ethers.utils.formatUnits(reserve1, 6));
      console.log("\nPrices:");
      console.log("  1 TKN =", ethers.utils.formatUnits(reserve1.mul(ethers.constants.WeiPerEther).div(reserve0), 6), "USDT");
      console.log("  1 USDT =", ethers.utils.formatUnits(reserve0.mul(1000000).div(reserve1), 18), "TKN");
    }
  });
