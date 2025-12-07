import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const correctIRM = "0xC5f83de7E31BDb07057F98d2c5f05f0B2b3D55a4";

  console.log("Signer:", signer.address);
  console.log("vMockTKN:", vMockTKNAddr);
  console.log("Target IRM:", correctIRM);
  console.log();

  const vToken = await ethers.getContractAt("VToken", vMockTKNAddr, signer);

  // 检查当前IRM
  const currentIRM = await vToken.interestRateModel();
  console.log("Current IRM:", currentIRM);

  if (currentIRM.toLowerCase() === correctIRM.toLowerCase()) {
    console.log("✅ IRM 已经正确");
    return;
  }

  // 检查权限
  const owner = await vToken.owner();
  console.log("VToken owner:", owner);
  console.log("Is owner:", owner.toLowerCase() === signer.address.toLowerCase());

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ 没有权限，需要owner执行");
    return;
  }

  // 更新IRM
  console.log("\n更新IRM...");
  const tx = await vToken.setInterestRateModel(correctIRM);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("Done!");

  // 验证
  const newIRM = await vToken.interestRateModel();
  console.log("\nNew IRM:", newIRM);
  console.log("Match:", newIRM.toLowerCase() === correctIRM.toLowerCase());
}

main().catch(console.error);
