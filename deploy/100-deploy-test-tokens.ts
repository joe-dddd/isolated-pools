import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deploy test tokens for our fork: MockUSDT (6 decimals) and MockToken (18 decimals)
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy MockUSDT (6 decimals like real USDT)
  const mockUSDT = await deploy("MockUSDT", {
    contract: "MockToken",
    from: deployer,
    args: ["Mock USDT", "USDT", 6],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("MockUSDT deployed at:", mockUSDT.address);

  // Deploy MockToken (18 decimals)
  const mockToken = await deploy("MockTKN", {
    contract: "MockToken",
    from: deployer,
    args: ["Mock Token", "TKN", 18],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("MockTKN deployed at:", mockToken.address);

  // Mint initial supply to deployer
  const MockToken = await ethers.getContractFactory("MockToken");

  const usdt = MockToken.attach(mockUSDT.address);
  const tkn = MockToken.attach(mockToken.address);

  // Mint 1M USDT (6 decimals)
  const usdtAmount = ethers.utils.parseUnits("1000000", 6);
  const usdtBalance = await usdt.balanceOf(deployer);
  if (usdtBalance.lt(usdtAmount)) {
    console.log("Minting 1M USDT to deployer...");
    const tx1 = await usdt.faucet(usdtAmount);
    await tx1.wait();
  }

  // Mint 1M TKN (18 decimals)
  const tknAmount = ethers.utils.parseUnits("1000000", 18);
  const tknBalance = await tkn.balanceOf(deployer);
  if (tknBalance.lt(tknAmount)) {
    console.log("Minting 1M TKN to deployer...");
    const tx2 = await tkn.faucet(tknAmount);
    await tx2.wait();
  }

  console.log("Test tokens deployed and funded!");
};

func.tags = ["TestTokens"];

export default func;
