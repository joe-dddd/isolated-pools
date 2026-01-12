import hre from "hardhat";

import { getConfig } from "../helpers/deploymentConfig";
import { getBlockOrTimestampBasedDeploymentInfo, toAddress } from "../helpers/deploymentUtils";

const MAX_LOOPS_LIMIT = 100;

async function main() {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkName = hre.network.name;

  const { preconfiguredAddresses } = await getConfig(networkName);
  const accessControlAddress = await toAddress(preconfiguredAddresses.AccessControlManager || "AccessControlManager");
  const { isTimeBased, blocksPerYear } = getBlockOrTimestampBasedDeploymentInfo(networkName);

  const comptroller = await deployments.get("Comptroller_Alpha");
  const alphaToken = await deployments.get("AlphaToken");

  await deploy("RewardsDistributorImpl", {
    contract: "RewardsDistributor",
    from: deployer,
    autoMine: true,
    args: [isTimeBased, blocksPerYear],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const proxyAdmin = await deploy("ProxyAdmin_Alpha", {
    contract: "ProxyAdmin",
    from: deployer,
    args: [deployer],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const deployment = await deploy("RewardsDistributor_Alpha_Proxy_Admin", {
    from: deployer,
    contract: "RewardsDistributor",
    proxy: {
      implementationName: "RewardsDistributorImpl",
      owner: proxyAdmin.address,
      proxyContract: "OptimizedTransparentUpgradeableProxy",
      execute: {
        methodName: "initialize",
        args: [comptroller.address, alphaToken.address, MAX_LOOPS_LIMIT, accessControlAddress],
      },
      upgradeIndex: 0,
    },
    args: [isTimeBased, blocksPerYear],
    autoMine: true,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  console.log("RewardsDistributor proxy deployed at:", deployment.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
