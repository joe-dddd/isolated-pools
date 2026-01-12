import hre from "hardhat";
import { formatUnits } from "ethers/lib/utils";

const ACCOUNT = "0xA2C41Bcf4760c7c88C5c13eE33128161bfC97a4C";
const COMPTROLLER_ALPHA = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const POOL_LENS = "0xbAF6BeE63459C08656EC58c78385a10Ea6BB9a7E";

async function main() {
  const { ethers } = hre;
  const poolLens = await ethers.getContractAt("PoolLens", POOL_LENS);

  const rewards = await poolLens.getPendingRewards(ACCOUNT, COMPTROLLER_ALPHA);
  if (rewards.length === 0) {
    console.log("No rewards distributors found.");
    return;
  }

  console.log(`Account: ${ACCOUNT}`);
  rewards.forEach((r: any, i: number) => {
    const pendingTotal = r.pendingRewards.reduce(
      (sum: any, pr: any) => sum.add(pr.amount),
      ethers.BigNumber.from(0),
    );
    console.log(`reward[${i}] distributor=${r.distributorAddress} token=${r.rewardTokenAddress}`);
    console.log(`  totalRewards: ${formatUnits(r.totalRewards, 18)}`);
    console.log(`  pendingRewards: ${formatUnits(pendingTotal, 18)}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
