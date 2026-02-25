/**
 * Milestone Recording Unit Tests
 *
 * Tests for the ContractIntegration milestone recording functionality including:
 * - Gas estimation
 * - Transaction submission
 * - TEE address verification
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

describe('ContractIntegration - Milestone Recording', () => {
  let contractIntegration: ContractIntegration;
  let mockConfig: ContractConfig;

  // Mock contracts
  let mockProvider: any;
  let mockWallet: any;
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

    mockStakingContract = {
      recordMilestone: jest.fn(),
      stakes: jest.fn(),
      teeAttestor: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    } as any;

    // Use dependency injection instead of mocking ethers constructors
    mockConfig.overrides = {
      provider: mockProvider,
      wallet: mockWallet,
      staking: mockStakingContract,
      attestation: {} as any
    };

    contractIntegration = new ContractIntegration(mockConfig);
  });

  describe('recordMilestone', () => {
    it('should record milestone 1 for staked user', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 1;

      const mockTxResponse = {
        hash: '0xtx123',
        gasLimit: BigInt(50000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx123',
          blockNumber: 123456,
          gasUsed: BigInt(45000),
          status: 1
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(42000);

      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.recordMilestone.mockResolvedValue(mockTxResponse);

      const tx = await contractIntegration.recordMilestone(
        userAddress,
        skill,
        milestoneId
      );

      expect(tx).toBeDefined();
      expect(tx.hash).toBeDefined();
      expect(mockStakingContract.recordMilestone).toHaveBeenCalledWith(
        userAddress,
        skill,
        milestoneId,
        {
          gasLimit: BigInt(50400) // 42000 * 120 / 100
        }
      );
    });

    it('should record milestone 2 after milestone 1', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 2;

      const mockTxResponse = {
        hash: '0xtx456',
        gasLimit: BigInt(50000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx456',
          blockNumber: 123457,
          gasUsed: BigInt(46000),
          status: 1
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(43000);

      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.recordMilestone.mockResolvedValue(mockTxResponse);

      const tx = await contractIntegration.recordMilestone(
        userAddress,
        skill,
        milestoneId
      );

      expect(tx).toBeDefined();
      expect(tx.hash).toBeDefined();
    });

    it('should wait for 2 confirmations', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 1;

      const mockTxResponse = {
        hash: '0xtx789',
        gasLimit: BigInt(50000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtx789',
          blockNumber: 123458,
          gasUsed: BigInt(44000),
          status: 1
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(41000);

      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.recordMilestone.mockResolvedValue(mockTxResponse);

      await contractIntegration.recordMilestone(userAddress, skill, milestoneId);

      expect(mockTxResponse.wait).toHaveBeenCalledWith(2);
    });

    it('should apply 20% gas buffer', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 1;

      const mockTxResponse = {
        hash: '0xtxABC',
        gasLimit: BigInt(60000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtxABC',
          blockNumber: 123459,
          gasUsed: BigInt(50000),
          status: 1
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(50000);

      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.recordMilestone.mockResolvedValue(mockTxResponse);

      await contractIntegration.recordMilestone(userAddress, skill, milestoneId);

      expect(mockStakingContract.recordMilestone).toHaveBeenCalledWith(
        userAddress,
        skill,
        milestoneId,
        {
          gasLimit: BigInt(60000) // 50000 * 120 / 100
        }
      );
    });

    it('should throw error when transaction fails', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 1;

      const mockError = new Error('Contract call failed: execution reverted');
      
      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(BigInt(42000));
      mockStakingContract.recordMilestone.mockRejectedValue(mockError);

      await expect(
        contractIntegration.recordMilestone(userAddress, skill, milestoneId)
      ).rejects.toThrow('Contract call failed: execution reverted');
    });

    it('should log transaction details', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';
      const milestoneId = 1;

      const mockTxResponse = {
        hash: '0xtxDEF',
        gasLimit: BigInt(50000),
        wait: jest.fn().mockResolvedValue({
          hash: '0xtxDEF',
          blockNumber: 123460,
          gasUsed: BigInt(45000),
          status: 1
        })
      } as unknown as ethers.ContractTransactionResponse;

      const mockGasEstimate = BigInt(42000);

      mockStakingContract.recordMilestone.estimateGas = jest.fn()
        .mockResolvedValue(mockGasEstimate);
      mockStakingContract.recordMilestone.mockResolvedValue(mockTxResponse);

      await contractIntegration.recordMilestone(userAddress, skill, milestoneId);

      expect(mockStakingContract.recordMilestone).toHaveBeenCalled();
      expect(mockTxResponse.wait).toHaveBeenCalled();
    });
  });

  describe('getStakeDetails', () => {
    it('should return correct stake details after milestone recording', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockStake = {
        amount: ethers.parseEther('10'),
        stakedAt: BigInt(Date.now()),
        milestoneCheckpoint: BigInt(2),
        attestationComplete: false,
        refunded: false,
        skillTopic: 'React Development'
      };

      mockStakingContract.stakes.mockResolvedValue(mockStake);

      const details = await contractIntegration.getStakeDetails(userAddress, skill);

      expect(details).toBeDefined();
      expect(details.skillTopic).toBe(skill);
      expect(details.milestoneCheckpoint).toBe('2');
      expect(details.attestationComplete).toBe(false);
      expect(details.refunded).toBe(false);
      expect(details.amount).toMatch(/^\d+$/);
      expect(details.stakedAt).toMatch(/^\d+$/);
    });

    it('should throw error when stake query fails', async () => {
      const userAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
      const skill = 'React Development';

      const mockError = new Error('Contract query failed');
      mockStakingContract.stakes.mockRejectedValue(mockError);

      await expect(
        contractIntegration.getStakeDetails(userAddress, skill)
      ).rejects.toThrow('Contract query failed');
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

  describe('getSignerAddress', () => {
    it('should return TEE wallet address', () => {
      const address = contractIntegration.getSignerAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });
  });
});
