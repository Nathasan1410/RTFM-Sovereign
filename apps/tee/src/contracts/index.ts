import { ethers } from 'ethers';
import SkillAttestationABI from './abis/SkillAttestation.json';
import SkillStakingABI from './abis/SkillStaking.json';

const SEPOLIA_CHAIN_ID = 11155111;

export interface ContractConfig {
  attestationAddress: string;
  stakingAddress: string;
  rpcUrl: string;
  privateKey: string;
}

export class ContractIntegration {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  public attestation: ethers.Contract;
  public staking: ethers.Contract;

  constructor(config: ContractConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    
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
      const tx = await this.staking.recordMilestone(userAddress, skill, milestoneId);
      console.log(`[Contract] recordMilestone tx submitted: ${tx.hash}`);
      await tx.wait();
      console.log(`[Contract] recordMilestone confirmed: ${tx.hash}`);
      return tx;
    } catch (error) {
      console.error('[Contract] recordMilestone failed:', error);
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
      const tx = await this.attestation.submitAttestation(
        user,
        skill,
        score,
        signature,
        ipfsHash,
        milestoneScores
      );
      console.log(`[Contract] submitAttestation tx submitted: ${tx.hash}`);
      await tx.wait();
      console.log(`[Contract] submitAttestation confirmed: ${tx.hash}`);
      return tx;
    } catch (error) {
      console.error('[Contract] submitAttestation failed:', error);
      throw error;
    }
  }

  public async claimRefund(
    user: string,
    skill: string,
    finalScore: number
  ): Promise<ethers.ContractTransactionResponse> {
    try {
      const tx = await this.staking.claimRefund(user, skill, finalScore);
      console.log(`[Contract] claimRefund tx submitted: ${tx.hash}`);
      await tx.wait();
      console.log(`[Contract] claimRefund confirmed: ${tx.hash}`);
      return tx;
    } catch (error) {
      console.error('[Contract] claimRefund failed:', error);
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
