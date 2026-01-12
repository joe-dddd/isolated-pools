import { ethers } from "hardhat";

const COMPTROLLER_ALPHA = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
const VTOKEN_MOCKUSDT_ALPHA = "0xB063b1748dBF78e79B99094c9F81f3c15989CCca";
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
  const market = await comptroller.markets(VTOKEN_MOCKUSDT_ALPHA);
  console.log("\nCurrent MockUSDT market:");
  console.log("  collateralFactorMantissa:", ethers.utils.formatUnits(market.collateralFactorMantissa, 18));
  console.log("  liquidationThresholdMantissa:", ethers.utils.formatUnits(market.liquidationThresholdMantissa, 18));

  // Update collateralFactor to 80% while keeping the current liquidation threshold
  const newCollateralFactor = ethers.utils.parseUnits("0.8", 18);
  const liquidationThreshold = market.liquidationThresholdMantissa;

  if (liquidationThreshold.lt(newCollateralFactor)) {
    throw new Error("liquidationThreshold < newCollateralFactor; update the liquidation threshold first");
  }

  console.log("\nSetting collateralFactor to 0.8...");
  const tx = await comptroller.setCollateralFactor(VTOKEN_MOCKUSDT_ALPHA, newCollateralFactor, liquidationThreshold);
  await tx.wait();
  console.log("✓ Updated");

  // Verify
  const updated = await comptroller.markets(VTOKEN_MOCKUSDT_ALPHA);
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
