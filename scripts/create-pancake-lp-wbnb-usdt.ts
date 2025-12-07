import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

// Pancake Router V2 ABI
const PANCAKE_ROUTER_ABI = [
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function factory() external pure returns (address)",
];

const PANCAKE_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"; // BSC testnet WBNB
const PANCAKE_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating WBNB/USDT LP on BSC Testnet...");
  console.log("Deployer:", deployer.address);

  // Get MockUSDT deployment
  const hre = require("hardhat");
  const mockUSDT = await hre.deployments.get("MockUSDT");
  console.log("MockUSDT:", mockUSDT.address);

  // Get USDT contract
  const usdtContract = await ethers.getContractAt("MockToken", mockUSDT.address, deployer);
  const usdtDecimals = await usdtContract.decimals();
  console.log(`MockUSDT decimals: ${usdtDecimals}`);

  // Define liquidity amounts
  const wbnbAmount = parseUnits("0.1", 18); // 0.1 WBNB
  const usdtAmount = parseUnits("1000", usdtDecimals); // 1000 USDT

  console.log(`Adding liquidity: ${ethers.utils.formatUnits(wbnbAmount, 18)} WBNB + ${ethers.utils.formatUnits(usdtAmount, usdtDecimals)} USDT`);

  // Check balances
  const bnbBalance = await deployer.getBalance();
  const usdtBalance = await usdtContract.balanceOf(deployer.address);
  console.log(`Deployer BNB balance: ${ethers.utils.formatEther(bnbBalance)}`);
  console.log(`Deployer USDT balance: ${ethers.utils.formatUnits(usdtBalance, usdtDecimals)}`);

  // Mint USDT if needed
  if (usdtBalance.lt(usdtAmount)) {
    console.log("Minting USDT...");
    const mintTx = await usdtContract.faucet(usdtAmount);
    await mintTx.wait();
    console.log("USDT minted");
  }

  // Get router
  const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, deployer);

  // Approve USDT
  console.log("Approving USDT...");
  const usdtAllowance = await usdtContract.allowance(deployer.address, PANCAKE_ROUTER);
  if (usdtAllowance.lt(usdtAmount)) {
    const approveTx = await usdtContract.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("USDT approved");
  }

  // Add liquidity
  console.log("Adding liquidity to Pancake...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  const addLiquidityTx = await router.addLiquidityETH(
    mockUSDT.address,
    usdtAmount,
    usdtAmount.mul(95).div(100), // 5% slippage
    wbnbAmount.mul(95).div(100), // 5% slippage
    deployer.address,
    deadline,
    { value: wbnbAmount },
  );

  const receipt = await addLiquidityTx.wait();
  console.log("Liquidity added! Tx:", receipt.transactionHash);

  // Get pair address
  const factory = new ethers.Contract(PANCAKE_FACTORY, PANCAKE_FACTORY_ABI, deployer);
  const pairAddress = await factory.getPair(WBNB, mockUSDT.address);

  console.log("LP Pair address:", pairAddress);
  console.log("View on BSCScan:", `https://testnet.bscscan.com/address/${pairAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
