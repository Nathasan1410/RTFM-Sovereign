import { TEEIdentity } from '../src/crypto/signer';
import { ethers } from 'ethers';

// Mock Env
process.env.MNEMONIC = "test test test test test test test test test test test junk";
process.env.CONTRACT_ADDRESS = "0x7006e886e56426Fbb942B479AC8eF5C47a7531f1";

const DOMAIN = {
  name: "RTFM-Sovereign",
  version: "1",
  chainId: 11155111,
  verifyingContract: process.env.CONTRACT_ADDRESS
};

const TYPES = {
  Attestation: [
    { name: "user", type: "address" },
    { name: "topic", type: "string" },
    { name: "score", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

async function runTest() {
  console.log("Running TEEIdentity Crypto Test...");
  const identity = new TEEIdentity();
  const address = identity.getAddress();
  console.log(`Signer Address: ${address}`);
  
  if (address !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
    throw new Error("Address mismatch! Expected Hardhat #0");
  }

  const data = {
    user: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // User address
    topic: "test-topic",
    score: 85,
    nonce: 1,
    deadline: Math.floor(Date.now()/1000) + 3600
  };

  const signature = await identity.signAttestation(data);
  console.log(`Signature: ${signature}`);
  
  if (signature.length !== 132) throw new Error("Invalid signature length");

  // Verify
  const recovered = ethers.verifyTypedData(DOMAIN, TYPES, data, signature);
  console.log(`Recovered: ${recovered}`);
  
  if (recovered !== address) throw new Error("Signature verification failed");
  
  console.log("✅ TEE Crypto Test PASSED");
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
