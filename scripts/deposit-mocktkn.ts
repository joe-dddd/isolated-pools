import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  // Addresses from deployment
  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

  const depositAmount = ethers.utils.parseUnits("100", 18); // 100 TKN, 18 decimals

  console.log("=== Deposit 100 MockTKN to Alpha Pool ===");
  console.log("Signer:", signer.address);
  console.log("MockTKN:", mockTKNAddr);
  console.log("vMockTKN:", vMockTKNAddr);
  console.log("Amount:", ethers.utils.formatUnits(depositAmount, 18), "TKN");
  console.log();

  // Get contracts
  const mockTKN = await ethers.getContractAt("MockToken", mockTKNAddr, signer);
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr, signer);

  // Check balance before
  const balBefore = await mockTKN.balanceOf(signer.address);
  console.log("TKN balance before:", ethers.utils.formatUnits(balBefore, 18));

  // Mint tokens if needed
  if (balBefore.lt(depositAmount)) {
    console.log("\nMinting tokens via faucet...");
    const faucetTx = await mockTKN.faucet(depositAmount);
    await faucetTx.wait();
    console.log("Faucet tx:", faucetTx.hash);
  }

  // Approve vToken to spend
  console.log("\nApproving vToken to spend TKN...");
  const approveTx = await mockTKN.approve(vMockTKNAddr, depositAmount);
  await approveTx.wait();
  console.log("Approve tx:", approveTx.hash);

  // Check allowance
  const allowance = await mockTKN.allowance(signer.address, vMockTKNAddr);
  console.log("Allowance:", ethers.utils.formatUnits(allowance, 18));

  // Mint vTokens (deposit)
  console.log("\nDepositing to vMockTKN...");
  const mintTx = await vMockTKN.mint(depositAmount);
  const mintReceipt = await mintTx.wait();
  console.log("Mint tx:", mintTx.hash);
  console.log("Gas used:", mintReceipt.gasUsed.toString());

  // Check balances after
  console.log("\n=== Balances After ===");
  const tknBalAfter = await mockTKN.balanceOf(signer.address);
  const vTknBal = await vMockTKN.balanceOf(signer.address);
  console.log("TKN balance:", ethers.utils.formatUnits(tknBalAfter, 18));
  console.log("vTKN balance:", ethers.utils.formatUnits(vTknBal, 8)); // vTokens have 8 decimals

  // Check if already entered market, enter if not
  const assetsIn = await comptroller.getAssetsIn(signer.address);
  if (!assetsIn.includes(vMockTKNAddr)) {
    console.log("\nEntering vMockTKN market as collateral...");
    const enterTx = await comptroller.enterMarkets([vMockTKNAddr]);
    await enterTx.wait();
    console.log("Enter markets tx:", enterTx.hash);
  } else {
    console.log("\nAlready in vMockTKN market");
  }

  // Check liquidity
  console.log("\n=== Account Liquidity ===");
  const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(signer.address);
  console.log("Error:", error.toString());
  console.log("Liquidity:", ethers.utils.formatUnits(liquidity, 18), "USD");
  console.log("Shortfall:", ethers.utils.formatUnits(shortfall, 18), "USD");

  console.log("\n✅ Deposit complete!");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
