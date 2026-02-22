import { ethers } from 'ethers';
import { TEEIdentity, AttestationData as IdentityAttestationData } from './signer';
import { logger } from '../utils/logger';

export interface AttestationData {
  user: string;
  topic: string;
  score: number;
  nonce: bigint;
  deadline: number;
}

export interface SignedAttestation {
  signature: string;
  attestationHash: string;
}

// Duplicate config for hashing purposes only
const DOMAIN = {
  name: "RTFM-Sovereign",
  version: "1",
  chainId: 11155111,
  verifyingContract: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
};

const TYPES = {
  Attestation: [
    { name: "user", type: "address" },
    { name: "topic", type: "string" },
    { name: "score", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

export class SignService {
  private identity: TEEIdentity;
  private nonceMap: Map<string, bigint>;

  constructor(identity: TEEIdentity) {
    this.identity = identity;
    this.nonceMap = new Map<string, bigint>();
    logger.info({ service: 'SignService' }, 'SignService initialized');
  }

  public getNextNonce(userAddress: string): bigint {
    const current = this.nonceMap.get(userAddress) || BigInt(0);
    const next = current + BigInt(1);
    this.nonceMap.set(userAddress, next);
    return next;
  }

  public async signAttestation(data: AttestationData): Promise<SignedAttestation> {
    try {
      const identityData: IdentityAttestationData = {
        user: data.user,
        topic: data.topic,
        score: data.score,
        nonce: Number(data.nonce),
        deadline: data.deadline
      };

      // Delegate signing to TEEIdentity
      const signature = await this.identity.signAttestation(identityData);

      // Compute hash for verification
      const attestationHash = ethers.TypedDataEncoder.hash(DOMAIN, TYPES, identityData);

      logger.info(
        { user: data.user, nonce: data.nonce.toString(), score: data.score },
        'Attestation signed successfully'
      );

      return {
        signature,
        attestationHash
      };
    } catch (error) {
      logger.error(
        { error: (error as Error).message, user: data.user },
        'Failed to sign attestation'
      );
      throw new Error('Signing failed');
    }
  }
}
