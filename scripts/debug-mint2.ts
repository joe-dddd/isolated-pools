import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const mockTKNAddr = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const vMockTKNAddr = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";

  const depositAmount = ethers.utils.parseUnits("100", 18);

  const mockTKN = await ethers.getContractAt("MockToken", mockTKNAddr, signer);
  const vMockTKN = await ethers.getContractAt("VToken", vMockTKNAddr, signer);

  // Check accrueInterest
  console.log("Checking accrueInterest...");
  try {
    const accrueResult = await vMockTKN.callStatic.accrueInterest();
    console.log("accrueInterest result:", accrueResult.toString());
  } catch (e: any) {
    console.log("accrueInterest failed:", e.reason || e.message);
  }

  // Manually check interest rate model
  const irm = await vMockTKN.interestRateModel();
  console.log("Interest Rate Model:", irm);

  // Check protocolShareReserve
  const psr = await vMockTKN.protocolShareReserve();
  console.log("ProtocolShareReserve:", psr);

  // Check if PSR is valid
  if (psr !== ethers.constants.AddressZero) {
    try {
      const psrContract = await ethers.getContractAt("IProtocolShareReserve", psr);
      console.log("PSR contract exists");
    } catch (e) {
      console.log("PSR contract check failed");
    }
  }

  // Try accrueInterest tx
  console.log("\nTrying actual accrueInterest...");
  try {
    const tx = await vMockTKN.accrueInterest();
    const receipt = await tx.wait();
    console.log("accrueInterest success:", tx.hash);
  } catch (e: any) {
    console.log("accrueInterest tx failed:", e.reason || e.message);
  }

  // Now try mint
  console.log("\nTrying mint...");
  try {
    const tx = await vMockTKN.mint(depositAmount, { gasLimit: 500000 });
    const receipt = await tx.wait();
    console.log("Mint success:", tx.hash);
  } catch (e: any) {
    console.log("Mint failed:", e.reason || e.message);
    if (e.error?.data) console.log("Error data:", e.error.data);
  }
}

main().catch(console.error);
