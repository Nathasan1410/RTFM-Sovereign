/**
 * Integration Tests for On-Chain Checkpoints
 * Tests the complete flow from checkpoint creation to on-chain recording
 */

import { TEESigner, CheckpointData } from '../../services/TEESigner';
import { ethers } from 'ethers';

describe('On-Chain Checkpoints Integration', () => {
  let teeSigner: TEESigner;
  const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const testChainId = 31337;
  const testContractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  beforeEach(() => {
    teeSigner = new TEESigner({
      privateKey: testPrivateKey,
      chainId: testChainId,
      contractAddress: testContractAddress
    });
  });

  describe('Complete Checkpoint Flow', () => {
    it('should create and sign checkpoint for milestone 3', async () => {
      const sessionId = 'test-session-001';
      const milestoneId = 3;
      const userAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const ipfsHash = 'QmTest123456789';
      const codeContent = 'console.log("Hello World");';

      // Calculate code hash
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(codeContent));
      const ipfsHashBytes = ethers.hexlify(ethers.toUtf8Bytes(ipfsHash));
      const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

      // Create checkpoint data
      const checkpointData: CheckpointData = {
        user: userAddress,
        sessionId: sessionIdBytes,
        milestoneId,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ipfsHashBytes,
        codeHash
      };

      // Sign checkpoint
      const signature = await teeSigner.signCheckpoint(checkpointData);

      // Verify signature
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(true);
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should create checkpoints for all automatic milestones (3, 5, 7)', async () => {
      const sessionId = 'test-session-002';
      const userAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const ipfsHash = 'QmTest987654321';
      const codeContent = 'export const app = {};';

      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(codeContent));
      const ipfsHashBytes = ethers.hexlify(ethers.toUtf8Bytes(ipfsHash));
      const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

      const milestones = [3, 5, 7];
      const signatures: string[] = [];

      for (const milestoneId of milestones) {
        const checkpointData: CheckpointData = {
          user: userAddress,
          sessionId: sessionIdBytes,
          milestoneId,
          timestamp: Math.floor(Date.now() / 1000),
          ipfsHash: ipfsHashBytes,
          codeHash
        };

        const signature = await teeSigner.signCheckpoint(checkpointData);
        signatures.push(signature);

        const isValid = await teeSigner.verifySignature(checkpointData, signature);
        expect(isValid).toBe(true);
      }

      // All signatures should be unique
      expect(new Set(signatures).size).toBe(3);
    });

    it('should handle multiple sessions with different users', async () => {
      const sessions = [
        { sessionId: 'session-1', user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
        { sessionId: 'session-2', user: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
        { sessionId: 'session-3', user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' }
      ];

      const signatures: string[] = [];

      for (const { sessionId, user } of sessions) {
        const checkpointData: CheckpointData = {
          user,
          sessionId: ethers.hexlify(ethers.toUtf8Bytes(sessionId)),
          milestoneId: 3,
          timestamp: Math.floor(Date.now() / 1000),
          ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
          codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
        };

        const signature = await teeSigner.signCheckpoint(checkpointData);
        signatures.push(signature);
      }

      // All signatures should be unique
      expect(new Set(signatures).size).toBe(3);
    });

    it('should recover correct signer from signature', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 5,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      const recoveredSigner = await teeSigner.recoverSigner(checkpointData, signature);

      expect(recoveredSigner.toLowerCase()).toBe(teeSigner.getPublicKey().toLowerCase());
    });

    it('should generate signature components (r, s, v)', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 7,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const result = await teeSigner.signCheckpointV2(checkpointData);

      expect(result.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
      expect(result.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.v).toBeGreaterThanOrEqual(27);
      expect(result.v).toBeLessThanOrEqual(28);
    });
  });

  describe('Checkpoint Data Validation', () => {
    it('should validate bytes32 session ID format', async () => {
      const randomBytes32 = ethers.hexlify(ethers.randomBytes(32));
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: randomBytes32,
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(true);
    });

    it('should handle IPFS hash as bytes32', async () => {
      const randomBytes32 = ethers.hexlify(ethers.randomBytes(32));
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: randomBytes32,
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe('Signature Format Verification', () => {
    it('should produce valid ECDSA signature format', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);

      // Signature should be 65 bytes (130 hex chars + 0x prefix)
      expect(signature.length).toBe(132);
      expect(signature.startsWith('0x')).toBe(true);

      // Split into r, s, v components
      const r = signature.slice(0, 66);
      const s = '0x' + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      expect(r).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(s).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(v).toBeGreaterThanOrEqual(27);
      expect(v).toBeLessThanOrEqual(28);
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept current timestamp', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      expect(signature).toBeDefined();
    });

    it('should reject future timestamp', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000) + 1000, // Far future
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('code'))
      };

      await expect(teeSigner.signCheckpoint(checkpointData))
        .rejects.toThrow('Future timestamp not allowed');
    });
  });
});
