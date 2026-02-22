import { TEEIdentity } from './src/crypto/signer';
import { ethers } from 'ethers';

// Set Env for test
process.env.MNEMONIC = "test test test test test test test test test test test junk";
process.env.CONTRACT_ADDRESS = "0x7006e886e56426Fbb942B479AC8eF5C47a7531f1";

async function main() {
  console.log("Testing TEEIdentity...");
  const identity = new TEEIdentity();
  const address = identity.getAddress();
  console.log("Address:", address);
  
  if (address !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
    throw new Error("Address mismatch! Expected Hardhat #0");
  }

  const data = {
    user: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    topic: "test-topic",
    score: 100,
    nonce: 1,
    deadline: Math.floor(Date.now()/1000) + 3600
  };

  const signature = await identity.signAttestation(data);
  console.log("Signature:", signature);
  console.log("Length:", signature.length); // Should be 132

  if (signature.length !== 132) throw new Error("Invalid signature length");

  console.log("✅ TEEIdentity Test Passed");
}

main().catch(console.error);
