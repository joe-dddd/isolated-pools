import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  
  // Use low-level call to check isTimeBased
  const vTokenInterface = new ethers.utils.Interface([
    "function isTimeBased() view returns (bool)",
    "function blocksOrSecondsPerYear() view returns (uint256)",
    "function getBlockNumberOrTimestamp() view returns (uint256)",
    "function accrualBlockNumber() view returns (uint256)"
  ]);

  const vToken = new ethers.Contract(vMockTKNAddr, vTokenInterface, signer);

  try {
    const isTimeBased = await vToken.isTimeBased();
    console.log("isTimeBased:", isTimeBased);
  } catch (e: any) {
    console.log("isTimeBased check failed:", e.message);
  }

  try {
    const blocksPerYear = await vToken.blocksOrSecondsPerYear();
    console.log("blocksOrSecondsPerYear:", blocksPerYear.toString());
  } catch (e: any) {
    console.log("blocksOrSecondsPerYear failed:", e.message);
  }

  try {
    const blockOrTime = await vToken.getBlockNumberOrTimestamp();
    console.log("getBlockNumberOrTimestamp:", blockOrTime.toString());
  } catch (e: any) {
    console.log("getBlockNumberOrTimestamp failed:", e.message);
  }

  const accrualBlock = await vToken.accrualBlockNumber();
  console.log("accrualBlockNumber:", accrualBlock.toString());

  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);
  
  const currentTime = Math.floor(Date.now() / 1000);
  console.log("Current timestamp:", currentTime);
}

main().catch(console.error);
