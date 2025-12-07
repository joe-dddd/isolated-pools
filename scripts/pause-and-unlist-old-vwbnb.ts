import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const acmAddress = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
  const comptrollerAlpha = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const oldVWBNB = "0x7f856c846bCFbBf2E59569Fc3bE6d1827F4dE473";

  const acm = await ethers.getContractAt("AccessControlManager", acmAddress);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha);

  console.log("Step 1: Grant setActionsPaused permission...");
  const setActionsPausedSig = "setActionsPaused(address[],uint256[],bool)";
  const grantTx1 = await acm.giveCallPermission(comptrollerAlpha, setActionsPausedSig, deployer.address);
  await grantTx1.wait();
  console.log("✓ Permission granted");

  console.log("\nStep 2: Pause all actions on old vWBNB...");
  // Action enum: MINT=0, REDEEM=1, BORROW=2, REPAY=3, SEIZE=4, LIQUIDATE=5, TRANSFER=6, ENTER_MARKET=7, EXIT_MARKET=8
  const allActions = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // All actions
  const pauseTx = await comptroller.setActionsPaused([oldVWBNB], allActions, true);
  await pauseTx.wait();
  console.log("✓ All actions paused");

  console.log("\nStep 2.5: Set caps and collateral factor to 0...");

  // Grant permissions
  const setMarketBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
  const setMarketSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
  const setCollateralFactorSig = "setCollateralFactor(address,uint256,uint256)";

  await acm.giveCallPermission(comptrollerAlpha, setMarketBorrowCapsSig, deployer.address);
  await acm.giveCallPermission(comptrollerAlpha, setMarketSupplyCapsSig, deployer.address);
  await acm.giveCallPermission(comptrollerAlpha, setCollateralFactorSig, deployer.address);

  // Set borrow cap to 0
  const borrowCapTx = await comptroller.setMarketBorrowCaps([oldVWBNB], [0]);
  await borrowCapTx.wait();
  console.log("✓ Borrow cap set to 0");

  // Set supply cap to 0
  const supplyCapTx = await comptroller.setMarketSupplyCaps([oldVWBNB], [0]);
  await supplyCapTx.wait();
  console.log("✓ Supply cap set to 0");

  // Set collateral factor to 0
  const collateralTx = await comptroller.setCollateralFactor(oldVWBNB, 0, 0);
  await collateralTx.wait();
  console.log("✓ Collateral factor set to 0");

  console.log("\nStep 3: Grant unlistMarket permission...");
  const unlistMarketSig = "unlistMarket(address)";
  const grantTx2 = await acm.giveCallPermission(comptrollerAlpha, unlistMarketSig, deployer.address);
  await grantTx2.wait();
  console.log("✓ Permission granted");

  console.log("\nStep 4: Unlist old vWBNB...");
  const unlistTx = await comptroller.unlistMarket(oldVWBNB);
  await unlistTx.wait();
  console.log("✓ Old vWBNB unlisted");

  console.log("\nStep 5: Verify markets...");
  const markets = await comptroller.getAllMarkets();
  console.log("Markets in Alpha pool:");
  for (const market of markets) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    console.log(`  - ${symbol}: ${market}`);
  }

  console.log("\n✅ Successfully removed old vWBNB from Alpha pool!");
}

main().catch(console.error);
