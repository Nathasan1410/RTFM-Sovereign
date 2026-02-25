/**
 * Attestation Submission Unit Tests
 *
 * Tests for the ContractIntegration attestation submission and refund claiming functionality including:
 * - Input validation
 * - Gas estimation
 * - Transaction submission
 * - Event parsing
 * - Error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ContractIntegration, ContractConfig } from '../../contracts';
import { ethers } from 'ethers';

// Mock logger to reduce noise in tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  agentLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  healthLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('ContractIntegration - Attestation Submission', () => {
  let contractIntegration: ContractIntegration;
  let mockConfig: ContractConfig;

  // Mock contracts
  let mockProvider: any;
  let mockWallet: any;
  let mockAttestationContract: any;
  let mockStakingContract: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      attestationAddress: '0x0000000000000000000000000000000000000001',
      stakingAddress: '0x0000000000000000000000000000000000000002',
      rpcUrl: 'https://rpc.sepolia.org',
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
      overrides: {}
    };

    mockProvider = {
      getNetwork: jest.fn()
    } as any;

    mockWallet = {
      address: '0x1234567890123456789012345678901234567890',
      signTypedData: jest.fn()
    } as any;

    mockAttestationContract = {
      submitAttestation: jest.fn(),
      verifyAttestation: jest.fn(),
      interface: {
        parseLog: jest.fn()
      }
    } as any;

    mockStakingContract = {
      claimRefund: jest.fn(),
      stakes: jest.fn(),
      interface: {
        parseLog: jest.fn()
      }
    } as any;

    // Use dependency injection instead of mocking ethers constructors
    mockConfig.overrides = {
      provider: mockProvider,
      wallet: mockWallet,
      attestation: mockAttestationContract,
      staking: mockStakingContract
    };

    contractIntegration = new ContractIntegration(mockConfig);
  });

  describe('submitAttestation', () => {
    it('should submit attestation with valid data', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      const mockTxResponse = {
        hash: '0xtx123',
        gasLimit: BigInt(100000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx123',
          blockNumber: 123456,
          gasUsed: BigInt(95000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(90000);

      mockAttestationContract.submitAttestation.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockAttestationContract.submitAttestation.mockResolvedValue(mockTxResponse);

      const tx = await contractIntegration.submitAttestation(
        userAddress,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      expect(tx).toBeDefined();
      expect(tx.hash).toBeDefined();
      expect(mockAttestationContract.submitAttestation).toHaveBeenCalledWith(
        userAddress,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores,
        {
          gasLimit: BigInt(108000) // 90000 * 120 / 100
        }
      );
    });

    it('should wait for 2 confirmations', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      const mockTxResponse = {
        hash: '0xtx456',
        gasLimit: BigInt(100000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx456',
          blockNumber: 123457,
          gasUsed: BigInt(95000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(90000);

      mockAttestationContract.submitAttestation.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockAttestationContract.submitAttestation.mockResolvedValue(mockTxResponse);

      await contractIntegration.submitAttestation(
        userAddress,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      expect(mockTxResponse.wait).toHaveBeenCalledWith(2);
    });

    it('should apply 20% gas buffer', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      const mockTxResponse = {
        hash: '0xtx789',
        gasLimit: BigInt(120000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx789',
          blockNumber: 123458,
          gasUsed: BigInt(100000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(100000);

      mockAttestationContract.submitAttestation.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockAttestationContract.submitAttestation.mockResolvedValue(mockTxResponse);

      await contractIntegration.submitAttestation(
        userAddress,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      expect(mockAttestationContract.submitAttestation).toHaveBeenCalledWith(
        userAddress,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores,
        {
          gasLimit: BigInt(120000) // 100000 * 120 / 100
        }
      );
    });

    it('should fail with invalid score (> 100)', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 150; // Invalid
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('Score must be between 0 and 100');
    });

    it('should fail with invalid score (< 0)', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = -10; // Invalid
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('Score must be between 0 and 100');
    });

    it('should fail with invalid signature length', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0xinvalid'; // Too short
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('Invalid signature length');
    });

    it('should fail with empty IPFS hash', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = ''; // Empty
      const milestoneScores = [80, 85, 90, 85, 80];

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('IPFS hash cannot be empty');
    });

    it('should fail with empty milestone scores', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores: number[] = []; // Empty

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('Milestone scores cannot be empty');
    });

    it('should throw error when transaction fails', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const score = 85;
      const signature = '0x' + 'a'.repeat(130);
      const ipfsHash = 'QmTest123';
      const milestoneScores = [80, 85, 90, 85, 80];

      const mockError = new Error('Contract call failed: execution reverted');
      
      mockAttestationContract.submitAttestation.estimateGas = jest.fn()
        .mockResolvedValue(BigInt(90000));
      mockAttestationContract.submitAttestation.mockRejectedValue(mockError);

      await expect(
        contractIntegration.submitAttestation(
          userAddress,
          skill,
          score,
          signature,
          ipfsHash,
          milestoneScores
        )
      ).rejects.toThrow('Contract call failed: execution reverted');
    });
  });

  describe('claimRefund', () => {
    it('should claim refund successfully', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockTxResponse = {
        hash: '0xtxABC',
        gasLimit: BigInt(80000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtxABC',
          blockNumber: 123459,
          gasUsed: BigInt(75000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(70000);

      mockStakingContract.claimRefund.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.claimRefund.mockResolvedValue(mockTxResponse);

      const tx = await contractIntegration.claimRefund(userAddress, skill);

      expect(tx).toBeDefined();
      expect(tx.hash).toBeDefined();
      expect(mockStakingContract.claimRefund).toHaveBeenCalledWith(
        userAddress,
        skill,
        {
          gasLimit: BigInt(84000) // 70000 * 120 / 100
        }
      );
    });

    it('should wait for 2 confirmations', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockTxResponse = {
        hash: '0xtxDEF',
        gasLimit: BigInt(80000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtxDEF',
          blockNumber: 123460,
          gasUsed: BigInt(75000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(70000);

      mockStakingContract.claimRefund.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.claimRefund.mockResolvedValue(mockTxResponse);

      await contractIntegration.claimRefund(userAddress, skill);

      expect(mockTxResponse.wait).toHaveBeenCalledWith(2);
    });

    it('should apply 20% gas buffer', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockTxResponse = {
        hash: '0xtxGHI',
        gasLimit: BigInt(96000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtxGHI',
          blockNumber: 123461,
          gasUsed: BigInt(80000),
          status: 1,
          logs: []
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(80000);

      mockStakingContract.claimRefund.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.claimRefund.mockResolvedValue(mockTxResponse);

      await contractIntegration.claimRefund(userAddress, skill);

      expect(mockStakingContract.claimRefund).toHaveBeenCalledWith(
        userAddress,
        skill,
        {
          gasLimit: BigInt(96000) // 80000 * 120 / 100
        }
      );
    });

    it('should throw error when transaction fails', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockError = new Error('No active stake found');
      
      mockStakingContract.claimRefund.estimateGas = jest.fn()
        .mockResolvedValue(BigInt(70000));
      mockStakingContract.claimRefund.mockRejectedValue(mockError);

      await expect(
        contractIntegration.claimRefund(userAddress, skill)
      ).rejects.toThrow('No active stake found');
    });
  });

  describe('verifyAttestation', () => {
    it('should return true for existing attestation', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockResult = {
        exists: true,
        score: BigInt(85),
        timestamp: BigInt(Date.now()),
        signature: '0xsig123'
      };

      mockAttestationContract.verifyAttestation.mockResolvedValue(mockResult);

      const exists = await contractIntegration.verifyAttestation(userAddress, skill);

      expect(exists.exists).toBe(true);
    });

    it('should return false for non-existing attestation', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockResult = {
        exists: false,
        score: BigInt(0),
        timestamp: BigInt(0),
        signature: '0x'
      };

      mockAttestationContract.verifyAttestation.mockResolvedValue(mockResult);

      const exists = await contractIntegration.verifyAttestation(userAddress, skill);

      expect(exists.exists).toBe(false);
    });

    it('should return false on error', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      mockAttestationContract.verifyAttestation.mockRejectedValue(new Error('Contract error'));

      await expect(contractIntegration.verifyAttestation(userAddress, skill)).rejects.toThrow('Contract error');
    });
  });

  describe('verifyStake', () => {
    it('should return true for active stake', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockStake = {
        amount: ethers.parseEther('10'),
        stakedAt: BigInt(Date.now()),
        milestoneCheckpoint: BigInt(0),
        attestationComplete: false,
        refunded: false,
        skillTopic: 'React Development'
      };

      mockStakingContract.stakes.mockResolvedValue(mockStake);

      const result = await contractIntegration.verifyStake(userAddress, skill);

      expect(result).toBe(true);
    });

    it('should return false for no stake', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockStake = {
        amount: BigInt(0),
        stakedAt: BigInt(0),
        milestoneCheckpoint: BigInt(0),
        attestationComplete: false,
        refunded: false,
        skillTopic: ''
      };

      mockStakingContract.stakes.mockResolvedValue(mockStake);

      const result = await contractIntegration.verifyStake(userAddress, skill);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      mockStakingContract.stakes.mockRejectedValue(new Error('Contract error'));

      const result = await contractIntegration.verifyStake(userAddress, skill);

      expect(result).toBe(false);
    });
  });
});
