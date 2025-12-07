import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const psrAddr = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
  const poolRegistryAddr = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";

  console.log("Signer:", signer.address);
  console.log("PSR:", psrAddr);
  console.log("PoolRegistry:", poolRegistryAddr);

  // Check current PSR state
  const psrAbi = [
    "function poolRegistry() view returns (address)",
    "function setPoolRegistry(address poolRegistry_) external",
    "function owner() view returns (address)"
  ];
  const psr = new ethers.Contract(psrAddr, psrAbi, signer);

  const currentPoolRegistry = await psr.poolRegistry();
  console.log("\nCurrent poolRegistry:", currentPoolRegistry);

  const owner = await psr.owner();
  console.log("PSR owner:", owner);

  if (currentPoolRegistry === ethers.constants.AddressZero) {
    console.log("\nSetting poolRegistry...");
    const tx = await psr.setPoolRegistry(poolRegistryAddr);
    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("Done!");

    const newPoolRegistry = await psr.poolRegistry();
    console.log("New poolRegistry:", newPoolRegistry);
  } else {
    console.log("\nPoolRegistry already set");
  }
}

main().catch(console.error);
