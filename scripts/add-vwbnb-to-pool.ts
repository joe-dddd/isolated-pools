import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const oracle = "0xa29fb7cc0a1960b6fd6936F68921d96f9B86e40E";
  const wbnb = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
  const vWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";
  const poolRegistry = "0x1A7F90252A8c9fF1e858562f96DfF00E553F1A88";
  const comptrollerAlpha = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";

  // Check current WBNB price
  const oracleContract = await ethers.getContractAt("PancakeV2TWAPOracle", oracle);

  try {
    const price = await oracleContract.getPrice(wbnb);
    console.log("WBNB price already set:", ethers.utils.formatUnits(price, 18));
  } catch (e) {
    console.log("WBNB price not set, need to add WBNB/USDT LP pair");

    // WBNB/USDT LP pair exists: 0x4eBde5b09185201f0A0C151009E2fAD7540A7860
    const lpPair = "0x4eBde5b09185201f0A0C151009E2fAD7540A7860";
    const usdt = "0x26c32B548a2E0323Dac85D290fC067c18DC3d9ba";

    // Add WBNB to oracle (WBNB/USDT pair)
    const tx = await oracleContract.addPair(wbnb, usdt, lpPair);
    await tx.wait();
    console.log("Added WBNB/USDT pair to oracle");

    const newPrice = await oracleContract.getPrice(wbnb);
    console.log("WBNB price:", ethers.utils.formatUnits(newPrice, 18));
  }

  // Now add vWBNB to pool
  console.log("\nAdding vWBNB to Alpha pool...");

  const poolRegistryContract = await ethers.getContractAt("PoolRegistry", poolRegistry);
  const comptroller = await ethers.getContractAt("Comptroller", comptrollerAlpha);

  const allMarkets = await comptroller.getAllMarkets();
  const marketsLower = allMarkets.map((m: string) => m.toLowerCase());

  if (marketsLower.includes(vWBNB.toLowerCase())) {
    console.log("vWBNB already in pool");
    return;
  }

  const wbnbInitialSupply = ethers.utils.parseUnits("0.1", 18);

  const wbnbContract = await ethers.getContractAt("IWrappedNative", wbnb);
  const balance = await wbnbContract.balanceOf(deployer.address);
  console.log("Current WBNB balance:", ethers.utils.formatUnits(balance, 18));

  if (balance.lt(wbnbInitialSupply)) {
    console.log("Depositing BNB to WBNB...");
    const depositTx = await wbnbContract.deposit({ value: wbnbInitialSupply.sub(balance) });
    await depositTx.wait();
  }

  const approveTx = await wbnbContract.approve(poolRegistry, wbnbInitialSupply);
  await approveTx.wait();
  console.log("Approved PoolRegistry to spend WBNB");

  const addMarketInput = {
    vToken: vWBNB,
    collateralFactor: ethers.utils.parseUnits("0.75", 18),
    liquidationThreshold: ethers.utils.parseUnits("0.8", 18),
    initialSupply: wbnbInitialSupply,
    vTokenReceiver: deployer.address,
    supplyCap: ethers.utils.parseUnits("1000", 18),
    borrowCap: ethers.utils.parseUnits("800", 18),
  };

  const tx = await poolRegistryContract.addMarket(addMarketInput);
  await tx.wait();
  console.log("vWBNB added to Alpha pool!");

  // Verify
  const newMarkets = await comptroller.getAllMarkets();
  console.log("\nAll markets in Alpha pool:");
  for (const market of newMarkets) {
    const vToken = await ethers.getContractAt("VToken", market);
    const symbol = await vToken.symbol();
    console.log(`  - ${symbol}: ${market}`);
  }
}

main().catch(console.error);
