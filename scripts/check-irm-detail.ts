import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);

  const irmAddr = await vMockTKN.interestRateModel();
  console.log("IRM address:", irmAddr);

  // Check IRM from deployment
  const expectedIRM = "0xC5f83de7E31BDb07057F98d2c5f05f0B2b3D55a4";
  console.log("Expected IRM:", expectedIRM);
  console.log("Match:", irmAddr.toLowerCase() === expectedIRM.toLowerCase());

  // Try to get borrow rate
  const irm = await ethers.getContractAt("JumpRateModelV2", irmAddr, signer);
  
  const cash = await vMockTKN.getCash();
  const borrows = await vMockTKN.totalBorrows();
  const reserves = await vMockTKN.totalReserves();
  const badDebt = await vMockTKN.badDebt();

  console.log("\nVToken state:");
  console.log("Cash:", ethers.utils.formatUnits(cash, 18));
  console.log("Borrows:", ethers.utils.formatUnits(borrows, 18));
  console.log("Reserves:", ethers.utils.formatUnits(reserves, 18));
  console.log("BadDebt:", ethers.utils.formatUnits(badDebt, 18));

  console.log("\nTrying getBorrowRate...");
  try {
    const borrowRate = await irm.getBorrowRate(cash, borrows, reserves, badDebt);
    console.log("Borrow rate:", borrowRate.toString());
  } catch (e: any) {
    console.log("getBorrowRate failed:", e.reason || e.message);
  }

  console.log("\nTrying getSupplyRate...");
  try {
    const supplyRate = await irm.getSupplyRate(cash, borrows, reserves, 0, badDebt);
    console.log("Supply rate:", supplyRate.toString());
  } catch (e: any) {
    console.log("getSupplyRate failed:", e.reason || e.message);
  }

  // Check accrualBlockNumber
  const accrualBlock = await vMockTKN.accrualBlockNumber();
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("\nAccrual block:", accrualBlock.toString());
  console.log("Current block:", currentBlock);
}

main().catch(console.error);
