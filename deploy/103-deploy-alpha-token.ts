import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy AlphaToken (18 decimals)
  const alphaToken = await deploy("AlphaToken", {
    contract: "MockToken",
    from: deployer,
    args: ["AlphaToken", "ALPHA", 18],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("AlphaToken deployed at:", alphaToken.address);

  // Mint initial supply to deployer
  const MockToken = await ethers.getContractFactory("MockToken");
  const alpha = MockToken.attach(alphaToken.address);

  // Mint 1M ALPHA (18 decimals)
  const alphaAmount = ethers.utils.parseUnits("1000000", 18);
  const alphaBalance = await alpha.balanceOf(deployer);
  if (alphaBalance.lt(alphaAmount)) {
    console.log("Minting 1M ALPHA to deployer...");
    const tx = await alpha.faucet(alphaAmount);
    await tx.wait();
  }

  console.log("AlphaToken deployed and funded!");
};

func.tags = ["AlphaToken"];

export default func;
