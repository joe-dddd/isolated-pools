import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const oracleAddr = "0x83995f5c5fEd8A10551e380d9f987b5572f8A1e5";
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";

  const oracle = await ethers.getContractAt("PancakeV2TWAPOracle", oracleAddr, deployer);

  console.log("Setting MockTKN direct price to 1 USD...");

  // Set price to 1 USD (18 decimals)
  const price = ethers.utils.parseUnits("1", 18);

  const tx = await oracle.setDirectPrice(mockTKNAddr, price);
  await tx.wait();

  console.log("Direct price set!");

  // Verify via getPrice
  const directPrice = await oracle.getPrice(mockTKNAddr);
  console.log("getPrice (raw):", ethers.utils.formatUnits(directPrice, 18), "USD");

  // Verify via getUnderlyingPrice
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const underlyingPrice = await oracle.getUnderlyingPrice(vMockTKNAddr);
  console.log("getUnderlyingPrice (Compound format):", ethers.utils.formatUnits(underlyingPrice, 18));
  console.log("  (should be 1.0 for 18-decimal token)");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
