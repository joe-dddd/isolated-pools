import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deploy PancakeV2TWAPOracle with USDT as quote asset
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get MockUSDT as quote asset
  const mockUSDT = await get("MockUSDT");

  console.log("Deploying PancakeV2TWAPOracle...");
  console.log("Quote Asset (MockUSDT):", mockUSDT.address);

  const oracle = await deploy("PancakeV2TWAPOracle", {
    from: deployer,
    args: [mockUSDT.address],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("PancakeV2TWAPOracle deployed at:", oracle.address);

  // Set direct prices for test tokens (no LP needed for testing)
  const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle.address);

  // Set MockUSDT price = 1 USD (1e18)
  // MockUSDT is the quote asset, so getPrice returns 1e18 automatically

  // Set MockTKN price = 2 USD (2e18)
  const mockTKN = await get("MockTKN");
  const tknPrice = ethers.utils.parseUnits("2", 18);
  const currentTknPrice = await oracleContract.directPrices(mockTKN.address);

  if (currentTknPrice.eq(0)) {
    console.log("Setting MockTKN price to 2 USD...");
    const tx = await oracleContract.setDirectPrice(mockTKN.address, tknPrice);
    await tx.wait();
    console.log("MockTKN price set");
  }

  console.log("Oracle deployed and configured!");
};

func.tags = ["Oracle"];
func.dependencies = ["TestTokens"];

export default func;
