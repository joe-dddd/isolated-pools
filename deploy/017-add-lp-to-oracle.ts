import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Skip on mainnet
  if (hre.network.name !== "bsctestnet") {
    console.log("Skipping LP oracle config on", hre.network.name);
    return;
  }

  console.log("Adding LP to Oracle...");

  // Get deployments
  const oracle = await get("PancakeV2TWAPOracle");
  const mockTKN = await get("MockTKN");
  const mockUSDT = await get("MockUSDT");
  const lpPair = await get("PancakeLPPair_USDT_TKN");

  console.log("Oracle:", oracle.address);
  console.log("MockTKN:", mockTKN.address);
  console.log("MockUSDT (quote):", mockUSDT.address);
  console.log("LP Pair:", lpPair.address);

  // Get signer
  const signer = await ethers.getSigner(deployer);
  const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle.address, signer);

  // Check if pair already added
  const existingPair = await oracleContract.assetToPair(mockTKN.address);
  if (existingPair !== ethers.constants.AddressZero) {
    console.log("LP already added to oracle for MockTKN");
    return;
  }

  // Add pair to oracle
  console.log("Adding MockTKN/USDT pair to oracle...");
  const addPairTx = await oracleContract.addPair(mockTKN.address, lpPair.address);
  await addPairTx.wait();
  console.log("Pair added!");

  // Check initialization status
  const observation = await oracleContract.observations(lpPair.address);
  console.log("Observation initialized:", observation.initialized);
  console.log("Price0Average:", ethers.utils.formatUnits(observation.price0Average, 18));
  console.log("Price1Average:", ethers.utils.formatUnits(observation.price1Average, 18));

  // Clear direct price (optional, to force using TWAP)
  const directPrice = await oracleContract.directPrices(mockTKN.address);
  if (!directPrice.eq(0)) {
    console.log("Clearing direct price for MockTKN (will use TWAP instead)...");
    const clearTx = await oracleContract.setDirectPrice(mockTKN.address, 0);
    await clearTx.wait();
    console.log("Direct price cleared");
  }

  // Try to update TWAP price
  console.log("\nAttempting TWAP update...");
  const canUpdate = await oracleContract.canUpdate(mockTKN.address);
  console.log("Can update:", canUpdate);

  if (canUpdate) {
    try {
      console.log("Updating TWAP price...");
      const updateTx = await oracleContract.updateAssetPrice(mockTKN.address);
      await updateTx.wait();
      console.log("TWAP price updated!");

      // Check new observation
      const newObs = await oracleContract.observations(lpPair.address);
      console.log("New Price0Average:", ethers.utils.formatUnits(newObs.price0Average, 18));
      console.log("New Price1Average:", ethers.utils.formatUnits(newObs.price1Average, 18));
    } catch (err) {
      console.log("Update failed (may need to wait 5 minutes):", (err as Error).message);
    }
  } else {
    console.log("Cannot update yet - need to wait at least 5 minutes after initialization");
    console.log("You can manually call: oracleContract.updateAssetPrice(mockTKN.address) after 5 minutes");
  }

  console.log("\nLP successfully added to oracle!");
  console.log("Note: TWAP requires 5 minutes between updates (PERIOD = 5 minutes)");
};

func.tags = ["OracleLP"];
func.dependencies = ["PancakeLP"];

export default func;
