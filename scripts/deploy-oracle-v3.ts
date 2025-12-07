import { ethers } from "hardhat";

const USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"; // Real testnet WBNB
const WBNB_USDT_LP = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";

async function main() {
  console.log("\n=== Deploying PancakeV2TWAPOracle v3 ===");
  console.log(`USDT: ${USDT}`);
  console.log(`WBNB: ${WBNB}`);
  console.log(`WBNB/USDT LP: ${WBNB_USDT_LP}`);

  // Deploy oracle
  const OracleFactory = await ethers.getContractFactory("PancakeV2TWAPOracle");
  console.log("\nDeploying PancakeV2TWAPOracle...");
  const oracle = await OracleFactory.deploy(USDT, WBNB, WBNB_USDT_LP);
  await oracle.deployed();

  console.log(`✅ PancakeV2TWAPOracle deployed: ${oracle.address}`);

  // Verify WBNB/USDT pair was added in constructor
  const wbnbPair = await oracle.assetToPair(WBNB);
  console.log(`\nWBNB pair in oracle: ${wbnbPair}`);
  console.log(`Expected: ${WBNB_USDT_LP}`);
  console.log(`WBNB/USDT pair added: ${wbnbPair === WBNB_USDT_LP ? "✅" : "❌"}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`PancakeV2TWAPOracle: ${oracle.address}`);
  console.log(`\nAdd this to bsctestnet.json:`);
  console.log(`"PancakeV2TWAPOracle": "${oracle.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
