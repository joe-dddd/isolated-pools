import { ethers } from "hardhat";

const USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const PANCAKE_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
const PANCAKE_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n=== Deploying MockUSDT/WBNB LP ===");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`MockUSDT: ${USDT}`);
  console.log(`WBNB: ${WBNB}`);

  // Get contracts
  const usdt = await ethers.getContractAt("MockToken", USDT);
  const wbnbAbi = [
    "function deposit() external payable",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
  ];
  const wbnb = new ethers.Contract(WBNB, wbnbAbi, deployer);
  const factory = await ethers.getContractAt(
    ["function createPair(address tokenA, address tokenB) external returns (address pair)", "function getPair(address tokenA, address tokenB) external view returns (address pair)"],
    PANCAKE_FACTORY
  );
  const router = await ethers.getContractAt(
    ["function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)"],
    PANCAKE_ROUTER
  );

  // Check if pair exists
  let pairAddress = await factory.getPair(USDT, WBNB);
  if (pairAddress === ethers.constants.AddressZero) {
    console.log("\nCreating MockUSDT/WBNB pair...");
    const tx = await factory.createPair(USDT, WBNB);
    await tx.wait();
    pairAddress = await factory.getPair(USDT, WBNB);
    console.log(`✅ Pair created: ${pairAddress}`);
  } else {
    console.log(`\n✅ Pair already exists: ${pairAddress}`);
  }

  // Check pair reserves
  const pair = await ethers.getContractAt(
    ["function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)", "function token0() external view returns (address)", "function token1() external view returns (address)"],
    pairAddress
  );
  const reserves = await pair.getReserves();
  console.log(`\nCurrent reserves:`);
  console.log(`  Reserve0: ${ethers.utils.formatUnits(reserves.reserve0, 6)}`);
  console.log(`  Reserve1: ${ethers.utils.formatUnits(reserves.reserve1, 18)}`);

  if (reserves.reserve0.eq(0) || reserves.reserve1.eq(0)) {
    console.log("\n=== Adding Liquidity ===");

    // Mint USDT
    const usdtAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
    console.log(`Minting ${ethers.utils.formatUnits(usdtAmount, 6)} USDT...`);
    const mintTx = await usdt.faucet(usdtAmount);
    await mintTx.wait();

    // Wrap BNB
    const wbnbAmount = ethers.utils.parseUnits("0.1", 18); // 0.1 WBNB
    console.log(`Wrapping ${ethers.utils.formatUnits(wbnbAmount, 18)} BNB...`);
    const wrapTx = await wbnb.deposit({ value: wbnbAmount });
    await wrapTx.wait();

    // Approve router
    console.log(`\nApproving router...`);
    const approveTx1 = await usdt.approve(PANCAKE_ROUTER, usdtAmount);
    await approveTx1.wait();
    const approveTx2 = await wbnb.approve(PANCAKE_ROUTER, wbnbAmount);
    await approveTx2.wait();

    // Add liquidity
    console.log(`\nAdding liquidity...`);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const addLiqTx = await router.addLiquidity(
      USDT,
      WBNB,
      usdtAmount,
      wbnbAmount,
      0,
      0,
      deployer.address,
      deadline
    );
    await addLiqTx.wait();
    console.log(`✅ Liquidity added`);

    // Check new reserves
    const newReserves = await pair.getReserves();
    const token0 = await pair.token0();
    const isUsdtToken0 = token0.toLowerCase() === USDT.toLowerCase();

    console.log(`\nNew reserves:`);
    if (isUsdtToken0) {
      console.log(`  USDT: ${ethers.utils.formatUnits(newReserves.reserve0, 6)}`);
      console.log(`  WBNB: ${ethers.utils.formatUnits(newReserves.reserve1, 18)}`);
    } else {
      console.log(`  WBNB: ${ethers.utils.formatUnits(newReserves.reserve0, 18)}`);
      console.log(`  USDT: ${ethers.utils.formatUnits(newReserves.reserve1, 6)}`);
    }
  } else {
    console.log(`\n✅ LP already has liquidity`);
  }

  console.log("\n=== Deployment Summary ===");
  console.log(`MockUSDT/WBNB LP: ${pairAddress}`);
  console.log(`\nAdd this to bsctestnet.json:`);
  console.log(`"PancakeLPPair_USDT_WBNB": "${pairAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
