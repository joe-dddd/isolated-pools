import { ethers } from "hardhat";

async function main() {
  console.log("\n=== Checking Token Addresses ===");

  const OUR_WBNB = "0x68Be016Ab114E017256E855241cd2F70d4eFbd39";
  const REAL_WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
  const USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const WBNB_USDT_LP = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";

  console.log(`Our deployed WBNB: ${OUR_WBNB}`);
  console.log(`Real testnet WBNB: ${REAL_WBNB}`);
  console.log(`USDT: ${USDT}`);
  console.log(`WBNB/USDT LP: ${WBNB_USDT_LP}`);

  // Check LP composition
  const pairAbi = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
  ];
  const pair = new ethers.Contract(WBNB_USDT_LP, pairAbi, ethers.provider);
  const token0 = await pair.token0();
  const token1 = await pair.token1();

  console.log(`\nLP Token0: ${token0}`);
  console.log(`LP Token1: ${token1}`);

  console.log(`\n✅ Solution: Use REAL_WBNB = ${REAL_WBNB} for deployment`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
