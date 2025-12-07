import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const irm1 = "0xcE3edc2285F4bf9dC9dbf65eE300bf385E27F511"; // vMockTKN 当前使用
  const irm2 = "0xC5f83de7E31BDb07057F98d2c5f05f0B2b3D55a4"; // 部署记录

  console.log("=== IRM 参数对比 ===\n");

  const irmAbi = [
    "function baseRatePerBlock() view returns (uint256)",
    "function multiplierPerBlock() view returns (uint256)",
    "function jumpMultiplierPerBlock() view returns (uint256)",
    "function kink() view returns (uint256)",
    "function blocksOrSecondsPerYear() view returns (uint256)",
    "function isTimeBased() view returns (bool)"
  ];

  const irm1Contract = new ethers.Contract(irm1, irmAbi, signer);
  const irm2Contract = new ethers.Contract(irm2, irmAbi, signer);

  console.log("IRM 1 (当前使用):", irm1);
  const base1 = await irm1Contract.baseRatePerBlock();
  const mult1 = await irm1Contract.multiplierPerBlock();
  const jump1 = await irm1Contract.jumpMultiplierPerBlock();
  const kink1 = await irm1Contract.kink();
  const bpy1 = await irm1Contract.blocksOrSecondsPerYear();
  const time1 = await irm1Contract.isTimeBased();

  console.log("  baseRatePerBlock:", base1.toString());
  console.log("  multiplierPerBlock:", mult1.toString());
  console.log("  jumpMultiplierPerBlock:", jump1.toString());
  console.log("  kink:", ethers.utils.formatUnits(kink1, 18));
  console.log("  blocksPerYear:", bpy1.toString());
  console.log("  isTimeBased:", time1);

  console.log("\nIRM 2 (部署记录):", irm2);
  const base2 = await irm2Contract.baseRatePerBlock();
  const mult2 = await irm2Contract.multiplierPerBlock();
  const jump2 = await irm2Contract.jumpMultiplierPerBlock();
  const kink2 = await irm2Contract.kink();
  const bpy2 = await irm2Contract.blocksOrSecondsPerYear();
  const time2 = await irm2Contract.isTimeBased();

  console.log("  baseRatePerBlock:", base2.toString());
  console.log("  multiplierPerBlock:", mult2.toString());
  console.log("  jumpMultiplierPerBlock:", jump2.toString());
  console.log("  kink:", ethers.utils.formatUnits(kink2, 18));
  console.log("  blocksPerYear:", bpy2.toString());
  console.log("  isTimeBased:", time2);

  console.log("\n=== 差异检查 ===");
  console.log("baseRate 相同:", base1.eq(base2));
  console.log("multiplier 相同:", mult1.eq(mult2));
  console.log("jumpMultiplier 相同:", jump1.eq(jump2));
  console.log("kink 相同:", kink1.eq(kink2));
  console.log("blocksPerYear 相同:", bpy1.eq(bpy2));
  console.log("isTimeBased 相同:", time1 === time2);

  if (base1.eq(base2) && mult1.eq(mult2) && jump1.eq(jump2) && kink1.eq(kink2)) {
    console.log("\n✅ 参数完全相同");
  } else {
    console.log("\n❌ 参数不同，需要修复");
  }
}

main().catch(console.error);
