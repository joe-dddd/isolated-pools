import { ethers } from "hardhat";

const COMPTROLLER_ALPHA = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const VTOKEN_MOCKTKN_ALPHA = "0xA5DCDa04E2bF2Ab8800601C656F20BF299DC8A24";
const ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER_ALPHA);
  const acm = await ethers.getContractAt("AccessControlManager", ACM_ADDRESS);

  // Grant permission if needed
  const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
  const hasPerm = await acm.isAllowedToCall(deployer.address, setCollateralSig);
  if (!hasPerm) {
    console.log("Granting setCollateralFactor permission...");
    const tx = await acm.giveCallPermission(COMPTROLLER_ALPHA, setCollateralSig, deployer.address);
    await tx.wait();
    console.log("Permission granted");
  }

  // Get current values
  const market = await comptroller.markets(VTOKEN_MOCKTKN_ALPHA);
  console.log("\nCurrent MockTKN market:");
  console.log("  collateralFactorMantissa:", ethers.utils.formatUnits(market.collateralFactorMantissa, 18));
  console.log("  liquidationThresholdMantissa:", ethers.utils.formatUnits(market.liquidationThresholdMantissa, 18));

  // Update collateralFactor to 0
  const newCollateralFactor = ethers.utils.parseUnits("0", 18);
  const liquidationThreshold = ethers.utils.parseUnits("0.7", 18); // keep same

  console.log("\nSetting collateralFactor to 0...");
  const tx = await comptroller.setCollateralFactor(VTOKEN_MOCKTKN_ALPHA, newCollateralFactor, liquidationThreshold);
  await tx.wait();
  console.log("✓ Updated");

  // Verify
  const updated = await comptroller.markets(VTOKEN_MOCKTKN_ALPHA);
  console.log("\nNew values:");
  console.log("  collateralFactorMantissa:", ethers.utils.formatUnits(updated.collateralFactorMantissa, 18));
  console.log("  liquidationThresholdMantissa:", ethers.utils.formatUnits(updated.liquidationThresholdMantissa, 18));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
