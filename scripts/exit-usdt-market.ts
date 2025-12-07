import { ethers } from "hardhat";

async function main() {
  const comptrollerAddress = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const vUSDTAddress = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
  const usdtAddress = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";

  // Use TEST_ACCOUNT_PRIVATE_KEY
  const testPrivateKey = process.env.TEST_ACCOUNT_PRIVATE_KEY;
  if (!testPrivateKey) {
    throw new Error("TEST_ACCOUNT_PRIVATE_KEY not set in .env");
  }
  const testWallet = new ethers.Wallet(`0x${testPrivateKey}`, ethers.provider);
  console.log("Using account:", testWallet.address);

  const comptroller = (await ethers.getContractAt("Comptroller", comptrollerAddress)).connect(testWallet);
  const vUSDT = (await ethers.getContractAt("VToken", vUSDTAddress)).connect(testWallet);
  const usdt = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", usdtAddress)).connect(testWallet);

  // Check current markets
  const marketsBefore = await comptroller.getAssetsIn(testWallet.address);
  console.log("Markets before exit:", marketsBefore);

  // Check borrow balance
  const borrowBalance = await vUSDT.borrowBalanceStored(testWallet.address);
  console.log("Borrow balance:", ethers.utils.formatUnits(borrowBalance, 6), "USDT");

  // Check supply balance
  const vTokenBalance = await vUSDT.balanceOf(testWallet.address);
  console.log("vUSDT balance:", ethers.utils.formatUnits(vTokenBalance, 8));

  // If has borrow, repay first
  if (borrowBalance.gt(0)) {
    console.log("Repaying borrow...");
    // Approve USDT
    const repayAmount = borrowBalance.mul(101).div(100); // 1% buffer for interest
    const usdtBal = await usdt.balanceOf(testWallet.address);
    console.log("USDT balance:", ethers.utils.formatUnits(usdtBal, 6));

    if (usdtBal.lt(repayAmount)) {
      // Mint more USDT using faucet
      const mockUsdt = (await ethers.getContractAt("MockToken", usdtAddress)).connect(testWallet);
      console.log("Minting USDT via faucet...");
      const mintTx = await mockUsdt.faucet(repayAmount.sub(usdtBal));
      await mintTx.wait();
    }

    const approveTx = await usdt.approve(vUSDTAddress, ethers.constants.MaxUint256);
    await approveTx.wait();
    console.log("Approved USDT");

    // Repay borrow - use max uint for full repay
    const repayTx = await vUSDT.repayBorrow(ethers.constants.MaxUint256);
    await repayTx.wait();
    console.log("Repaid borrow");
  }

  // Exit USDT market
  console.log("Exiting vMockUSDT market...");
  const tx = await comptroller.exitMarket(vUSDTAddress);
  const receipt = await tx.wait();
  console.log("Tx hash:", receipt.transactionHash);

  // Check markets after
  const marketsAfter = await comptroller.getAssetsIn(testWallet.address);
  console.log("Markets after exit:", marketsAfter);

  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
