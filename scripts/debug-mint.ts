import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
  const comptrollerAddr = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

  const depositAmount = ethers.utils.parseUnits("100", 18);

  const mockTKN = await ethers.getContractAt("MockToken", mockTKNAddr, signer);
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAddr, signer);

  console.log("Signer:", signer.address);
  console.log("Amount:", ethers.utils.formatUnits(depositAmount, 18), "TKN");

  // Check allowance
  const allowance = await mockTKN.allowance(signer.address, vMockTKNAddr);
  console.log("Allowance:", ethers.utils.formatUnits(allowance, 18));

  // Check balance
  const bal = await mockTKN.balanceOf(signer.address);
  console.log("TKN Balance:", ethers.utils.formatUnits(bal, 18));

  // Check vToken underlying
  const underlying = await vMockTKN.underlying();
  console.log("vToken underlying:", underlying);
  console.log("Expected underlying:", mockTKNAddr);
  console.log("Match:", underlying.toLowerCase() === mockTKNAddr.toLowerCase());

  // Check market
  const [isListed, cf] = await comptroller.markets(vMockTKNAddr);
  console.log("Market isListed:", isListed);
  console.log("Market CF:", cf.toString());

  // Check supply cap
  const supplyCap = await comptroller.supplyCaps(vMockTKNAddr);
  console.log("Supply Cap:", ethers.utils.formatUnits(supplyCap, 18));

  // Check current total supply
  const totalSupply = await vMockTKN.totalSupply();
  console.log("Current vToken totalSupply:", ethers.utils.formatUnits(totalSupply, 8));

  // Check exchange rate
  const exchangeRate = await vMockTKN.callStatic.exchangeRateCurrent();
  console.log("Exchange Rate:", exchangeRate.toString());

  // Try static call to see error
  console.log("\nTrying static call mint...");
  try {
    const result = await vMockTKN.callStatic.mint(depositAmount);
    console.log("Static call success, result:", result.toString());
  } catch (e: any) {
    console.log("Static call failed:", e.reason || e.message);
    if (e.data) console.log("Error data:", e.data);
  }
}

main().catch(console.error);
