import hre from "hardhat";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

const V_ALPHA = "0x664a7313c341931b1a44A8f23db76E1D3E6a5e07";
const COMPTROLLER_ALPHA = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const BLOCKS_PER_YEAR = BigNumber.from("42048000"); // 0.75s/block

async function main() {
  const { ethers } = hre;

  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER_ALPHA);
  const vToken = await ethers.getContractAt("VToken", V_ALPHA);

  const rewards = await comptroller.getRewardsByMarket(V_ALPHA);
  const totalBorrows = await vToken.totalBorrows();

  console.log("totalBorrows:", totalBorrows.toString());
  rewards.forEach((r, i) => {
    console.log(
      `reward[${i}] token=${r.rewardToken} supplySpeed=${r.supplySpeed.toString()} borrowSpeed=${r.borrowSpeed.toString()}`,
    );
  });

  if (rewards.length === 0) {
    console.log("No rewards configured for vALPHA.");
    return;
  }
  if (totalBorrows.isZero()) {
    console.log("totalBorrows is 0; APR undefined.");
    return;
  }

  const totalBorrowSpeed = rewards.reduce(
    (sum, r) => sum.add(r.borrowSpeed),
    BigNumber.from(0),
  );
  const rewardPerYear = totalBorrowSpeed.mul(BLOCKS_PER_YEAR);
  const aprMantissa = rewardPerYear.mul(BigNumber.from(10).pow(18)).div(totalBorrows);
  const apr = formatUnits(aprMantissa, 18);
  const aprPercent = (Number(apr) * 100).toFixed(4);

  console.log("totalBorrowSpeed:", totalBorrowSpeed.toString());
  console.log("rewardPerYear (wei):", rewardPerYear.toString());
  console.log("APR (reward token / borrowed token):", apr);
  console.log("APR (%):", aprPercent);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
