import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const irmAddr = "0xcE3edc2285F4bf9dC9dbf65eE300bf385E27F511";
  
  const irmInterface = new ethers.utils.Interface([
    "function isTimeBased() view returns (bool)",
    "function blocksOrSecondsPerYear() view returns (uint256)",
    "function isInterestRateModel() view returns (bool)"
  ]);

  const irm = new ethers.Contract(irmAddr, irmInterface, signer);

  try {
    const isTimeBased = await irm.isTimeBased();
    console.log("IRM isTimeBased:", isTimeBased);
  } catch (e: any) {
    console.log("IRM isTimeBased failed:", e.message);
  }

  try {
    const blocksPerYear = await irm.blocksOrSecondsPerYear();
    console.log("IRM blocksOrSecondsPerYear:", blocksPerYear.toString());
  } catch (e: any) {
    console.log("IRM blocksOrSecondsPerYear failed:", e.message);
  }

  try {
    const isIRM = await irm.isInterestRateModel();
    console.log("isInterestRateModel:", isIRM);
  } catch (e: any) {
    console.log("isInterestRateModel failed:", e.message);
  }
}

main().catch(console.error);
