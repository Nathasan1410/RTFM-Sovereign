/**
 * Unit Tests for TEESigner
 * Tests EIP-712 checkpoint signature generation and verification
 */

import { TEESigner, CheckpointData, TEESignature, createTEESigner } from '../../services/TEESigner';
import { ethers } from 'ethers';

describe('TEESigner', () => {
  let teeSigner: TEESigner;
  const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil default
  const testChainId = 31337; // Local testnet
  const testContractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  beforeEach(() => {
    teeSigner = new TEESigner({
      privateKey: testPrivateKey,
      chainId: testChainId,
      contractAddress: testContractAddress
    });
  });

  describe('constructor', () => {
    it('should create TEESigner with valid config', () => {
      expect(teeSigner).toBeDefined();
      expect(teeSigner.getPublicKey()).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should throw error for invalid private key', () => {
      expect(() => new TEESigner({
        privateKey: '',
        chainId: testChainId,
        contractAddress: testContractAddress
      })).toThrow('TEESigner: Invalid private key');
    });

    it('should throw error for short private key', () => {
      expect(() => new TEESigner({
        privateKey: '0x123',
        chainId: testChainId,
        contractAddress: testContractAddress
      })).toThrow('TEESigner: Invalid private key');
    });

    it('should throw error for invalid contract address', () => {
      expect(() => new TEESigner({
        privateKey: testPrivateKey,
        chainId: testChainId,
        contractAddress: 'not-an-address'
      })).toThrow('TEESigner: Invalid contract address');
    });
  });

  describe('getPublicKey', () => {
    it('should return correct Ethereum address', () => {
      const wallet = new ethers.Wallet(testPrivateKey);
      const publicKey = teeSigner.getPublicKey();
      expect(publicKey).toBe(wallet.address);
    });
  });

  describe('signCheckpoint', () => {
    const createValidCheckpointData = (): CheckpointData => ({
      user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
      milestoneId: 3,
      timestamp: Math.floor(Date.now() / 1000),
      ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
      codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
    });

    it('should generate valid signature for milestone 3', async () => {
      const checkpointData = createValidCheckpointData();
      const signature = await teeSigner.signCheckpoint(checkpointData);

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should generate valid signature for milestone 5', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.milestoneId = 5;

      const signature = await teeSigner.signCheckpoint(checkpointData);
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should generate valid signature for milestone 7', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.milestoneId = 7;

      const signature = await teeSigner.signCheckpoint(checkpointData);
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should throw error for invalid milestone ID', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.milestoneId = 4; // Invalid

      await expect(teeSigner.signCheckpoint(checkpointData))
        .rejects.toThrow('Invalid milestone ID');
    });

    it('should throw error for invalid user address', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.user = 'not-an-address';

      await expect(teeSigner.signCheckpoint(checkpointData))
        .rejects.toThrow('Invalid user address');
    });

    it('should throw error for future timestamp', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.timestamp = Math.floor(Date.now() / 1000) + 1000; // Far future

      await expect(teeSigner.signCheckpoint(checkpointData))
        .rejects.toThrow('Future timestamp not allowed');
    });

    it('should throw error for zero timestamp', async () => {
      const checkpointData = createValidCheckpointData();
      checkpointData.timestamp = 0;

      await expect(teeSigner.signCheckpoint(checkpointData))
        .rejects.toThrow('Invalid timestamp');
    });

    it('should generate different signatures for different data', async () => {
      const checkpointData1 = createValidCheckpointData();
      const checkpointData2 = createValidCheckpointData();
      checkpointData2.milestoneId = 5;

      const signature1 = await teeSigner.signCheckpoint(checkpointData1);
      const signature2 = await teeSigner.signCheckpoint(checkpointData2);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('signCheckpointV2', () => {
    it('should return signature components', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      const result: TEESignature = await teeSigner.signCheckpointV2(checkpointData);

      expect(result.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
      expect(result.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.v).toBeGreaterThanOrEqual(27);
      expect(result.v).toBeLessThanOrEqual(28);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
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
    });

    it('should reject invalid signature', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      const invalidSignature = '0x' + 'ab'.repeat(65);
      const isValid = await teeSigner.verifySignature(checkpointData, invalidSignature);

      expect(isValid).toBe(false);
    });

    it('should reject signature from different signer', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      // Sign with different key
      const differentSigner = createTEESigner({
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        chainId: testChainId,
        contractAddress: testContractAddress
      });

      const signature = await differentSigner.signCheckpoint(checkpointData);
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(false);
    });

    it('should reject tampered data', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);

      // Tamper with data
      checkpointData.milestoneId = 5;
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(false);
    });
  });

  describe('recoverSigner', () => {
    it('should recover correct signer address', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: ethers.hexlify(ethers.toUtf8Bytes('test-session-001')),
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      const recovered = await teeSigner.recoverSigner(checkpointData, signature);

      expect(recovered.toLowerCase()).toBe(teeSigner.getPublicKey().toLowerCase());
    });
  });

  describe('getters', () => {
    it('should return correct domain', () => {
      const domain = teeSigner.getDomain();
      expect(domain.name).toBe('RTFMAttestation');
      expect(domain.version).toBe('1');
      expect(domain.chainId).toBe(testChainId);
      expect(domain.verifyingContract).toBe(testContractAddress);
    });

    it('should return correct chain ID', () => {
      expect(teeSigner.getChainId()).toBe(testChainId);
    });

    it('should return correct contract address', () => {
      expect(teeSigner.getContractAddress()).toBe(testContractAddress);
    });
  });

  describe('createTEESigner factory', () => {
    it('should create TEESigner instance', () => {
      const signer = createTEESigner({
        privateKey: testPrivateKey,
        chainId: testChainId,
        contractAddress: testContractAddress
      });

      expect(signer).toBeInstanceOf(TEESigner);
      expect(signer.getPublicKey()).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('bytes32 conversion', () => {
    it('should handle bytes32 session ID correctly', async () => {
      const sessionId = ethers.hexlify(ethers.randomBytes(32));
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId,
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: ethers.hexlify(ethers.toUtf8Bytes('QmTest123456789')),
        codeHash: ethers.hexlify(ethers.toUtf8Bytes('codeSnapshotHash'))
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      const isValid = await teeSigner.verifySignature(checkpointData, signature);

      expect(isValid).toBe(true);
    });

    it('should handle string to bytes32 conversion', async () => {
      const checkpointData: CheckpointData = {
        user: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        sessionId: 'test-session-id', // Plain string
        milestoneId: 3,
        timestamp: Math.floor(Date.now() / 1000),
        ipfsHash: 'QmTest123456789', // Plain string
        codeHash: 'codeHash123' // Plain string
      };

      const signature = await teeSigner.signCheckpoint(checkpointData);
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe('ensureBytes32', () => {
    it('should pass through exact 66-char hex string (0x + 64)', () => {
      const exactHex = '0x' + 'ab'.repeat(32);
      const result = teeSigner['ensureBytes32'](exactHex);
      expect(result).toBe(exactHex);
      expect(result.length).toBe(66);
    });

    it('should pad hex shorter than 64 chars', () => {
      const shortHex = '0xabcd';
      const result = teeSigner['ensureBytes32'](shortHex);
      expect(result).toBe('0x' + 'abcd' + '0'.repeat(60));
      expect(result.length).toBe(66);
    });

    it('should pad hex without 0x prefix', () => {
      const shortHex = 'abcd';
      const result = teeSigner['ensureBytes32'](shortHex);
      expect(result).toBe('0x' + 'abcd' + '0'.repeat(60));
      expect(result.length).toBe(66);
    });

    it('should truncate hex longer than 64 chars', () => {
      const longHex = '0x' + 'ab'.repeat(40);
      const result = teeSigner['ensureBytes32'](longHex);
      expect(result).toBe('0x' + 'ab'.repeat(32));
      expect(result.length).toBe(66);
    });

    it('should convert plain string to bytes32', () => {
      const plainString = 'test-string';
      const result = teeSigner['ensureBytes32'](plainString);
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
      // The result should be the UTF-8 encoding padded to 64 chars
      const expectedHex = ethers.hexlify(ethers.toUtf8Bytes(plainString)).slice(2);
      expect(result).toBe('0x' + expectedHex.padEnd(64, '0'));
    });

    it('should throw error for empty string', () => {
      expect(() => teeSigner['ensureBytes32']('')).toThrow('ensureBytes32: value must be a non-empty string');
    });

    it('should throw error for undefined', () => {
      expect(() => teeSigner['ensureBytes32'](undefined as any)).toThrow('ensureBytes32: value must be a non-empty string');
    });

    it('should NOT double-encode hex strings', () => {
      const hexValue = ethers.hexlify(ethers.toUtf8Bytes('test'));
      const result = teeSigner['ensureBytes32'](hexValue);
      // Result should be a valid bytes32, not double-encoded garbage
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
    });
  });

  describe('ensureBytes32 Edge Cases', () => {
    it('should handle 64-char hex without 0x prefix', () => {
      const hex64 = 'ab'.repeat(32);
      const result = teeSigner['ensureBytes32'](hex64);
      expect(result).toBe('0x' + hex64);
      expect(result.length).toBe(66);
    });

    it('should handle 65-char hex (too long)', () => {
      const hex65 = '0x' + 'ab'.repeat(32) + 'c';
      const result = teeSigner['ensureBytes32'](hex65);
      expect(result).toBe('0x' + 'ab'.repeat(32));
      expect(result.length).toBe(66);
    });

    it('should handle 63-char hex without 0x (too short)', () => {
      const hex63 = 'ab'.repeat(31) + 'c';
      const result = teeSigner['ensureBytes32'](hex63);
      expect(result).toBe('0x' + hex63 + '0');
      expect(result.length).toBe(66);
    });

    it('should handle single character', () => {
      const result = teeSigner['ensureBytes32']('a');
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
    });

    it('should handle 0x prefix only', () => {
      const result = teeSigner['ensureBytes32']('0x');
      expect(result).toBe('0x' + '0'.repeat(64));
      expect(result.length).toBe(66);
    });

    it('should handle mixed case hex', () => {
      const mixedCase = '0xAbCdEf1234';
      const result = teeSigner['ensureBytes32'](mixedCase);
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
    });

    it('should handle unicode string', () => {
      const unicode = '测试 -🔒';
      const result = teeSigner['ensureBytes32'](unicode);
      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
    });

    it('should handle whitespace in plain string', () => {
      const whitespace = '  test  ';
      const result = teeSigner['ensureBytes32'](whitespace);
      const expectedHex = ethers.hexlify(ethers.toUtf8Bytes(whitespace)).slice(2);
      expect(result).toBe('0x' + expectedHex.padEnd(64, '0'));
      expect(result.length).toBe(66);
    });
  });

  describe('ensureBytes32 Performance', () => {
    it('should handle 1000 conversions in reasonable time', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        teeSigner['ensureBytes32'](`test-session-${i}`);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle large hex strings efficiently', () => {
      const largeHex = '0x' + 'ab'.repeat(1000);
      const start = Date.now();
      const result = teeSigner['ensureBytes32'](largeHex);
      const duration = Date.now() - start;

      expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.length).toBe(66);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});
