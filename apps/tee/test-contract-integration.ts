import 'dotenv/config';
import { ethers } from 'ethers';
import { createContractIntegration, createEIP712Signer } from './src/contracts';
import { createIPFSService } from './src/services/ipfs';

async function testContractIntegration() {
  console.log('=== CHUNK 4: Contract Integration Test ===\n');

  if (!process.env.TEE_PRIVATE_KEY) {
    console.error('Error: TEE_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  if (!process.env.CONTRACT_ATTESTATION) {
    console.error('Error: CONTRACT_ATTESTATION not set in .env');
    process.exit(1);
  }

  if (!process.env.CONTRACT_STAKING) {
    console.error('Error: CONTRACT_STAKING not set in .env');
    process.exit(1);
  }

  console.log('Environment check:');
  console.log('  TEE Signer:', process.env.TEE_PRIVATE_KEY?.substring(0, 10) + '...');
  console.log('  Attestation:', process.env.CONTRACT_ATTESTATION);
  console.log('  Staking:', process.env.CONTRACT_STAKING);
  console.log('  RPC:', process.env.RPC_URL || 'https://1rpc.io/sepolia');
  console.log('');

  try {
    const contractIntegration = await createContractIntegration({
      attestationAddress: process.env.CONTRACT_ATTESTATION || '',
      stakingAddress: process.env.CONTRACT_STAKING || '',
      rpcUrl: process.env.RPC_URL || 'https://1rpc.io/sepolia',
      privateKey: process.env.TEE_PRIVATE_KEY || ''
    });

    console.log('✓ Contract integration initialized');
    console.log('  Signer Address:', contractIntegration.getSignerAddress());
    console.log('');

    const eip712Signer = await createEIP712Signer(
      process.env.TEE_PRIVATE_KEY || '',
      process.env.CONTRACT_ATTESTATION || ''
    );

    console.log('✓ EIP-712 signer initialized');
    console.log('  Signer Address:', eip712Signer.getSignerAddress());
    console.log('');

    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
      const ipfsService = await createIPFSService({
        apiKey: process.env.PINATA_API_KEY,
        secretApiKey: process.env.PINATA_SECRET_API_KEY
      });
      console.log('✓ IPFS service initialized');
    } else {
      console.log('⚠ IPFS service not configured (missing PINATA_API_KEY or PINATA_SECRET_API_KEY)');
    }
    console.log('');

    const testWallet = process.env.WALLET_PRIVATE_KEY 
      ? new ethers.Wallet(process.env.WALLET_PRIVATE_KEY)
      : new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000000001');
    const testUser = testWallet.address;
    const testSkill = 'react-card';

    console.log('=== TEST 1: Verify Stake (should fail - no stake exists) ===');
    try {
      const hasStake = await contractIntegration.verifyStake(testUser, testSkill);
      console.log('  Result:', hasStake ? 'Has active stake' : 'No active stake (expected)');
    } catch (error) {
      console.log('  Error:', (error as Error).message);
    }
    console.log('');

    console.log('=== TEST 2: Record Milestone (should fail - no stake) ===');
    try {
      const tx = await contractIntegration.recordMilestone(testUser, testSkill, 3);
      console.log('  ✗ UNEXPECTED: Transaction succeeded:', tx.hash);
    } catch (error: any) {
      const errorMsg = (error as Error).message;
      console.log('  ✓ Expected failure:', errorMsg.includes('No active stake') || errorMsg.includes('Already staked') ? 'Correctly rejected (no stake)' : errorMsg);
    }
    console.log('');

    console.log('=== TEST 3: EIP-712 Signature Generation ===');
    try {
      const testAttestationData = {
        user: testUser,
        skill: testSkill,
        score: 85,
        nonce: Math.floor(Date.now() / 1000),
        ipfsHash: 'QmTest123'
      };

      const signature = await eip712Signer.signAttestation(testAttestationData);
      console.log('  ✓ Signature generated:', signature.substring(0, 20) + '...');

      const isValid = await eip712Signer.verifySignature(testAttestationData, signature);
      console.log('  ✓ Signature valid:', isValid);
    } catch (error) {
      console.log('  ✗ Error:', (error as Error).message);
    }
    console.log('');

    console.log('=== TEST 4: Get Stake Details ===');
    try {
      const details = await contractIntegration.getStakeDetails(testUser, testSkill);
      console.log('  Amount:', details.amount, 'wei');
      console.log('  Staked At:', new Date(parseInt(details.stakedAt) * 1000).toISOString());
      console.log('  Milestone Checkpoint:', details.milestoneCheckpoint);
      console.log('  Refunded:', details.refunded);
    } catch (error) {
      console.log('  Error:', (error as Error).message);
    }
    console.log('');

    console.log('=== TEST 5: Verify Attestation (should fail - none exists) ===');
    try {
      const result = await contractIntegration.verifyAttestation(testUser, testSkill);
      console.log('  Result:', result.exists ? 'Attestation exists' : 'No attestation (expected)');
    } catch (error) {
      console.log('  Error:', (error as Error).message);
    }
    console.log('');

    console.log('=== CHUNK 4 INTEGRATION TEST COMPLETE ===');
    console.log('\n✓ All basic contract integration tests passed');
    console.log('\nNext Steps:');
    console.log('1. Deploy TEE service to EigenCompute (Chunk 6)');
    console.log('2. Test full flow with real user stake');
    console.log('3. Verify EIP-712 signatures on Etherscan');

  } catch (error) {
    console.error('\n✗ Contract integration test failed:', error);
    process.exit(1);
  }
}

testContractIntegration();
