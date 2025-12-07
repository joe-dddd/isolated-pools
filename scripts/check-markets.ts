import { ethers } from "hardhat";

async function main() {
  const comptroller = await ethers.getContractAt(
    "Comptroller",
    "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7"
  );

  const allMarkets = await comptroller.getAllMarkets();
  console.log("All markets in Alpha pool:");
  for (const market of allMarkets) {
    console.log("  -", market);
  }
}

main().catch(console.error);
