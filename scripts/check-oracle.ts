import { ethers } from "hardhat";

async function main() {
  const comptroller = await ethers.getContractAt("Comptroller", "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7");
  const vWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";
  const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";

  // Check comptroller oracle
  const oracleAddr = await comptroller.oracle();
  console.log("Comptroller oracle:", oracleAddr);

  // Check price from comptroller
  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr);

  try {
    const price = await oracle.getPrice(wbnb);
    console.log("WBNB price from oracle:", ethers.utils.formatUnits(price, 18));
  } catch (e: any) {
    console.log("Error getting WBNB price:", e.message);
  }

  // Check underlying price via oracle
  try {
    const underlyingPrice = await oracle.getUnderlyingPrice(vWBNB);
    console.log("vWBNB underlying price:", ethers.utils.formatUnits(underlyingPrice, 18));
  } catch (e: any) {
    console.log("Error getting vWBNB underlying price:", e.message);
  }
}

main().catch(console.error);
