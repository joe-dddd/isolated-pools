import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const oracleAddr = "0x551CFdd2085dcEaaA8982aaa420D8E746B1C958a";
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr, deployer);

  console.log("Setting MockTKN price to 1 USD...");
  const price = ethers.utils.parseUnits("1", 18); // 1 USD

  const tx = await oracle.setDirectPrice(mockTKNAddr, price);
  await tx.wait();

  console.log("Price set!");

  // Verify
  const currentPrice = await oracle.getPrice(mockTKNAddr);
  console.log("Current MockTKN price:", ethers.utils.formatUnits(currentPrice, 18), "USDT");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
