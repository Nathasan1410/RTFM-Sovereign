/**
 * Unit Tests for SigningService
 * Tests EIP-712 signature generation and verification
 */

import { SignService, AttestationData, SignedAttestation } from '../../crypto/sign';
import { ethers } from 'ethers';

describe('SigningService', () => {
  let signingService: SignService;
  let mockIdentity: jest.Mocked<any>;

  beforeEach(() => {
    mockIdentity = {
      signAttestation: jest.fn().mockResolvedValue('0xabc123def456789'),
      getAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
    };
    signingService = new SignService(mockIdentity);
  });

  describe('signAttestation', () => {
    it('should generate valid EIP-712 signature', async () => {
      const attestationData: AttestationData = {
        user: '0x1234567890123456789012345678901234567890',
        topic: 'Solidity Smart Contracts',
        score: 85,
        nonce: 12345n,
        deadline: 9999999999
      };
      const result: SignedAttestation = await signingService.signAttestation(attestationData);
      expect(result).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.attestationHash).toBeDefined();
    });

    it('should throw error for invalid data', async () => {
      mockIdentity.signAttestation.mockRejectedValue(new Error('Invalid data'));
      const invalidData: AttestationData = {
        user: 'not-an-address',
        topic: 'Solidity',
        score: 85,
        nonce: 12345n,
        deadline: 9999999999
      };

      await expect(signingService.signAttestation(invalidData)).rejects.toThrow('Signing failed');
    });

    it('should delegate signing to TEEIdentity', async () => {
      const attestationData: AttestationData = {
        user: '0x1234567890123456789012345678901234567890',
        topic: 'Solidity',
        score: 85,
        nonce: 12345n,
        deadline: 9999999999
      };

      await signingService.signAttestation(attestationData);

      expect(mockIdentity.signAttestation).toHaveBeenCalledWith(
        expect.objectContaining({
          user: attestationData.user,
          topic: attestationData.topic,
          score: attestationData.score
        })
      );
    });

    it('should compute attestation hash', async () => {
      const attestationData: AttestationData = {
        user: '0x1234567890123456789012345678901234567890',
        topic: 'Solidity',
        score: 85,
        nonce: 12345n,
        deadline: 9999999999
      };

      const result: SignedAttestation = await signingService.signAttestation(attestationData);

      expect(result.attestationHash).toBeDefined();
      expect(result.attestationHash).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });

  describe('getNextNonce', () => {
    it('should return 1 for first call', () => {
      const nonce = signingService.getNextNonce('0x1234567890123456789012345678901234567890');
      expect(nonce).toBe(1n);
    });

    it('should increment nonce for same address', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce1 = signingService.getNextNonce(address);
      const nonce2 = signingService.getNextNonce(address);
      const nonce3 = signingService.getNextNonce(address);

      expect(nonce1).toBe(1n);
      expect(nonce2).toBe(2n);
      expect(nonce3).toBe(3n);
    });

    it('should track nonces separately for different addresses', () => {
      const address1 = '0x1234567890123456789012345678901234567890';
      const address2 = '0x9876543210987654321098765432109876543210';

      const nonce1a = signingService.getNextNonce(address1);
      const nonce2a = signingService.getNextNonce(address2);
      const nonce1b = signingService.getNextNonce(address1);

      expect(nonce1a).toBe(1n);
      expect(nonce2a).toBe(1n);
      expect(nonce1b).toBe(2n);
    });
  });
});
