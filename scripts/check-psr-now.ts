import { ethers } from "hardhat";

async function main() {
  const psrAddr = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
  
  const psrAbi = [
    "function poolRegistry() view returns (address)"
  ];
  const psr = new ethers.Contract(psrAddr, psrAbi, ethers.provider);

  const poolRegistry = await psr.poolRegistry();
  console.log("PSR poolRegistry:", poolRegistry);
  console.log("Expected:", "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88");
  console.log("Match:", poolRegistry.toLowerCase() === "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88".toLowerCase());
}

main().catch(console.error);
