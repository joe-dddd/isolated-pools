import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  
  const vTokenAbi = [
    "function reduceReservesBlockNumber() view returns (uint256)",
    "function reduceReservesBlockDelta() view returns (uint256)",
    "function totalReserves() view returns (uint256)",
    "function accrualBlockNumber() view returns (uint256)"
  ];

  const vToken = new ethers.Contract(vMockTKNAddr, vTokenAbi, signer);

  const currentBlock = await ethers.provider.getBlockNumber();
  const reduceBlockNum = await vToken.reduceReservesBlockNumber();
  const reduceBlockDelta = await vToken.reduceReservesBlockDelta();
  const totalReserves = await vToken.totalReserves();
  const accrualBlock = await vToken.accrualBlockNumber();

  console.log("currentBlock:", currentBlock);
  console.log("reduceReservesBlockNumber:", reduceBlockNum.toString());
  console.log("reduceReservesBlockDelta:", reduceBlockDelta.toString());
  console.log("totalReserves:", totalReserves.toString());
  console.log("accrualBlockNumber:", accrualBlock.toString());
  
  const delta = currentBlock - reduceBlockNum.toNumber();
  console.log("\nBlocks since last reduce:", delta);
  console.log("Reduce delta required:", reduceBlockDelta.toString());
  console.log("Will trigger reduce:", delta >= reduceBlockDelta.toNumber());
}

main().catch(console.error);
