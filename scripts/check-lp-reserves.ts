import { ethers } from "hardhat";

const WBNB_USDT_LP = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";

async function main() {
  console.log("\n=== Checking LP Reserves ===");
  console.log(`LP: ${WBNB_USDT_LP}`);

  const pairAbi = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function price0CumulativeLast() external view returns (uint)",
    "function price1CumulativeLast() external view returns (uint)"
  ];

  const pair = new ethers.Contract(WBNB_USDT_LP, pairAbi, ethers.provider);

  const token0 = await pair.token0();
  const token1 = await pair.token1();
  const reserves = await pair.getReserves();

  console.log(`\nToken0: ${token0}`);
  console.log(`Token1: ${token1}`);
  console.log(`Reserve0: ${reserves.reserve0.toString()}`);
  console.log(`Reserve1: ${reserves.reserve1.toString()}`);
  console.log(`Block timestamp: ${reserves.blockTimestampLast}`);

  if (reserves.reserve0.eq(0) || reserves.reserve1.eq(0)) {
    console.log("\n❌ LP has no liquidity!");
  } else {
    console.log("\n✅ LP has liquidity");
  }

  try {
    const price0Cumulative = await pair.price0CumulativeLast();
    const price1Cumulative = await pair.price1CumulativeLast();
    console.log(`\nPrice0 Cumulative: ${price0Cumulative.toString()}`);
    console.log(`Price1 Cumulative: ${price1Cumulative.toString()}`);
  } catch (e) {
    console.log("\n❌ Failed to get cumulative prices:", (e as Error).message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
