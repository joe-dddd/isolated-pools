import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const comptroller = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const newOracle = "0xa29fb7cc0a1960b6fd6936F68921d96f9B86e40E";

  console.log("Updating Comptroller oracle...");
  console.log("Comptroller:", comptroller);
  console.log("New Oracle:", newOracle);

  const comptrollerContract = await ethers.getContractAt("Comptroller", comptroller);

  // Get current oracle
  const currentOracle = await comptrollerContract.oracle();
  console.log("Current Oracle:", currentOracle);

  if (currentOracle.toLowerCase() === newOracle.toLowerCase()) {
    console.log("Oracle already set correctly!");
    return;
  }

  // Set new oracle
  const tx = await comptrollerContract.setPriceOracle(newOracle);
  await tx.wait();
  console.log("Oracle updated!");

  // Verify
  const updatedOracle = await comptrollerContract.oracle();
  console.log("Updated Oracle:", updatedOracle);
}

main().catch(console.error);
