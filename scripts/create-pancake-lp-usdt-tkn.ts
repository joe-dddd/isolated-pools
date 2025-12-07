import { parseUnits } from "ethers/lib/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Pancake Router V2 ABI (minimal)
const PANCAKE_ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function factory() external pure returns (address)",
];

const PANCAKE_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Skip on mainnet
  if (hre.network.name !== "bsctestnet") {
    console.log("Skipping Pancake LP creation on", hre.network.name);
    return;
  }

  console.log("Creating Pancake LP on BSC Testnet...");

  // Get mock token deployments
  const mockUSDT = await get("MockUSDT");
  const mockTKN = await get("MockTKN");

  console.log("MockUSDT:", mockUSDT.address);
  console.log("MockTKN:", mockTKN.address);

  // Get signer
  const signer = await ethers.getSigner(deployer);

  // Get token contracts
  const usdtContract = await ethers.getContractAt("MockToken", mockUSDT.address, signer);
  const tknContract = await ethers.getContractAt("MockToken", mockTKN.address, signer);

  // Check decimals
  const usdtDecimals = await usdtContract.decimals();
  const tknDecimals = await tknContract.decimals();
  console.log(`MockUSDT decimals: ${usdtDecimals}`);
  console.log(`MockTKN decimals: ${tknDecimals}`);

  // Define liquidity amounts
  const usdtAmount = parseUnits("10000", usdtDecimals); // 10,000 USDT
  const tknAmount = parseUnits("10000", tknDecimals); // 10,000 TKN

  console.log(`Adding liquidity: ${ethers.utils.formatUnits(usdtAmount, usdtDecimals)} USDT + ${ethers.utils.formatUnits(tknAmount, tknDecimals)} TKN`);

  // Check balances
  const usdtBalance = await usdtContract.balanceOf(deployer);
  const tknBalance = await tknContract.balanceOf(deployer);
  console.log(`Deployer USDT balance: ${ethers.utils.formatUnits(usdtBalance, usdtDecimals)}`);
  console.log(`Deployer TKN balance: ${ethers.utils.formatUnits(tknBalance, tknDecimals)}`);

  // Mint if needed
  if (usdtBalance.lt(usdtAmount)) {
    console.log("Minting USDT...");
    const mintTx = await usdtContract.faucet(usdtAmount);
    await mintTx.wait();
    console.log("USDT minted");
  }

  if (tknBalance.lt(tknAmount)) {
    console.log("Minting TKN...");
    const mintTx = await tknContract.faucet(tknAmount);
    await mintTx.wait();
    console.log("TKN minted");
  }

  // Get router contract
  const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, signer);

  // Approve router to spend tokens
  console.log("Approving router...");
  const usdtAllowance = await usdtContract.allowance(deployer, PANCAKE_ROUTER);
  if (usdtAllowance.lt(usdtAmount)) {
    const approveTx = await usdtContract.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("USDT approved");
  }

  const tknAllowance = await tknContract.allowance(deployer, PANCAKE_ROUTER);
  if (tknAllowance.lt(tknAmount)) {
    const approveTx = await tknContract.approve(PANCAKE_ROUTER, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("TKN approved");
  }

  // Add liquidity
  console.log("Adding liquidity to Pancake...");
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  const addLiquidityTx = await router.addLiquidity(
    mockUSDT.address,
    mockTKN.address,
    usdtAmount,
    tknAmount,
    usdtAmount.mul(95).div(100), // 5% slippage
    tknAmount.mul(95).div(100), // 5% slippage
    deployer,
    deadline,
  );

  const receipt = await addLiquidityTx.wait();
  console.log("Liquidity added! Tx:", receipt.transactionHash);

  // Get pair address from factory
  const factoryAbi = ["function getPair(address tokenA, address tokenB) external view returns (address pair)"];
  const factory = new ethers.Contract(PANCAKE_FACTORY, factoryAbi, signer);
  const pairAddress = await factory.getPair(mockUSDT.address, mockTKN.address);

  console.log("LP Pair address:", pairAddress);
  console.log("View on BSCScan:", `https://testnet.bscscan.com/address/${pairAddress}`);

  // Save pair address
  await deployments.save("PancakeLPPair_USDT_TKN", {
    address: pairAddress,
    abi: [],
  });
};

func.tags = ["PancakeLP"];

export default func;
