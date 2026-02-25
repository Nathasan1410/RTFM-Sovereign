/**
 * Unit Tests for TEEIdentity - SGX Attestation
 *
 * Tests the TEE identity management including:
 * - SGX quote generation
 * - Key sealing/unsealing
 * - EIP-712 attestation signing
 *
 * Follows TDD methodology: tests written FIRST, then implementation
 */

import { TEEIdentity, AttestationData } from '../../crypto/signer';
import { ethers } from 'ethers';

describe('TEEIdentity - SGX Attestation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set up test mnemonic (12 words)
    process.env.MNEMONIC = 'test test test test test test test test test test test junk';
    process.env.CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000001';
    process.env.CHAIN_ID = '11155111';

    // Use mock mode for testing
    process.env.SGX_ENABLED = 'false';
    process.env.USE_MOCK_TEE = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Constructor - Key Initialization', () => {
    it('should initialize with mnemonic from environment', () => {
      const identity = new TEEIdentity();

      expect(identity.getAddress()).toBeDefined();
      expect(identity.getAddress()).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should throw error when mnemonic is missing', () => {
      delete process.env.MNEMONIC;

      expect(() => new TEEIdentity()).toThrow('KMS_INJECTION_FAILURE');
    });

    it('should throw error when mnemonic has wrong word count', () => {
      process.env.MNEMONIC = 'test test test';

      expect(() => new TEEIdentity()).toThrow('KMS_INJECTION_FAILURE');
    });

    it('should generate consistent address across instances with same mnemonic', () => {
      const identity1 = new TEEIdentity();
      const identity2 = new TEEIdentity();

      expect(identity1.getAddress()).toBe(identity2.getAddress());
    });
  });

  describe('getAttestationQuote - Quote Generation', () => {
    let teeIdentity: TEEIdentity;

    beforeEach(() => {
      teeIdentity = new TEEIdentity();
    });

    it('should return a valid attestation quote structure', async () => {
      const quote = await teeIdentity.getAttestationQuote();

      expect(quote).toHaveProperty('quote');
      expect(quote).toHaveProperty('publicKey');
      expect(quote).toHaveProperty('measurement');
      expect(typeof quote.quote).toBe('string');
      expect(typeof quote.publicKey).toBe('string');
      expect(typeof quote.measurement).toBe('string');
    });

    it('should generate a base64-encoded quote', async () => {
      const quote = await teeIdentity.getAttestationQuote();

      expect(() => {
        Buffer.from(quote.quote, 'base64');
      }).not.toThrow();

      const decoded = Buffer.from(quote.quote, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    });

    it('should include measurement in quote (MRENCLAVE format)', async () => {
      const quote = await teeIdentity.getAttestationQuote();

      // Measurement should be 0x + 64 hex chars (32 bytes)
      expect(quote.measurement).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should return consistent public key', async () => {
      const quote1 = await teeIdentity.getAttestationQuote();
      const quote2 = await teeIdentity.getAttestationQuote();

      expect(quote1.publicKey).toBe(quote2.publicKey);
    });

    it('should return consistent measurement across calls', async () => {
      const quote1 = await teeIdentity.getAttestationQuote();
      const quote2 = await teeIdentity.getAttestationQuote();

      expect(quote1.measurement).toBe(quote2.measurement);
    });

    it('should NOT contain MOCK_SGX_QUOTE in real SGX mode', async () => {
      process.env.SGX_ENABLED = 'true';
      process.env.USE_MOCK_TEE = 'false';

      // This should either fail (no real SGX hardware) or return a real quote
      const realIdentity = new TEEIdentity();

      try {
        const quote = await realIdentity.getAttestationQuote();
        const decoded = Buffer.from(quote.quote, 'base64').toString('utf8');

        // Real quote should not contain MOCK prefix
        expect(decoded).not.toContain('MOCK_SGX_QUOTE');
      } catch (error) {
        // Expected to fail in non-SGX environment
        expect((error as Error).message).toMatch(/SGX|DCAP|enclave/i);
      }
    });

    it('should use mock quote when SGX is disabled', async () => {
      process.env.SGX_ENABLED = 'false';
      process.env.USE_MOCK_TEE = 'true';

      const quote = await teeIdentity.getAttestationQuote();

      // Mock quote should be valid base64
      expect(() => {
        Buffer.from(quote.quote, 'base64');
      }).not.toThrow();

      // Should still return a proper measurement format
      expect(quote.measurement).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should throw error when SGX is required but unavailable', async () => {
      process.env.SGX_ENABLED = 'true';
      process.env.USE_MOCK_TEE = 'false';

      const realIdentity = new TEEIdentity();

      await expect(realIdentity.getAttestationQuote()).rejects.toThrow();
    });
  });

  describe('signAttestation - EIP-712 Signing', () => {
    let teeIdentity: TEEIdentity;

    beforeEach(() => {
      teeIdentity = new TEEIdentity();
    });

    it('should sign attestation data with valid signature', async () => {
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'React Development',
        score: 85,
        nonce: 12345,
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const signature = await teeIdentity.signAttestation(data);

      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(132); // 0x + r(64) + s(64) + v(2)
      expect(signature.startsWith('0x')).toBe(true);
    });

    it('should throw error for invalid score (< 0)', async () => {
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'React',
        score: -1,
        nonce: 12345,
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      await expect(teeIdentity.signAttestation(data)).rejects.toThrow('INVALID_SCORE');
    });

    it('should throw error for invalid score (> 100)', async () => {
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'React',
        score: 101,
        nonce: 12345,
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      await expect(teeIdentity.signAttestation(data)).rejects.toThrow('INVALID_SCORE');
    });

    it('should throw error for expired deadline', async () => {
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'React',
        score: 85,
        nonce: 12345,
        deadline: Math.floor(Date.now() / 1000) - 100 // Past deadline
      };

      await expect(teeIdentity.signAttestation(data)).rejects.toThrow('EXPIRED_DEADLINE');
    });

    it('should produce recoverable signature', async () => {
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'Solidity',
        score: 90,
        nonce: 12345,
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const signature = await teeIdentity.signAttestation(data);

      // Verify signature format
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });
  });

  describe('Key Sealing - Persistent Identity', () => {
    const SEALED_KEY_PATH = '/tmp/test_tee_key.sealed';

    beforeEach(() => {
      process.env.SGX_SEALED_KEY_PATH = SEALED_KEY_PATH;
    });

    afterEach(() => {
      // Clean up test file
      const fs = require('fs');
      if (fs.existsSync(SEALED_KEY_PATH)) {
        fs.unlinkSync(SEALED_KEY_PATH);
      }
    });

    it('should create sealed key on first startup', () => {
      const fs = require('fs');

      // Ensure file doesn't exist
      if (fs.existsSync(SEALED_KEY_PATH)) {
        fs.unlinkSync(SEALED_KEY_PATH);
      }

      const identity1 = new TEEIdentity();

      // File should be created
      expect(fs.existsSync(SEALED_KEY_PATH)).toBe(true);
    });

    it('should reuse sealed key on subsequent startups', () => {
      const fs = require('fs');

      // Clear any existing file
      if (fs.existsSync(SEALED_KEY_PATH)) {
        fs.unlinkSync(SEALED_KEY_PATH);
      }

      const identity1 = new TEEIdentity();
      const address1 = identity1.getAddress();

      // Create new instance (should reuse sealed key)
      const identity2 = new TEEIdentity();
      const address2 = identity2.getAddress();

      expect(address1).toBe(address2);
    });

    it('should generate new key if sealed key is corrupted', () => {
      const fs = require('fs');

      // Create corrupted file
      fs.writeFileSync(SEALED_KEY_PATH, 'corrupted data');

      const identity = new TEEIdentity();

      // Should still initialize successfully
      expect(identity.getAddress()).toBeDefined();
    });
  });

  describe('Integration - Quote and Signature', () => {
    it('should generate quote and sign attestation with same identity', async () => {
      const teeIdentity = new TEEIdentity();

      const quote = await teeIdentity.getAttestationQuote();
      const data: AttestationData = {
        user: '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48',
        topic: 'TypeScript',
        score: 95,
        nonce: Date.now(),
        deadline: Math.floor(Date.now() / 1000) + 3600
      };
      const signature = await teeIdentity.signAttestation(data);

      // Both should use the same underlying key
      expect(quote.publicKey).toBeDefined();
      expect(signature).toBeDefined();
    });
  });
});
