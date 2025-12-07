import { ethers } from "hardhat";

const OUR_PSR_ADDRESS = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
const OUR_ACM_ADDRESS = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
const SHORTFALL_ADDRESS = "0x0000000000000000000000000000000000000001";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const comptrollerAlpha = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const vTokenBeacon = "0x7461D15ac1DB42abE22Afcd264B471baEbA44Be0";
  const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
  const poolRegistry = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const jumpRateModel = "0xcE3edc2285F4bf9dC9dbf65eE300bf385E27F511"; // Same as vUSDT

  console.log("Deploying vWBNB to Alpha pool...");
  console.log("Comptroller:", comptrollerAlpha);
  console.log("WBNB:", wbnb);

  const VToken = await ethers.getContractFactory("VToken");
  const BeaconProxy = await ethers.getContractFactory("BeaconProxy");

  const vWBNBDecimals = 8;
  const wbnbExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vWBNBDecimals);
  const wbnbReserveFactor = ethers.utils.parseUnits("0.15", 18);

  const vWBNBInitData = VToken.interface.encodeFunctionData("initialize", [
    wbnb,
    comptrollerAlpha,
    jumpRateModel,
    wbnbExchangeRate,
    "Venus WBNB (Alpha)",
    "vWBNB_Alpha",
    vWBNBDecimals,
    deployer.address,
    OUR_ACM_ADDRESS,
    {
      shortfall: SHORTFALL_ADDRESS,
      protocolShareReserve: OUR_PSR_ADDRESS,
    },
    wbnbReserveFactor,
  ]);

  const vWBNBProxy = await BeaconProxy.deploy(vTokenBeacon, vWBNBInitData);
  await vWBNBProxy.deployed();
  console.log("vWBNB deployed at:", vWBNBProxy.address);

  const acm = await ethers.getContractAt("AccessControlManager", OUR_ACM_ADDRESS);
  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha);

  const addMarketSig = "addMarket(AddMarketInput)";
  const hasAddMarketPerm = await acm.isAllowedToCall(deployer.address, addMarketSig);
  if (!hasAddMarketPerm) {
    console.log("Granting addMarket permission...");
    const tx = await acm.giveCallPermission(poolRegistry, addMarketSig, deployer.address);
    await tx.wait();
  }

  const allMarkets = await comptroller.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (!marketsLower.includes(vWBNBProxy.address.toLowerCase())) {
    console.log("Adding vWBNB to Alpha pool via PoolRegistry...");

    const wbnbInitialSupply = ethers.utils.parseUnits("0.1", 18);

    const wbnbContract = await ethers.getContractAt("IWrappedNative", wbnb);
    const depositTx = await wbnbContract.deposit({ value: wbnbInitialSupply });
    await depositTx.wait();
    console.log("Deposited 0.1 BNB to WBNB");

    const approveTx = await wbnbContract.approve(poolRegistry, wbnbInitialSupply);
    await approveTx.wait();

    const addMarketInput = {
      vToken: vWBNBProxy.address,
      collateralFactor: ethers.utils.parseUnits("0.75", 18),
      liquidationThreshold: ethers.utils.parseUnits("0.8", 18),
      initialSupply: wbnbInitialSupply,
      vTokenReceiver: deployer.address,
      supplyCap: ethers.utils.parseUnits("1000", 18),
      borrowCap: ethers.utils.parseUnits("800", 18),
    };

    const tx = await poolRegistryContract.addMarket(addMarketInput);
    await tx.wait();
    console.log("vWBNB added to Alpha pool");
  }

  console.log("vWBNB deployment complete!");
  console.log("vWBNB address:", vWBNBProxy.address);
}

main().catch(console.error);
