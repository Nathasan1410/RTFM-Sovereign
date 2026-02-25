/**
 * Unit Tests for SGXVerifier
 *
 * Tests SGX quote verification including:
 * - Quote parsing and measurement extraction
 * - Mock quote detection
 * - PCCS verification (mocked)
 * - Batch verification
 */

import { SGXVerifier, createSGXVerifier, getSGXVerifier } from '../../verification/SGXVerifier';
import { ethers } from 'ethers';

// Helper to reset singleton between tests
function resetSingleton() {
  // Force module reload to reset singleton
  jest.resetModules();
}

describe('SGXVerifier', () => {
  let verifier: SGXVerifier;

  beforeEach(() => {
    // Use mock mode for testing
    process.env.USE_MOCK_TEE = 'true';
    verifier = new SGXVerifier({ skipOnlineVerification: true });
  });

  describe('Constructor', () => {
    it('should initialize with default PCCS URL', () => {
      const defaultVerifier = new SGXVerifier();

      expect(defaultVerifier.getPCCSUrl()).toBe('https://api.trustedservices.intel.com/sgx/certification/v3/');
    });

    it('should initialize with custom PCCS URL', () => {
      const customVerifier = new SGXVerifier({
        pccsUrl: 'https://custom-pccs.example.com'
      });

      expect(customVerifier.getPCCSUrl()).toBe('https://custom-pccs.example.com');
    });

    it('should skip online verification in development mode', () => {
      const devVerifier = new SGXVerifier({
        skipOnlineVerification: true
      });

      expect(devVerifier).toBeDefined();
    });
  });

  describe('verifyQuote', () => {
    it('should verify a valid mock quote', async () => {
      // Create a mock quote with valid structure
      const mockQuote = Buffer.alloc(512);
      mockQuote.writeUInt16LE(3, 0); // version
      mockQuote.writeUInt16LE(2, 2); // attestationKeyType

      // Write measurement at offset 80
      const measurementHash = ethers.keccak256(ethers.toUtf8Bytes('RTFM_TEE'));
      Buffer.from(measurementHash.slice(2), 'hex').copy(mockQuote, 80);

      const quoteBase64 = mockQuote.toString('base64');

      const result = await verifier.verifyQuote(quoteBase64);

      expect(result.valid).toBe(true);
      expect(result.measurement).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
    });

    it('should extract measurement from quote', async () => {
      const mockQuote = Buffer.alloc(512);
      mockQuote.writeUInt16LE(3, 0);

      const expectedMeasurement = ethers.keccak256(ethers.toUtf8Bytes('TEST_ENCLAVE'));
      Buffer.from(expectedMeasurement.slice(2), 'hex').copy(mockQuote, 80);

      const result = await verifier.verifyQuote(mockQuote.toString('base64'));

      expect(result.measurement).toBe(expectedMeasurement);
    });

    it('should validate measurement against expected value', async () => {
      const mockQuote = Buffer.alloc(512);
      mockQuote.writeUInt16LE(3, 0);

      const expectedMeasurement = ethers.keccak256(ethers.toUtf8Bytes('EXPECTED'));
      Buffer.from(expectedMeasurement.slice(2), 'hex').copy(mockQuote, 80);

      const result = await verifier.verifyQuote(
        mockQuote.toString('base64'),
        expectedMeasurement
      );

      expect(result.valid).toBe(true);
      expect(result.details.measurementValid).toBe(true);
    });

    it('should fail when measurement does not match expected', async () => {
      const mockQuote = Buffer.alloc(512);
      mockQuote.writeUInt16LE(3, 0);

      const actualMeasurement = ethers.keccak256(ethers.toUtf8Bytes('ACTUAL'));
      Buffer.from(actualMeasurement.slice(2), 'hex').copy(mockQuote, 80);

      const wrongMeasurement = ethers.keccak256(ethers.toUtf8Bytes('WRONG'));

      const result = await verifier.verifyQuote(
        mockQuote.toString('base64'),
        wrongMeasurement
      );

      expect(result.valid).toBe(false);
      expect(result.details.measurementValid).toBe(false);
    });

    it('should throw error for invalid base64', async () => {
      await expect(verifier.verifyQuote('not-valid-base64!!!'))
        .rejects.toThrow('Failed to verify SGX quote');
    });

    it('should throw error for quote that is too small', async () => {
      const tinyQuote = Buffer.alloc(10);
      await expect(verifier.verifyQuote(tinyQuote.toString('base64')))
        .rejects.toThrow('Failed to verify SGX quote');
    });

    it('should identify mock quotes correctly', async () => {
      const mockQuote = Buffer.alloc(512);
      mockQuote.writeUInt16LE(3, 0);

      // Add mock pattern to report data
      const reportDataOffset = 48 + 256;
      Buffer.from('MOCK_TEE_QUOTE').copy(mockQuote, reportDataOffset);

      const result = await verifier.verifyQuote(mockQuote.toString('base64'));

      expect(result.details.isMockQuote).toBe(true);
      expect(result.issuer).toContain('Mock');
    });

    it('should handle quotes without mock pattern', async () => {
      const realQuote = Buffer.alloc(512);
      realQuote.writeUInt16LE(3, 0);

      // Write measurement
      const measurement = ethers.keccak256(ethers.toUtf8Bytes('REAL_ENCLAVE'));
      Buffer.from(measurement.slice(2), 'hex').copy(realQuote, 80);

      // Fill report data with random bytes (no MOCK pattern)
      const reportDataOffset = 48 + 256;
      const randomData = Buffer.from(ethers.randomBytes(64));
      randomData.copy(realQuote, reportDataOffset);

      const result = await verifier.verifyQuote(realQuote.toString('base64'));

      expect(result.details.isMockQuote).toBe(false);
    });
  });

  describe('verifyBatch', () => {
    it('should verify multiple quotes', async () => {
      const quotes: string[] = [];

      for (let i = 0; i < 3; i++) {
        const mockQuote = Buffer.alloc(512);
        mockQuote.writeUInt16LE(3, 0);

        const measurement = ethers.keccak256(ethers.toUtf8Bytes(`ENCLAVE_${i}`));
        Buffer.from(measurement.slice(2), 'hex').copy(mockQuote, 80);

        quotes.push(mockQuote.toString('base64'));
      }

      const results = await verifier.verifyBatch(quotes);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await verifier.verifyBatch([]);

      expect(results).toHaveLength(0);
    });

    it('should apply expected measurement to all quotes', async () => {
      const expectedMeasurement = ethers.keccak256(ethers.toUtf8Bytes('EXPECTED'));
      const quotes: string[] = [];

      for (let i = 0; i < 2; i++) {
        const mockQuote = Buffer.alloc(512);
        mockQuote.writeUInt16LE(3, 0);
        Buffer.from(expectedMeasurement.slice(2), 'hex').copy(mockQuote, 80);
        quotes.push(mockQuote.toString('base64'));
      }

      const results = await verifier.verifyBatch(quotes, expectedMeasurement);

      expect(results[0].details.measurementValid).toBe(true);
      expect(results[1].details.measurementValid).toBe(true);
    });
  });

  describe('PCCS URL Management', () => {
    it('should get PCCS URL', () => {
      const testVerifier = new SGXVerifier({
        pccsUrl: 'https://test.example.com'
      });

      expect(testVerifier.getPCCSUrl()).toBe('https://test.example.com');
    });

    it('should set new PCCS URL', () => {
      verifier.setPCCSUrl('https://new-url.example.com');

      expect(verifier.getPCCSUrl()).toBe('https://new-url.example.com');
    });
  });

  describe('Singleton Pattern', () => {
    it('should create singleton instance', () => {
      // Note: This test may be affected by previous tests
      // The important thing is that subsequent calls return the same instance
      const instance1 = getSGXVerifier();
      const instance2 = getSGXVerifier();

      expect(instance1).toBe(instance2);
    });

    it('should get existing singleton', () => {
      const instance1 = getSGXVerifier();
      const instance2 = getSGXVerifier();

      expect(instance1).toBe(instance2);
    });

    it('should create new verifier with custom options', () => {
      // When you need custom options, create a new instance directly
      const customVerifier = new SGXVerifier({
        pccsUrl: 'https://custom.example.com',
        skipOnlineVerification: true
      });

      expect(customVerifier.getPCCSUrl()).toBe('https://custom.example.com');
      // Verify it's a different instance from the singleton
      const singleton = getSGXVerifier();
      expect(customVerifier).not.toBe(singleton);
    });
  });
});
