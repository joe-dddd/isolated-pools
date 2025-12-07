import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);

  // Get all relevant state
  console.log("=== VToken State ===");
  
  const cash = await vMockTKN.getCash();
  const borrows = await vMockTKN.totalBorrows();
  const reserves = await vMockTKN.totalReserves();
  const badDebt = await vMockTKN.badDebt();
  const accrualBlock = await vMockTKN.accrualBlockNumber();
  const borrowIndex = await vMockTKN.borrowIndex();
  const reserveFactor = await vMockTKN.reserveFactorMantissa();
  
  console.log("cash:", ethers.utils.formatUnits(cash, 18));
  console.log("borrows:", ethers.utils.formatUnits(borrows, 18));
  console.log("reserves:", ethers.utils.formatUnits(reserves, 18));
  console.log("badDebt:", ethers.utils.formatUnits(badDebt, 18));
  console.log("accrualBlockNumber:", accrualBlock.toString());
  console.log("borrowIndex:", borrowIndex.toString());
  console.log("reserveFactor:", reserveFactor.toString());

  // Check IRM directly
  const irmAddr = await vMockTKN.interestRateModel();
  console.log("\n=== IRM Check ===");
  console.log("IRM:", irmAddr);

  const irm = await ethers.getContractAt("JumpRateModelV2", irmAddr, signer);
  
  try {
    const borrowRate = await irm.getBorrowRate(cash, borrows, reserves, badDebt);
    console.log("borrowRate:", borrowRate.toString());
    
    // Calculate interest
    const currentBlock = await ethers.provider.getBlockNumber();
    const blockDelta = currentBlock - accrualBlock.toNumber();
    console.log("blockDelta:", blockDelta);
    
    // simpleInterestFactor = borrowRate * blockDelta
    const simpleInterestFactor = borrowRate.mul(blockDelta);
    console.log("simpleInterestFactor:", simpleInterestFactor.toString());
    
    // interestAccumulated = simpleInterestFactor * totalBorrows / 1e18
    const interestAccumulated = simpleInterestFactor.mul(borrows).div(ethers.utils.parseUnits("1", 18));
    console.log("interestAccumulated:", interestAccumulated.toString());
    
  } catch (e: any) {
    console.log("IRM call failed:", e.message);
  }

  // Check PSR
  const psr = await vMockTKN.protocolShareReserve();
  console.log("\n=== PSR Check ===");
  console.log("PSR:", psr);

  // Test PSR updateAssetsState
  if (psr !== ethers.constants.AddressZero) {
    const psrInterface = new ethers.utils.Interface([
      "function getPoolAssetReserve(address comptroller, address asset) view returns (uint256)"
    ]);
    const psrContract = new ethers.Contract(psr, psrInterface, signer);
    
    const comptroller = await vMockTKN.comptroller();
    const underlying = await vMockTKN.underlying();
    
    try {
      const poolReserve = await psrContract.getPoolAssetReserve(comptroller, underlying);
      console.log("Pool reserve in PSR:", poolReserve.toString());
    } catch (e: any) {
      console.log("getPoolAssetReserve failed:", e.message);
    }
  }

  // Try to estimate gas for accrueInterest
  console.log("\n=== Gas Estimation ===");
  try {
    const gas = await vMockTKN.estimateGas.accrueInterest();
    console.log("Estimated gas:", gas.toString());
  } catch (e: any) {
    console.log("Gas estimation failed:", e.reason || e.message);
  }
}

main().catch(console.error);
