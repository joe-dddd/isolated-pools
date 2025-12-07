import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    throw new Error("No signers available. Set DEPLOYER_PRIVATE_KEY in .env");
  }

  const signer = signers[0];
  const wbnbAddress = "0x68Be016Ab114E017256E855241cd2F70d4eFbd39";

  const wbnb = await ethers.getContractAt("WrappedNative", wbnbAddress, signer);

  const amountToWrap = ethers.utils.parseEther("0.1");

  console.log(`Wrapping 0.1 BNB to WBNB...`);
  console.log(`Signer: ${signer.address}`);
  console.log(`WBNB: ${wbnbAddress}`);

  const tx = await wbnb.deposit({ value: amountToWrap });
  console.log(`Transaction hash: ${tx.hash}`);

  await tx.wait();
  console.log(`✓ Wrapped successfully`);

  const balance = await wbnb.balanceOf(signer.address);
  console.log(`WBNB balance: ${ethers.utils.formatEther(balance)} WBNB`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
