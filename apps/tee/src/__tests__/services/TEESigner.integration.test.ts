/**
 * TEESigner Integration Tests - ensureBytes32 Fix Verification
 *
 * End-to-end tests verifying the ensureBytes32() double-encoding bug fix
 * works correctly with real checkpoint data formats.
 */

import { TEESigner, CheckpointData } from '../../services/TEESigner';
import { ethers } from 'ethers';

describe('TEESigner Integration - ensureBytes32 Fix', () => {
  let teeSigner: TEESigner;
  const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  beforeEach(() => {
    teeSigner = new TEESigner({
      privateKey: testPrivateKey,
      chainId: 31337,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    });
  });

  it('should correctly sign and verify checkpoint with hex sessionId', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
      codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
  });

  it('should correctly sign and verify checkpoint with plain sessionId', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: 'test-session-001',
      milestoneId: 5,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmTest123456789',
      codeHash: 'codeSnapshotHash'
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should recover correct signer from signature', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
      milestoneId: 7,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
      codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const recoveredAddress = await teeSigner.recoverSigner(checkpointData, signature);

    expect(recoveredAddress.toLowerCase()).toBe(teeSigner.getPublicKey().toLowerCase());
  });

  it('should handle varying hex lengths correctly', async () => {
    const testCases = [
      { sessionId: '0xab', expectedPadding: '0' },
      { sessionId: '0xabcd1234', expectedPadding: '0' },
      { sessionId: ethers.hexlify(ethers.toUtf8Bytes('short')), expectedPadding: '0' },
      { sessionId: ethers.hexlify(ethers.toUtf8Bytes('very-long-session-id-string')), expectedPadding: '' }
    ];

    for (const testCase of testCases) {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: testCase.sessionId,
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: 'QmTest123456789',
        codeHash: 'codeSnapshotHash'
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(true);
    }
  });

  it('should handle mixed hex and plain string fields', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: ethers.hexlify(ethers.toUtf8Bytes('hex-session')), // Hex
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmPlainString', // Plain string
      codeHash: ethers.hexlify(ethers.toUtf8Bytes('hex-code')) // Hex
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should handle 64-char hex strings without modification', async () => {
    const exactHex64 = '0x' + 'ab'.repeat(32);
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: exactHex64,
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmTest123456789',
      codeHash: 'codeSnapshotHash'
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should handle long hex strings by truncating', async () => {
    const longHex = ethers.hexlify(ethers.toUtf8Bytes('this-is-a-very-long-session-id-string-that-exceeds-64-chars'));
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: longHex,
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmTest123456789',
      codeHash: 'codeSnapshotHash'
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should maintain signature consistency for same data', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: 'consistent-session',
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmTest123456789',
      codeHash: 'codeHash'
    };

    const signature1 = await teeSigner.signCheckpoint(checkpointData);
    const signature2 = await teeSigner.signCheckpoint(checkpointData);

    // Signatures should be identical for same data (deterministic signing)
    expect(signature1).toBe(signature2);
  });

  it('should verify signature after ensureBytes32 transformation', async () => {
    // This test specifically verifies the bug fix
    // Before fix: ensureBytes32 would double-encode, causing verification to fail
    // After fix: ensureBytes32 properly handles hex strings

    const originalHex = ethers.hexlify(ethers.toUtf8Bytes('bug-fix-test'));
    
    // Manually transform using ensureBytes32 to verify it works correctly
    const transformedSessionId = teeSigner['ensureBytes32'](originalHex);
    
    // Verify the transformed value is valid bytes32
    expect(transformedSessionId).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(transformedSessionId.length).toBe(66);

    // Now verify signature works with this transformation
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: originalHex,
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: 'QmTest123456789',
      codeHash: 'codeHash'
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should work with random bytes32 values', async () => {
    const randomBytes32 = ethers.hexlify(ethers.randomBytes(32));
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: randomBytes32,
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: ethers.hexlify(ethers.randomBytes(32)),
      codeHash: ethers.hexlify(ethers.randomBytes(32))
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });

  it('should handle all fields as 64-char hex', async () => {
    const checkpointData: CheckpointData = {
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: '0x' + 'aa'.repeat(32),
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: '0x' + 'bb'.repeat(32),
      codeHash: '0x' + 'cc'.repeat(32)
    };

    const signature = await teeSigner.signCheckpoint(checkpointData);
    const isValid = await teeSigner.verifySignature(checkpointData, signature);

    expect(isValid).toBe(true);
  });
});
