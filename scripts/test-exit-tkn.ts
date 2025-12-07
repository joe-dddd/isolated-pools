import { ethers } from "hardhat";

async function main() {
  const testPrivateKey = process.env.TEST_ACCOUNT_PRIVATE_KEY;
  if (!testPrivateKey) throw new Error("TEST_ACCOUNT_PRIVATE_KEY not set");

  const testWallet = new ethers.Wallet(`0x${testPrivateKey}`, ethers.provider);
  console.log("Wallet:", testWallet.address);

  const comptroller = (await ethers.getContractAt("Comptroller", "0x3d0EfaB08A8DD69a6B5181929656eB7f84d90bA7")).connect(testWallet);
  const vWBNB = "0x6Fa7E56CCD53f17BF0FeA173756B3766Eb4EEA97";

  console.log("Current assets in:", await comptroller.getAssetsIn(testWallet.address));

  console.log("Attempting exitMarket for vWBNB...");
  const tx = await comptroller.exitMarket(vWBNB);
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Success! Status:", receipt.status);

  console.log("Assets after exit:", await comptroller.getAssetsIn(testWallet.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
