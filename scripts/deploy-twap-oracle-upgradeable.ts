import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Addresses from bsctestnet.json
  const USDT = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";
  const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
  const WBNB_USDT_LP = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";
  const TKN = "0x950cfF4A2d0454B20A07159699A0Df5370751814";
  const TKN_USDT_LP = "0x022b929a39Dd4593F828837b5a7fB3796472Ee85";
  const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

  // 1. Deploy implementation
  console.log("\n1. Deploying PancakeV2TWAPOracle implementation...");
  const OracleImpl = await ethers.getContractFactory("PancakeV2TWAPOracle");
  const impl = await OracleImpl.deploy(USDT, WBNB, WBNB_USDT_LP);
  await impl.deployed();
  console.log("   Implementation:", impl.address);

  // 2. Deploy beacon
  console.log("\n2. Deploying UpgradeableBeacon...");
  const Beacon = await ethers.getContractFactory("UpgradeableBeacon");
  const beacon = await Beacon.deploy(impl.address);
  await beacon.deployed();
  console.log("   Beacon:", beacon.address);

  // 3. Deploy proxy
  console.log("\n3. Deploying BeaconProxy...");
  const initData = impl.interface.encodeFunctionData("initialize");
  const BeaconProxy = await ethers.getContractFactory("BeaconProxy");
  const proxy = await BeaconProxy.deploy(beacon.address, initData);
  await proxy.deployed();
  console.log("   Proxy:", proxy.address);

  // Get oracle instance via proxy
  const oracle = OracleImpl.attach(proxy.address);

  // 4. Add TKN/USDT pair
  console.log("\n4. Adding TKN/USDT pair...");
  const tx1 = await oracle.addPair(TKN, TKN_USDT_LP);
  await tx1.wait();
  console.log("   TKN/USDT pair added");

  // 5. Initialize TWAP for WBNB
  console.log("\n5. Initializing TWAP prices...");
  const tx2 = await oracle.updateAssetPrice(WBNB);
  await tx2.wait();
  console.log("   WBNB price updated");

  const tx3 = await oracle.updateAssetPrice(TKN);
  await tx3.wait();
  console.log("   TKN price updated");

  // 6. Update Comptroller oracle
  console.log("\n6. Updating Comptroller oracle...");
  const comptroller = await ethers.getContractAt("Comptroller", COMPTROLLER);
  const tx4 = await comptroller.setPriceOracle(proxy.address);
  await tx4.wait();
  console.log("   Comptroller oracle updated to:", proxy.address);

  // Verify
  console.log("\n=== Deployment Summary ===");
  console.log("PancakeV2TWAPOracle_Implementation:", impl.address);
  console.log("PancakeV2TWAPOracle_Beacon:", beacon.address);
  console.log("PancakeV2TWAPOracle_Proxy:", proxy.address);
  console.log("Comptroller oracle:", await comptroller.oracle());

  console.log("\n=== JSON snippet for bsctestnet.json ===");
  console.log(JSON.stringify({
    "PancakeV2TWAPOracle_Implementation": impl.address,
    "PancakeV2TWAPOracle_Beacon": beacon.address,
    "PancakeV2TWAPOracle_Proxy": proxy.address
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
