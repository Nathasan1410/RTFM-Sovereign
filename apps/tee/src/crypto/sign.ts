import { ethers } from 'ethers';
import { TEESigner } from './signer';
import { logger } from '../utils/logger';

// EIP-712 Domain Separator Configuration
// MUST MATCH SOLIDITY CONTRACT EXACTLY
const DOMAIN = {
  name: 'RTFM-Sovereign',
  version: '1',
  chainId: 11155111, // Sepolia
  verifyingContract: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// EIP-712 Types Configuration
// MUST MATCH SOLIDITY STRUCT
const TYPES = {
  Attestation: [
    { name: 'user', type: 'address' },
    { name: 'topic', type: 'string' },
    { name: 'score', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export interface AttestationData {
  user: string;
  topic: string;
  score: number;
  nonce: bigint;
  deadline: number;
}

export interface SignedAttestation {
  signature: string;
  r: string;
  s: string;
  v: number;
  attestationHash: string; // The hash of the data that was signed
}

export class SignService {
  private signer: TEESigner;
  private nonceMap: Map<string, bigint>;

  constructor(signer: TEESigner) {
    this.signer = signer;
    this.nonceMap = new Map<string, bigint>();
    logger.info({ service: 'SignService' }, 'SignService initialized');
  }

  /**
   * Generates next nonce for user.
   * In production, this should sync with contract state on startup.
   */
  public getNextNonce(userAddress: string): bigint {
    const current = this.nonceMap.get(userAddress) || BigInt(0);
    const next = current + BigInt(1);
    this.nonceMap.set(userAddress, next);
    return next;
  }

  /**
   * Signs attestation data using EIP-712 standard.
   * Ensures deterministic output for same inputs.
   */
  public async signAttestation(data: AttestationData): Promise<SignedAttestation> {
    // 1. Validate Input
    if (!ethers.isAddress(data.user)) {
      throw new Error('Invalid user address');
    }
    if (data.score < 0 || data.score > 100) {
      throw new Error('Invalid score (0-100)');
    }
    if (data.deadline <= Math.floor(Date.now() / 1000)) {
      throw new Error('Deadline must be in the future');
    }

    // 2. Create Struct
    const value = {
      user: data.user,
      topic: data.topic,
      score: BigInt(data.score),
      nonce: data.nonce,
      deadline: BigInt(data.deadline),
    };

    try {
      // 3. Sign with ethers.js
      // This uses wallet.signTypedData under the hood
      const signature = await this.signer.signTypedData(DOMAIN, TYPES, value);
      
      // 4. Parse Components
      const sig = ethers.Signature.from(signature);
      
      // Calculate hash for verification (optional but useful)
      const structHash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, value);

      logger.info(
        { user: data.user, nonce: data.nonce.toString(), score: data.score },
        'Attestation signed successfully'
      );

      return {
        signature,
        r: sig.r,
        s: sig.s,
        v: sig.v,
        attestationHash: structHash,
      };
    } catch (error) {
      logger.error(
        { error: (error as Error).message, user: data.user },
        'Failed to sign attestation'
      );
      throw new Error('Signing failed');
    }
  }

  public getSignerAddress(): string {
    return this.signer.getAddress();
  }
}
