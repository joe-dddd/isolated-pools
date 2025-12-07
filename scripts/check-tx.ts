import { ethers } from "hardhat";

async function main() {
  const txHash = "0xa99b0edbdcab1d41155061bc3787618c94847372657270506493812c808e9d83";
  
  const tx = await ethers.provider.getTransaction(txHash);
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  console.log("=== Transaction ===");
  console.log("to:", tx.to);
  console.log("from:", tx.from);
  console.log("data:", tx.data);
  console.log("status:", receipt.status);
  
  console.log("\n=== Logs ===");
  for (const log of receipt.logs) {
    console.log("address:", log.address);
    console.log("topics:", log.topics);
    console.log("data:", log.data);
    console.log("---");
  }
  
  // Decode PoolRegistryUpdated event
  const iface = new ethers.utils.Interface([
    "event PoolRegistryUpdated(address indexed oldPoolRegistry, address indexed newPoolRegistry)"
  ]);
  
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      console.log("\n=== Decoded Event ===");
      console.log("name:", parsed.name);
      console.log("oldPoolRegistry:", parsed.args.oldPoolRegistry);
      console.log("newPoolRegistry:", parsed.args.newPoolRegistry);
    } catch (e) {
      // not this event
    }
  }
}

main().catch(console.error);
