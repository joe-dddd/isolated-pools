import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const comptrollerAlpha = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const oldVWBNB = "0x7f856c846bCFbBf2E59569Fc3bE6d1827F4dE473";
  const newVWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";

  console.log("Removing old vWBNB from Alpha pool...");
  console.log("Comptroller:", comptrollerAlpha);
  console.log("Old vWBNB:", oldVWBNB);
  console.log("New vWBNB:", newVWBNB);

  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha);

  // Check current markets
  const marketsBefore = await comptroller.getAllMarkets();
  console.log("\nMarkets before removal:");
  for (const market of marketsBefore) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    console.log(`  - ${symbol}: ${market}`);
  }

  // Unlist the old vWBNB
  console.log("\nUnlisting old vWBNB...");
  const tx = await comptroller.unlistMarket(oldVWBNB);
  await tx.wait();
  console.log("Old vWBNB unlisted!");

  // Check markets after
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
