import { ethers } from "hardhat";

async function main() {
  const irm2 = "0xC5f83de7E31BDb07057F98d2c5f05f0B2b3D55a4";

  const irmAbi = [
    "function baseRatePerBlock() view returns (uint256)",
    "function multiplierPerBlock() view returns (uint256)",
    "function jumpMultiplierPerBlock() view returns (uint256)",
    "function kink() view returns (uint256)",
    "function blocksOrSecondsPerYear() view returns (uint256)",
    "function isTimeBased() view returns (bool)"
  ];

  const irm = new ethers.Contract(irm2, irmAbi, ethers.provider);

  console.log("IRM 2 (部署记录):", irm2);
  console.log("baseRatePerBlock:", (await irm.baseRatePerBlock()).toString());
  console.log("multiplierPerBlock:", (await irm.multiplierPerBlock()).toString());
  console.log("jumpMultiplierPerBlock:", (await irm.jumpMultiplierPerBlock()).toString());
  console.log("kink:", ethers.utils.formatUnits(await irm.kink(), 18));
  console.log("blocksPerYear:", (await irm.blocksOrSecondsPerYear()).toString());
  console.log("isTimeBased:", await irm.isTimeBased());

  // 计算年化利率
  const base = await irm.baseRatePerBlock();
  const mult = await irm.multiplierPerBlock();
  const jump = await irm.jumpMultiplierPerBlock();
  const kink = await irm.kink();
  
  console.log("\n估算年化利率 (APR):");
  console.log("基础利率:", ethers.utils.formatUnits(base.mul(42048000), 18));
  console.log("斜率 (kink前):", ethers.utils.formatUnits(mult.mul(42048000), 18));
  console.log("跳跃斜率 (kink后):", ethers.utils.formatUnits(jump.mul(42048000), 18));
}

main().catch(console.error);
