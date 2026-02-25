/**
 * Contract Integration Module
 *
 * Smart contract interaction layer for TEE service.
 * Provides typed interfaces for interacting with SkillAttestation and
 * SkillStaking contracts on Ethereum Sepolia testnet.
 *
 * Key Responsibilities:
 * - Initialize Ethereum provider and wallet
 * - Create contract instances with typed ABIs
 * - Record milestones on staking contract
 * - Record attestations on attestation contract
 * - Generate EIP-712 typed data signatures
 * - Handle contract transaction submission and confirmation
 *
 * Dependencies:
 * - ethers.js: Ethereum interaction library
 * - SkillAttestation ABI: Attestation contract interface
 * - SkillStaking ABI: Staking contract interface
 *
 * @module apps/tee/src/contracts
 */

import { ethers } from 'ethers';
import SkillAttestationABI from './abis/SkillAttestation.json';
import SkillStakingABI from './abis/SkillStaking.json';
import { logger } from '../utils/logger';

const SEPOLIA_CHAIN_ID = 11155111;

export interface ContractConfig {
  attestationAddress: string;
  stakingAddress: string;
  rpcUrl: string;
  privateKey: string;
  /**
   * Optional overrides for dependency injection (testing only)
   * When provided, these instances will be used instead of creating new ones
   */
  overrides?: {
    provider?: ethers.JsonRpcProvider;
    wallet?: ethers.Wallet;
    attestation?: ethers.Contract;
    staking?: ethers.Contract;
  };
}

export class ContractIntegration {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  public attestation: ethers.Contract;
  public staking: ethers.Contract;

  constructor(config: ContractConfig) {
    // Use overrides if provided (for testing), otherwise create new instances
    if (config.overrides) {
      this.provider = config.overrides.provider!;
      this.wallet = config.overrides.wallet!;
      this.attestation = config.overrides.attestation!;
      this.staking = config.overrides.staking!;
      
      logger.info({ 
        walletAddress: this.wallet.address 
      }, 'ContractIntegration initialized with overrides (testing mode)');
    } else {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);

      // Log TEE address for debugging
      const teeAddress = this.wallet.address.toLowerCase();
      logger.info({ teeAddress }, 'ContractIntegration initialized with TEE address');

      // Verify contracts are configured
      logger.info({
        attestationAddress: config.attestationAddress,
        stakingAddress: config.stakingAddress
      }, 'ContractIntegration: Contract addresses configured');

      this.attestation = new ethers.Contract(
        config.attestationAddress,
        SkillAttestationABI.abi,
        this.wallet
      );

      this.staking = new ethers.Contract(
        config.stakingAddress,
        SkillStakingABI.abi,
        this.wallet
      );

      // Verify TEE address matches contract expectations (optional, for debugging)
      this.verifyTEEAddresses().catch(err => {
        logger.warn({ error: (err as Error).message }, 'ContractIntegration: Could not verify TEE addresses');
      });
    }
  }

  /**
   * Verify TEE addresses match contract expectations
   */
  private async verifyTEEAddresses(): Promise<void> {
    try {
      const stakingTEE = await this.staking.teeAttestor();
      const attestationTEE = await this.attestation.teeSigner();

      logger.info({
        stakingTEE,
        attestationTEE,
        ourTEE: this.wallet.address.toLowerCase()
      }, 'ContractIntegration: TEE address verification');

      if (stakingTEE.toLowerCase() !== this.wallet.address.toLowerCase()) {
        logger.warn(
          'ContractIntegration: TEE address mismatch in staking contract - updateTEEAttestor may be needed'
        );
      }

      if (attestationTEE.toLowerCase() !== this.wallet.address.toLowerCase()) {
        logger.warn(
          'ContractIntegration: TEE address mismatch in attestation contract - updateTEESigner may be needed'
        );
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'ContractIntegration: TEE address verification failed');
    }
  }

  public getSignerAddress(): string {
    return this.wallet.address;
  }

  public async recordMilestone(
    userAddress: string,
    skill: string,
    milestoneId: number
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      logger.info({
        user: userAddress,
        skill,
        milestoneId
      }, 'ContractIntegration: Recording milestone');

      // Estimate gas
      const gasEstimate = await this.staking.recordMilestone.estimateGas(
        userAddress,
        skill,
        milestoneId
      );

      logger.info({
        user: userAddress,
        skill,
        milestoneId,
        gasEstimate: gasEstimate.toString()
      }, 'ContractIntegration: Gas estimated for milestone');

      // Submit transaction with gas limit buffer (20%)
      const tx = await this.staking.recordMilestone(
        userAddress,
        skill,
        milestoneId,
        {
          gasLimit: (gasEstimate * 120n) / 100n
        }
      );

      logger.info({
        user: userAddress,
        skill,
        milestoneId,
        txHash: tx.hash,
        gasLimit: tx.gasLimit?.toString()
      }, 'ContractIntegration: Milestone transaction submitted');

      // Wait for 2 confirmations
      const receipt = await tx.wait(2);

      logger.info({
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      }, 'ContractIntegration: Milestone transaction confirmed');

      return tx;
    } catch (error) {
      logger.error({
        user: userAddress,
        skill,
        milestoneId,
        error: (error as Error).message
      }, 'ContractIntegration: Contract recordMilestone failed');
      throw error;
    }
  }

  public async submitAttestation(
    user: string,
    skill: string,
    score: number,
    signature: string,
    ipfsHash: string,
    milestoneScores: number[]
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      // Validate inputs
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      if (!signature || signature.length !== 132) { // 0x + 130 chars
        throw new Error('Invalid signature length (expected 0x + 130 chars)');
      }

      if (!ipfsHash || ipfsHash === '') {
        throw new Error('IPFS hash cannot be empty');
      }

      if (!milestoneScores || milestoneScores.length === 0) {
        throw new Error('Milestone scores cannot be empty');
      }

      logger.info({
        user,
        skill,
        score,
        milestoneScoresCount: milestoneScores.length,
        ipfsHash
      }, 'ContractIntegration: Submitting attestation');

      // Estimate gas
      const gasEstimate = await this.attestation.submitAttestation.estimateGas(
        user,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );

      logger.info({
        user,
        skill,
        score,
        gasEstimate: gasEstimate.toString()
      }, 'ContractIntegration: Gas estimated for attestation');

      // Submit transaction with gas limit buffer (20%)
      const tx = await this.attestation.submitAttestation(
        user,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores,
        {
          gasLimit: (gasEstimate * 120n) / 100n
        }
      );

      logger.info({
        user,
        skill,
        score,
        txHash: tx.hash,
        gasLimit: tx.gasLimit?.toString()
      }, 'ContractIntegration: Attestation transaction submitted');

      // Wait for 2 confirmations
      const receipt = await tx.wait(2);

      logger.info({
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      }, 'ContractIntegration: Attestation transaction confirmed');

      // Parse and log event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = this.attestation.interface.parseLog(log);
          return parsed?.name === 'AttestationSubmitted';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.attestation.interface.parseLog(event);
        logger.info({
          user: parsed?.args?.user,
          skill: parsed?.args?.skill,
          score: parsed?.args?.score?.toString()
        }, 'ContractIntegration: AttestationSubmitted event emitted');
      }

      return tx;
    } catch (error) {
      logger.error({
        user,
        skill,
        score,
        error: (error as Error).message
      }, 'ContractIntegration: Contract submitAttestation failed');
      throw error;
    }
  }

  public async claimRefund(
    user: string,
    skill: string
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      logger.info({
        user,
        skill
      }, 'ContractIntegration: Claiming refund');

      // Estimate gas
      const gasEstimate = await this.staking.claimRefund.estimateGas(
        user,
        skill
      );

      logger.info({
        user,
        skill,
        gasEstimate: gasEstimate.toString()
      }, 'ContractIntegration: Gas estimated for refund');

      // Submit transaction with gas limit buffer (20%)
      const tx = await this.staking.claimRefund(
        user,
        skill,
        {
          gasLimit: (gasEstimate * 120n) / 100n
        }
      );

      logger.info({
        user,
        skill,
        txHash: tx.hash,
        gasLimit: tx.gasLimit?.toString()
      }, 'ContractIntegration: Refund transaction submitted');

      // Wait for 2 confirmations
      const receipt = await tx.wait(2);

      logger.info({
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      }, 'ContractIntegration: Refund transaction confirmed');

      // Parse and log event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = this.staking.interface.parseLog(log);
          return parsed?.name === 'RefundClaimed';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.staking.interface.parseLog(event);
        logger.info({
          user: parsed?.args?.user,
          amount: parsed?.args?.amount?.toString()
        }, 'ContractIntegration: RefundClaimed event emitted');
      }

      return tx;
    } catch (error) {
      logger.error({
        user,
        skill,
        error: (error as Error).message
      }, 'ContractIntegration: Contract claimRefund failed');
      throw error;
    }
  }

  public async verifyStake(user: string, skill: string): Promise<boolean> {
    try {
      const stake = await this.staking.stakes(user, skill);
      return stake.amount > 0;
    } catch (error) {
      console.error('[Contract] verifyStake failed:', error);
      return false;
    }
  }

  public async getStakeDetails(user: string, skill: string): Promise<any> {
    try {
      const stake = await this.staking.stakes(user, skill);
      return {
        amount: stake.amount.toString(),
        stakedAt: stake.stakedAt.toString(),
        milestoneCheckpoint: stake.milestoneCheckpoint.toString(),
        attestationComplete: stake.attestationComplete,
        refunded: stake.refunded,
        skillTopic: stake.skillTopic
      };
    } catch (error) {
      console.error('[Contract] getStakeDetails failed:', error);
      throw error;
    }
  }

  public async verifyAttestation(user: string, skill: string): Promise<any> {
    try {
      const result = await this.attestation.verifyAttestation(user, skill);
      return {
        exists: result.exists,
        score: result.score.toString(),
        timestamp: result.timestamp.toString(),
        signature: result.signature
      };
    } catch (error) {
      console.error('[Contract] verifyAttestation failed:', error);
      throw error;
    }
  }
}

export interface EIP712AttestationData {
  user: string;
  skill: string;
  score: number;
  nonce: number;
  ipfsHash: string;
}

export class EIP712Signer {
  private wallet: ethers.Wallet;
  private domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  private types = {
    Attestation: [
      { name: "user", type: "address" },
      { name: "skill", type: "string" },
      { name: "score", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "ipfsHash", type: "string" }
    ]
  };

  constructor(privateKey: string, attestationContractAddress: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.domain = {
      name: "RTFM-Sovereign",
      version: "1",
      chainId: SEPOLIA_CHAIN_ID,
      verifyingContract: attestationContractAddress
    };
  }

  public async signAttestation(data: EIP712AttestationData): Promise<string> {
    try {
      const signature = await this.wallet.signTypedData(this.domain, this.types, data);
      console.log('[EIP712] Generated signature for attestation');
      return signature;
    } catch (error) {
      console.error('[EIP712] Signature generation failed:', error);
      throw error;
    }
  }

  public async verifySignature(
    data: EIP712AttestationData,
    signature: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        this.types,
        data,
        signature
      );
      const isValid = recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();
      console.log(`[EIP712] Signature verification: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error('[EIP712] Verification failed:', error);
      return false;
    }
  }

  public getSignerAddress(): string {
    return this.wallet.address;
  }
}

export async function createContractIntegration(config: ContractConfig): Promise<ContractIntegration> {
  return new ContractIntegration(config);
}

export async function createEIP712Signer(
  privateKey: string,
  attestationContractAddress: string
): Promise<EIP712Signer> {
  return new EIP712Signer(privateKey, attestationContractAddress);
}
