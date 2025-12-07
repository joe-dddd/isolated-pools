import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const comptrollerOracle = "0x83995f5c5fEd8A10551e380d9f987b5572f8A1e5";
  const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
  const usdt = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const lpPair = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860"; // WBNB/USDT

  console.log("Adding WBNB/USDT pair to Comptroller oracle...");
  console.log("Oracle:", comptrollerOracle);
  console.log("WBNB:", wbnb);
  console.log("USDT:", usdt);
  console.log("LP Pair:", lpPair);

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", comptrollerOracle);

  // Add WBNB/USDT pair
  const tx = await oracle.addPair(wbnb, usdt, lpPair);
  await tx.wait();
  console.log("Added WBNB/USDT pair");

  // Verify
  const price = await oracle.getPrice(wbnb);
  console.log("WBNB price:", ethers.utils.formatUnits(price, 18), "USDT");
}

main().catch(console.error);
