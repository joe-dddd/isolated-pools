import hre from "hardhat";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

import { getConfig } from "../helpers/deploymentConfig";
import { getBlockOrTimestampBasedDeploymentInfo } from "../helpers/deploymentUtils";

const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60;
const BLOCK_TIME_NUMERATOR = 3; // 0.75s = 3/4
const BLOCK_TIME_DENOMINATOR = 4;
const MAX_LOOPS_LIMIT = 100;

async function main() {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const networkName = hre.network.name;

  if (networkName !== "bsctestnet") {
    console.log(`Skipping on ${networkName}; this script targets bsctestnet.`);
    return;
  }

  const { preconfiguredAddresses } = await getConfig(networkName);
  const accessControlManager = preconfiguredAddresses.AccessControlManager;
  const { isTimeBased, blocksPerYear } = getBlockOrTimestampBasedDeploymentInfo(networkName);

  if (isTimeBased) {
    throw new Error("Expected block-based rewards on bsctestnet.");
  }

  const alphaTokenDeployment = await deployments.get("AlphaToken");
  const comptrollerDeployment = await deployments.get("Comptroller_Alpha");
  const vAlphaDeployment = await deployments.getOrNull("VToken_vALPHA_Alpha");
  const vAlphaAddress = process.env.VALPHA || vAlphaDeployment?.address;

  if (!vAlphaAddress) {
    throw new Error("Missing vALPHA address. Set VALPHA or deploy VToken_vALPHA_Alpha first.");
  }

  const rewardsProxyDeployment = await deployments.getOrNull("RewardsDistributor_Alpha_Proxy");
  const rewardsDistributorAddress = process.env.REWARDS_DISTRIBUTOR || rewardsProxyDeployment?.address;

  if (!rewardsDistributorAddress) {
    throw new Error("Missing RewardsDistributor proxy. Deploy RewardsDistributor_Alpha_Proxy or set REWARDS_DISTRIBUTOR.");
  }

  console.log("RewardsDistributor proxy found:", rewardsDistributorAddress);

  const rewardsDistributor = await ethers.getContractAt("RewardsDistributor", rewardsDistributorAddress);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerDeployment.address);

  const acm = await ethers.getContractAt("AccessControlManager", accessControlManager);
  const addDistributorSig = "addRewardsDistributor(address)";

  const hasAddDistributor = await acm.isAllowedToCall(deployer, addDistributorSig);
  if (!hasAddDistributor) {
    console.log("Granting addRewardsDistributor permission...");
    const tx = await acm.giveCallPermission(comptrollerDeployment.address, addDistributorSig, deployer);
    await tx.wait();
  }

  const rewardDistributors = await comptroller.getRewardDistributors();
  const alreadyAdded = rewardDistributors.some(
    (addr: string) => addr.toLowerCase() === rewardsDistributorAddress?.toLowerCase(),
  );
  if (!alreadyAdded) {
    const tx = await comptroller.addRewardsDistributor(rewardsDistributorAddress);
    await tx.wait();
    console.log("RewardsDistributor added to Comptroller_Alpha.");
  }

  const alphaToken = await ethers.getContractAt("MockToken", alphaTokenDeployment.address);
  const rewardTotal = parseUnits("100000", 18);
  const deployerBalance = await alphaToken.balanceOf(deployer);

  if (deployerBalance.lt(rewardTotal)) {
    console.log("Minting 100,000 ALPHA to deployer...");
    const mintTx = await alphaToken.faucet(rewardTotal);
    await mintTx.wait();
  }

  const distributorBalance = await alphaToken.balanceOf(rewardsDistributorAddress);
  if (distributorBalance.lt(rewardTotal)) {
    console.log("Funding RewardsDistributor with 100,000 ALPHA...");
    const fundTx = await alphaToken.transfer(rewardsDistributorAddress, rewardTotal);
    await fundTx.wait();
  }

  const blocksPerMonth = BigNumber.from(ONE_MONTH_SECONDS)
    .mul(BLOCK_TIME_DENOMINATOR)
    .div(BLOCK_TIME_NUMERATOR);
  const borrowSpeed = rewardTotal.div(blocksPerMonth);
  const supplySpeed = BigNumber.from(0);

  const setSpeedsSig = "setRewardTokenSpeeds(address[],uint256[],uint256[])";
  const setLastBlocksSig = "setLastRewardingBlocks(address[],uint32[],uint32[])";

  const hasSetSpeeds = await acm.isAllowedToCall(deployer, setSpeedsSig);
  if (!hasSetSpeeds) {
    const tx = await acm.giveCallPermission(rewardsDistributorAddress, setSpeedsSig, deployer);
    await tx.wait();
  }

  const hasSetLastBlocks = await acm.isAllowedToCall(deployer, setLastBlocksSig);
  if (!hasSetLastBlocks) {
    const tx = await acm.giveCallPermission(rewardsDistributorAddress, setLastBlocksSig, deployer);
    await tx.wait();
  }

  const speedTx = await rewardsDistributor.setRewardTokenSpeeds([vAlphaAddress], [supplySpeed], [borrowSpeed]);
  await speedTx.wait();
  console.log("Reward speeds set. Borrow speed:", borrowSpeed.toString());

  const currentBlock = await ethers.provider.getBlockNumber();
  const endBlock = currentBlock + blocksPerMonth.toNumber();
  const lastBlocksTx = await rewardsDistributor.setLastRewardingBlocks(
    [vAlphaAddress],
    [endBlock],
    [endBlock],
  );
  await lastBlocksTx.wait();
  console.log("Last rewarding block set to:", endBlock);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
