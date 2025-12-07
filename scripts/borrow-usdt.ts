import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  // Addresses from deployment
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const mockUSDTAddr = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const vMockUSDTAddr = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

  const collateralAmount = ethers.utils.parseUnits("100", 18); // 100 TKN (worth $200)
  const borrowAmount = ethers.utils.parseUnits("100", 6); // 100 USDT (6 decimals)

  console.log("=== Borrow 100 USDT from Alpha Pool ===");
  console.log("Signer:", signer.address);
  console.log("Collateral: 100 TKN (worth $200)");
  console.log("Borrow: 100 USDT");
  console.log();

  // Get contracts
  const mockTKN = await ethers.getContractAt("MockToken", mockTKNAddr, signer);
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);
  const mockUSDT = await ethers.getContractAt("MockToken", mockUSDTAddr, signer);
  const vMockUSDT = await ethers.getContractAt("VToken", vMockUSDTAddr, signer);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr, signer);

  // Check TKN balance
  const tknBal = await mockTKN.balanceOf(signer.address);
  console.log("Current TKN balance:", ethers.utils.formatUnits(tknBal, 18));

  // Mint TKN if needed
  if (tknBal.lt(collateralAmount)) {
    console.log("\nMinting TKN via faucet...");
    const faucetTx = await mockTKN.faucet(collateralAmount);
    await faucetTx.wait();
    console.log("Faucet tx:", faucetTx.hash);
  }

  // Approve & supply TKN as collateral
  console.log("\n=== Step 1: Supply TKN as Collateral ===");
  console.log("Approving vToken...");
  const approveTx = await mockTKN.approve(vMockTKNAddr, collateralAmount);
  await approveTx.wait();
  console.log("Approve tx:", approveTx.hash);

  console.log("Depositing TKN...");
  const mintTx = await vMockTKN.mint(collateralAmount);
  await mintTx.wait();
  console.log("Mint tx:", mintTx.hash);

  const vTknBal = await vMockTKN.balanceOf(signer.address);
  console.log("vTKN balance:", ethers.utils.formatUnits(vTknBal, 8));

  // Enter market if not already
  console.log("\n=== Step 2: Enable TKN as Collateral ===");
  const assetsIn = await comptroller.getAssetsIn(signer.address);
  if (!assetsIn.includes(vMockTKNAddr)) {
    console.log("Entering vMockTKN market...");
    const enterTx = await comptroller.enterMarkets([vMockTKNAddr]);
    await enterTx.wait();
    console.log("Enter markets tx:", enterTx.hash);
  } else {
    console.log("Already in vMockTKN market");
  }

  // Check liquidity
  console.log("\n=== Account Liquidity Before Borrow ===");
  const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(signer.address);
  console.log("Error:", error.toString());
  console.log("Liquidity:", ethers.utils.formatUnits(liquidity, 18), "USD");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall, 18), "USD");

  // Check USDT balance before borrow
  const usdtBalBefore = await mockUSDT.balanceOf(signer.address);
  console.log("USDT balance before:", ethers.utils.formatUnits(usdtBalBefore, 6));

  // Borrow USDT
  console.log("\n=== Step 3: Borrow 100 USDT ===");
  const borrowTx = await vMockUSDT.borrow(borrowAmount);
  await borrowTx.wait();
  console.log("Borrow tx:", borrowTx.hash);

  // Check balances after
  console.log("\n=== Balances After Borrow ===");
  const usdtBalAfter = await mockUSDT.balanceOf(signer.address);
  console.log("USDT balance:", ethers.utils.formatUnits(usdtBalAfter, 6));
  console.log("USDT borrowed:", ethers.utils.formatUnits(usdtBalAfter.sub(usdtBalBefore), 6));

  // Check liquidity after
  const [error2, liquidity2, shortfall2] = await comptroller.getAccountLiquidity(signer.address);
  console.log("\n=== Account Liquidity After Borrow ===");
  console.log("Error:", error2.toString());
  console.log("Liquidity remaining:", ethers.utils.formatUnits(liquidity2, 18), "USD");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall2, 18), "USD");

  console.log("\n✅ Borrow complete!");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
