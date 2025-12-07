import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const poolRegistry = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
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

  // Use PoolRegistry to update supported markets (unlist the old vWBNB)
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry);

  console.log("\nRemoving old vWBNB from market...");
  const tx = await poolRegistryContract.updatePoolMetadata(
    comptrollerAlpha,
    {
      category: "Alpha",
      logoURL: "",
      description: "Alpha Pool"
    }
  );
  await tx.wait();

  // Actually need to call _supportMarket(false) on Comptroller
  // But this is typically admin-only. Let's try direct approach
  const unsupportTx = await comptroller._supportMarket(oldVWBNB);
  await unsupportTx.wait();
  console.log("Attempted to unsupport old vWBNB");

  // Check markets after
  const marketsAfter = await comptroller.getAllMarkets();
  console.log("\nMarkets after removal:");
  for (const market of marketsAfter) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    console.log(`  - ${symbol}: ${market}`);
  }
}

main().catch(console.error);
