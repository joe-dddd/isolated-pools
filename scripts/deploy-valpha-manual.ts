import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const ALPHA = "0xf55B9d4CEBEDF7B871CbBf462fd4F1Cc7F96045B";
  const COMPTROLLER = "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7";
  const VTOKEN_BEACON = "0x7461D15ac1DB42abE22Afcd264B471baEbA44Be0";
  const JUMP_RATE_MODEL = "0xcE3edc2285F4bf9dC9dbf65eE300bf385E27F511"; // 正确地址,从vMockTKN查询
  const ACM = "0x32C58b4Ed4dfB03e7D09C5D50D417639BE63cc0E";
  const PSR = "0x7faa7e637a9aa02E8a5a814F69e73f4288188Ca3";
  const SHORTFALL = "0x0000000000000000000000000000000000000001";

  console.log("Deploying vALPHA manually...\n");

  const VToken = await ethers.getContractFactory("VToken");
  const BeaconProxy = await ethers.getContractFactory("BeaconProxy");

  const vALPHADecimals = 8;
  const alphaExchangeRate = ethers.utils.parseUnits("1", 18 + 18 - vALPHADecimals);
  const alphaReserveFactor = ethers.utils.parseUnits("0.2", 18);

  const initData = VToken.interface.encodeFunctionData("initialize", [
    ALPHA,
    COMPTROLLER,
    JUMP_RATE_MODEL,
    alphaExchangeRate,
    "Venus AlphaToken (Alpha)",
    "vALPHA_Alpha",
    vALPHADecimals,
    deployer.address,
    ACM,
    { shortfall: SHORTFALL, protocolShareReserve: PSR },
    alphaReserveFactor,
  ]);

  console.log("Init data length:", initData.length);
  console.log("Deploying BeaconProxy...\n");

  try {
    const proxy = await BeaconProxy.deploy(VTOKEN_BEACON, initData, {
      gasLimit: 5000000
    });
    await proxy.deployed();
    console.log("✅ vALPHA deployed at:", proxy.address);
  } catch (error: any) {
    console.log("❌ Deployment failed:");
    console.log(error.message);
    if (error.error) {
      console.log("Error data:", error.error.data);
    }
  }
}

main().catch(console.error);
