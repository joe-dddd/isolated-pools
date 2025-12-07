import { ethers } from "hardhat";

async function main() {
  const vWBNB = await ethers.getContractAt("VToken", "0x7f856c846bCFbBf2E59569Fc3bE6d1827F4dE473");
  const underlying = await vWBNB.underlying();
  console.log("vWBNB underlying:", underlying);

  const name = await vWBNB.name();
  const symbol = await vWBNB.symbol();
  console.log("vWBNB name:", name);
  console.log("vWBNB symbol:", symbol);
}

main().catch(console.error);
