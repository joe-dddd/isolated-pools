import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const psrAddr = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";

  // Check PSR contract
  const psrAbi = [
    "function poolRegistry() view returns (address)",
    "function corePoolComptroller() view returns (address)",
    "function getPoolAssetReserve(address comptroller, address asset) view returns (uint256)",
    "function getUnreleasedFunds(address comptroller, address asset, uint8 schema, uint8 destination) view returns (uint256)"
  ];

  const psr = new ethers.Contract(psrAddr, psrAbi, signer);

  console.log("=== PSR Config ===");
  
  try {
    const poolRegistry = await psr.poolRegistry();
    console.log("poolRegistry:", poolRegistry);
  } catch (e: any) {
    console.log("poolRegistry failed:", e.message);
  }

  try {
    const corePool = await psr.corePoolComptroller();
    console.log("corePoolComptroller:", corePool);
  } catch (e: any) {
    console.log("corePoolComptroller failed:", e.message);
  }

  // Check if comptroller is registered
  const poolRegistryAddr = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const poolRegistryAbi = [
    "function getPoolByComptroller(address comptroller) view returns (tuple(string name, address creator, address comptroller, uint256 blockPosted, uint256 timestampPosted) pool)"
  ];
  const poolRegistry = new ethers.Contract(poolRegistryAddr, poolRegistryAbi, signer);
  
  console.log("\n=== Pool Registry Check ===");
  try {
    const pool = await poolRegistry.getPoolByComptroller(comptrollerAddr);
    console.log("Pool name:", pool.name);
    console.log("Pool comptroller:", pool.comptroller);
  } catch (e: any) {
    console.log("getPoolByComptroller failed:", e.message);
  }
}

main().catch(console.error);
