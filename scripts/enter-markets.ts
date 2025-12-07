import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

  console.log("Signer:", signer.address);
  console.log("Comptroller:", comptrollerAddr);
  console.log();

  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr, signer);

  // Check current markets
  const assetsInBefore = await comptroller.getAssetsIn(signer.address);
  console.log("Markets before:", assetsInBefore);

  // Enter markets
  const marketsToEnter = [vMockUSDTAddr, vMockTKNAddr];
  console.log("\nEntering markets:");
  console.log("  - vMockUSDT:", vMockUSDTAddr);
  console.log("  - vMockTKN:", vMockTKNAddr);

  const tx = await comptroller.enterMarkets(marketsToEnter);
  console.log("\nTransaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed!");

  // Check markets after
  const assetsInAfter = await comptroller.getAssetsIn(signer.address);
  console.log("\nMarkets after:", assetsInAfter);

  // Check liquidity
  console.log("\n=== Account Liquidity ===");
  const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(signer.address);
  console.log("Error:", error.toString());
  console.log("Liquidity:", ethers.utils.formatUnits(liquidity, 18), "USD");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall, 18), "USD");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
