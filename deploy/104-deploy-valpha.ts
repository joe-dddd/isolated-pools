import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n=== Deploying vALPHA ===");

  // Get addresses
  const vTokenBeacon = await get("VTokenBeacon");
  const comptroller = await get("Comptroller_Alpha");
  const alphaToken = await get("AlphaToken");
  const poolRegistry = await get("PoolRegistry_Proxy");

  // Hardcode JumpRateModel with correct checksum (deployment file has wrong checksum)
  const jumpRateModelAddress = "0xc5f83De7e31bdB07057f98D2c5f05f0b2B3D55a4";

  const VToken = await ethers.getContractFactory("VToken");

  // vALPHA (18 decimals)
  const vALPHADecimals = 8;
  const alphaExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vALPHADecimals); // 10^28
  const alphaReserveFactor = ethers.utils.parseUnits("0.2", 18); // 20%

  const vALPHAInitData = VToken.interface.encodeFunctionData("initialize", [
    alphaToken.address,
    comptroller.address,
    jumpRateModelAddress,
    alphaExchangeRate,
    "Venus AlphaToken (Alpha)",
    "vALPHA_Alpha",
    vALPHADecimals,
    deployer,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    alphaReserveFactor,
  ]);

  const vALPHA = await deploy("VToken_vALPHA_Alpha", {
    contract: "BeaconProxy",
    from: deployer,
    args: [vTokenBeacon.address, vALPHAInitData],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
  console.log("vALPHA deployed at:", vALPHA.address);

  // Add market to pool
  const alphaTokenContract = await ethers.getContractAt("MockToken", alphaToken.address);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry.address);
  const comptrollerContract = await ethers.getContractAt("Comptroller", comptroller.address);

  const allMarkets = await comptrollerContract.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (!marketsLower.includes(vALPHA.address.toLowerCase())) {
    console.log("Adding vALPHA to Alpha Pool...");

    // Grant ACM permissions
    const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);

    const setCollateralSig = "setCollateralFactor(address,uint256,uint256)";
    const hasCollateral = await acm.isAllowedToCall(poolRegistry.address, setCollateralSig);
    if (!hasCollateral) {
      console.log("Granting setCollateralFactor permission...");
      const tx = await acm.giveCallPermission(comptroller.address, setCollateralSig, poolRegistry.address);
      await tx.wait();
    }

    const setSupplyCapsSig = "setMarketSupplyCaps(address[],uint256[])";
    const hasSupplyCaps = await acm.isAllowedToCall(poolRegistry.address, setSupplyCapsSig);
    if (!hasSupplyCaps) {
      console.log("Granting setMarketSupplyCaps permission...");
      const tx = await acm.giveCallPermission(comptroller.address, setSupplyCapsSig, poolRegistry.address);
      await tx.wait();
    }

    const setBorrowCapsSig = "setMarketBorrowCaps(address[],uint256[])";
    const hasBorrowCaps = await acm.isAllowedToCall(poolRegistry.address, setBorrowCapsSig);
    if (!hasBorrowCaps) {
      console.log("Granting setMarketBorrowCaps permission...");
      const tx = await acm.giveCallPermission(comptroller.address, setBorrowCapsSig, poolRegistry.address);
      await tx.wait();
    }

    const initialSupply = ethers.utils.parseUnits("1000", 18); // 1000 ALPHA
    await alphaTokenContract.approve(poolRegistry.address, initialSupply);

    const tx = await poolRegistryContract.addMarket({
      vToken: vALPHA.address,
      collateralFactor: ethers.utils.parseUnits("0.6", 18), // 60%
      liquidationThreshold: ethers.utils.parseUnits("0.7", 18), // 70%
      initialSupply: initialSupply,
      vTokenReceiver: deployer,
      supplyCap: ethers.utils.parseUnits("10000000", 18),
      borrowCap: ethers.utils.parseUnits("8000000", 18),
    });
    await tx.wait();
    console.log("vALPHA added to pool");
  }

  console.log("\n=== vALPHA Complete ===");
  console.log("vALPHA:", vALPHA.address);
};

func.tags = ["vALPHA"];
func.dependencies = ["AlphaToken"];

export default func;
