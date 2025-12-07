import { ethers } from "hardhat";

async function main() {
  const vUSDT = await ethers.getContractAt("VToken", "0xB063b1748dBF78e79B99094c9F81f3c15989CCca");
  const irm = await vUSDT.interestRateModel();
  console.log("vUSDT IRM:", irm);
}

main().catch(console.error);
