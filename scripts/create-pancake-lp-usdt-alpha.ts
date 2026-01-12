import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

// Pancake Router V2 ABI (minimal)
const PANCAKE_ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function factory() external pure returns (address)",
];

const PANCAKE_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Token addresses
  const MOCK_USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const ALPHA_TOKEN = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";

  const mockUSDT = await ethers.getContractAt("MockToken", MOCK_USDT);
  const alphaToken = await ethers.getContractAt("MockToken", ALPHA_TOKEN);

  console.log("MockUSDT:", mockUSDT.address);
  console.log("AlphaToken:", alphaToken.address);

  // Check decimals
  const usdtDecimals = await mockUSDT.decimals();
  const alphaDecimals = await alphaToken.decimals();
  console.log(`MockUSDT decimals: ${usdtDecimals}`);
  console.log(`AlphaToken decimals: ${alphaDecimals}`);

  // Define liquidity amounts (1 USDT = 10 ALPHA)
  const usdtAmount = parseUnits("10000", usdtDecimals); // 10,000 USDT
  const alphaAmount = parseUnits("100000", alphaDecimals); // 100,000 ALPHA

  console.log(`Adding liquidity: ${ethers.utils.formatUnits(usdtAmount, usdtDecimals)} USDT + ${ethers.utils.formatUnits(alphaAmount, alphaDecimals)} ALPHA`);

  // Check balances
  const usdtBalance = await mockUSDT.balanceOf(deployer.address);
  const alphaBalance = await alphaToken.balanceOf(deployer.address);
  console.log(`Deployer USDT balance: ${ethers.utils.formatUnits(usdtBalance, usdtDecimals)}`);
  console.log(`Deployer ALPHA balance: ${ethers.utils.formatUnits(alphaBalance, alphaDecimals)}`);

  // Mint if needed
  if (usdtBalance.lt(usdtAmount)) {
    console.log("Minting USDT...");
    const mintTx = await mockUSDT.faucet(usdtAmount);
    await mintTx.wait();
    console.log("USDT minted");
  }

  if (alphaBalance.lt(alphaAmount)) {
    console.log("Minting ALPHA...");
    const mintTx = await alphaToken.faucet(alphaAmount);
    await mintTx.wait();
    console.log("ALPHA minted");
  }

  // Get router contract
  const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, deployer);

  // Approve router to spend tokens
  console.log("Approving router...");
  const usdtAllowance = await mockUSDT.allowance(deployer.address, PANCAKE_ROUTER);
  if (usdtAllowance.lt(usdtAmount)) {
    const approveTx = await mockUSDT.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("USDT approved");
  }

  const alphaAllowance = await alphaToken.allowance(deployer.address, PANCAKE_ROUTER);
  if (alphaAllowance.lt(alphaAmount)) {
    const approveTx = await alphaToken.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("ALPHA approved");
  }

  // Add liquidity
  console.log("Adding liquidity to Pancake...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  const addLiquidityTx = await router.addLiquidity(
    mockUSDT.address,
    alphaToken.address,
    usdtAmount,
    alphaAmount,
    usdtAmount.mul(95).div(100), // 5% slippage
    alphaAmount.mul(95).div(100), // 5% slippage
    deployer.address,
    deadline,
  );

  const receipt = await addLiquidityTx.wait();
  console.log("Liquidity added! Tx:", receipt.transactionHash);

  // Get pair address from factory
  const factoryAbi = ["function getPair(address tokenA, address tokenB) external view returns (address pair)"];
  const factory = new ethers.Contract(PANCAKE_FACTORY, factoryAbi, deployer);
  const pairAddress = await factory.getPair(mockUSDT.address, alphaToken.address);

  console.log("LP Pair address:", pairAddress);
  console.log("View on BSCScan:", `https://testnet.bscscan.com/address/${pairAddress}`);

  // Save pair address
  const { deployments } = require("hardhat");
  await deployments.save("PancakeLPPair_USDT_ALPHA", {
    address: pairAddress,
    abi: [],
  });

  console.log("\n=== Deployment Summary ===");
  console.log("AlphaToken:", alphaToken.address);
  console.log("PancakeLPPair_USDT_ALPHA:", pairAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
