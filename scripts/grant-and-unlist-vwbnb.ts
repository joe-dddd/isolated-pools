import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const acmAddress = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
  const comptrollerAlpha = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const oldVWBNB = "0x7f856c846bCFbBf2E59569Fc3bE6d1827F4dE473";

  const acm = await ethers.getContractAt("AccessControlManager", acmAddress);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha);

  // Grant permission to unlistMarket
  const unlistMarketSig = "unlistMarket(address)";
  console.log("Granting unlistMarket permission...");
  const grantTx = await acm.giveCallPermission(comptrollerAlpha, unlistMarketSig, deployer.address);
  await grantTx.wait();
  console.log("Permission granted!");

  // Now unlist the old vWBNB
  console.log("\nUnlisting old vWBNB:", oldVWBNB);
  const tx = await comptroller.unlistMarket(oldVWBNB);
  await tx.wait();
  console.log("Old vWBNB unlisted!");

  // Verify
  const marketsAfter = await comptroller.getAllMarkets();
  console.log("\nMarkets after removal:");
  for (const market of marketsAfter) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    console.log(`  - ${symbol}: ${market}`);
  }

  console.log("\n✅ Successfully removed old vWBNB from Alpha pool!");
}

main().catch(console.error);
