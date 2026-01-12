import hre from "hardhat";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60;
const BLOCK_TIME_NUMERATOR = 3; // 0.75s = 3/4
const BLOCK_TIME_DENOMINATOR = 4;
const MAX_LOOPS_LIMIT = 100;

async function main() {
  const { deployments, ethers, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const alphaTokenAddr = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const vAlphaAddr = "0x664a7313c341931b1a44A8f23db76E1D3E6a5e07";
  const acmAddr = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
  const isTimeBased = false;
  const blocksPerYear = 42048000;

  // Deploy RewardsDistributor with proxy (use UUPS to avoid admin restriction)
  console.log("Deploying RewardsDistributor with UUPS proxy...");
  const rewardsDistributorDeployment = await deployments.deploy("RewardsDistributor_Alpha_Proxy", {
    contract: "RewardsDistributor",
    from: deployer,
    args: [isTimeBased, blocksPerYear],
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      owner: deployer,
      execute: {
        init: {
          methodName: "initialize",
          args: [comptrollerAddr, alphaTokenAddr, MAX_LOOPS_LIMIT, acmAddr],
        },
      },
    },
  });

  const rewardsDistributorAddress = rewardsDistributorDeployment.address;
  console.log("RewardsDistributor proxy deployed:", rewardsDistributorAddress);

  const rewardsDistributor = await ethers.getContractAt("RewardsDistributor", rewardsDistributorAddress);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr);

  // Grant ACM permissions
  const acm = await ethers.getContractAt("AccessControlManager", acmAddr);
  const addDistributorSig = "addRewardsDistributor(address)";

  const hasAddDistributor = await acm.isAllowedToCall(deployer, addDistributorSig);
  if (!hasAddDistributor) {
    console.log("Granting addRewardsDistributor permission...");
    const tx = await acm.giveCallPermission(comptrollerAddr, addDistributorSig, deployer);
    await tx.wait();
  }

  // Add to Comptroller
  const rewardDistributors = await comptroller.getRewardDistributors();
  const alreadyAdded = rewardDistributors.some(
    (addr: string) => addr.toLowerCase() === rewardsDistributorAddress.toLowerCase(),
  );
  if (!alreadyAdded) {
    console.log("Adding RewardsDistributor to Comptroller...");
    const tx = await comptroller.addRewardsDistributor(rewardsDistributorAddress);
    await tx.wait();
    console.log("Added");
  } else {
    console.log("RewardsDistributor already added to Comptroller");
  }

  // Mint and fund
  const alphaToken = await ethers.getContractAt("MockToken", alphaTokenAddr);
  const rewardTotal = parseUnits("100000", 18);
  const deployerBalance = await alphaToken.balanceOf(deployer);

  if (deployerBalance.lt(rewardTotal)) {
    console.log("Minting 100,000 ALPHA...");
    const mintTx = await alphaToken.faucet(rewardTotal);
    await mintTx.wait();
  }

  const distributorBalance = await alphaToken.balanceOf(rewardsDistributorAddress);
  if (distributorBalance.lt(rewardTotal)) {
    console.log("Funding RewardsDistributor...");
    const fundTx = await alphaToken.transfer(rewardsDistributorAddress, rewardTotal);
    await fundTx.wait();
  }

  // Calculate speeds
  const blocksPerMonth = BigNumber.from(ONE_MONTH_SECONDS).mul(BLOCK_TIME_DENOMINATOR).div(BLOCK_TIME_NUMERATOR);
  const borrowSpeed = rewardTotal.div(blocksPerMonth);
  const supplySpeed = BigNumber.from(0);

  // Grant ACM permissions for setRewardTokenSpeeds
  const setSpeedsSig = "setRewardTokenSpeeds(address[],uint256[],uint256[])";
  const setLastBlocksSig = "setLastRewardingBlocks(address[],uint32[],uint32[])";

  const hasSetSpeeds = await acm.isAllowedToCall(deployer, setSpeedsSig);
  if (!hasSetSpeeds) {
    console.log("Granting setRewardTokenSpeeds permission...");
    const tx = await acm.giveCallPermission(rewardsDistributorAddress, setSpeedsSig, deployer);
    await tx.wait();
  }

  const hasSetLastBlocks = await acm.isAllowedToCall(deployer, setLastBlocksSig);
  if (!hasSetLastBlocks) {
    console.log("Granting setLastRewardingBlocks permission...");
    const tx = await acm.giveCallPermission(rewardsDistributorAddress, setLastBlocksSig, deployer);
    await tx.wait();
  }

  // Set speeds
  console.log("Setting reward speeds...");
  const speedTx = await rewardsDistributor.setRewardTokenSpeeds([vAlphaAddr], [supplySpeed], [borrowSpeed]);
  await speedTx.wait();
  console.log("Borrow speed:", borrowSpeed.toString());

  // Set last rewarding blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  const endBlock = currentBlock + blocksPerMonth.toNumber();
  console.log("Setting last rewarding block...");
  const lastBlocksTx = await rewardsDistributor.setLastRewardingBlocks([vAlphaAddr], [endBlock], [endBlock]);
  await lastBlocksTx.wait();
  console.log("End block:", endBlock);

  console.log("\n=== Setup Complete ===");
  console.log("RewardsDistributor Proxy:", rewardsDistributorAddress);
  console.log("Borrow speed:", borrowSpeed.toString(), "ALPHA/block");
  console.log("Duration:", blocksPerMonth.toString(), "blocks (~30 days)");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
