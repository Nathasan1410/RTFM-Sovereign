import { ethers } from 'ethers';
import { SignService } from '../src/crypto/sign';
import { TEESigner } from '../src/crypto/signer';
import { GradingService } from '../src/services/GradingService';

// Mock environment
process.env.SEALED_PATH = './test/sealed-mock';
import fs from 'fs';
if (!fs.existsSync(process.env.SEALED_PATH)) {
  fs.mkdirSync(process.env.SEALED_PATH, { recursive: true });
}

async function runTests() {
  console.log('🔒 Starting Crypto & Attestation Security Tests...\n');

  const signer = new TEESigner();
  const signService = new SignService(signer);
  const gradingService = new GradingService();
  const signerAddress = signer.getAddress();

  console.log(`TEE Address: ${signerAddress}`);

  // TEST 1: Grading Determinism
  console.log('\n🧪 Test 1: Grading Determinism');
  const answers = ['blockchain concept', 'security vulnerability', 'gas optimization', 'unit testing'];
  const expected = [
    { keywords: ['blockchain'], weight: 25 },
    { keywords: ['security'], weight: 25 },
    { keywords: ['optimization'], weight: 25 },
    { keywords: ['testing'], weight: 25 }
  ];
  
  const score1 = gradingService.gradeSubmission(answers, expected);
  const score2 = gradingService.gradeSubmission(answers, expected);
  
  if (score1 === 100 && score1 === score2) {
    console.log('✅ PASS: Grading is deterministic and accurate');
  } else {
    console.error(`❌ FAIL: Scores mismatch or incorrect. ${score1} vs ${score2}`);
  }

  // TEST 2: Signature Validity (EIP-712)
  console.log('\n🧪 Test 2: EIP-712 Signature Validity');
  const user = '0x1234567890123456789012345678901234567890';
  const topic = 'solidity';
  const score = 85;
  const nonce = signService.getNextNonce(user);
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const attestation = await signService.signAttestation({
    user,
    topic,
    score,
    nonce,
    deadline
  });

  // Verify using ethers.verifyTypedData
  const domain = {
    name: 'RTFM-Sovereign',
    version: '1',
    chainId: 11155111,
    verifyingContract: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
  };

  const types = {
    Attestation: [
      { name: 'user', type: 'address' },
      { name: 'topic', type: 'string' },
      { name: 'score', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };

  const value = {
    user,
    topic,
    score,
    nonce,
    deadline
  };

  const recoveredAddress = ethers.verifyTypedData(domain, types, value, attestation.signature);

  if (recoveredAddress === signerAddress) {
    console.log('✅ PASS: Signature verified successfully off-chain');
  } else {
    console.error(`❌ FAIL: Recovered address ${recoveredAddress} does not match signer ${signerAddress}`);
  }

  // TEST 3: Nonce Increment
  console.log('\n🧪 Test 3: Nonce Increment');
  const nonce1 = signService.getNextNonce(user);
  const nonce2 = signService.getNextNonce(user);
  
  if (nonce2 === nonce1 + BigInt(1)) {
    console.log(`✅ PASS: Nonce incremented correctly (${nonce1} -> ${nonce2})`);
  } else {
    console.error(`❌ FAIL: Nonce did not increment correctly`);
  }

  // TEST 4: Domain Separator Sensitivity
  console.log('\n🧪 Test 4: Domain Separator Sensitivity');
  const wrongDomain = { ...domain, name: 'RTFM-Sovereign-Fake' };
  const wrongRecovered = ethers.verifyTypedData(wrongDomain, types, value, attestation.signature);
  
  if (wrongRecovered !== signerAddress) {
    console.log('✅ PASS: Signature rejected with wrong domain');
  } else {
    console.error('❌ FAIL: Signature accepted despite wrong domain!');
  }

  console.log('\n🎉 All Security Tests Completed');
}

runTests().catch(console.error);
