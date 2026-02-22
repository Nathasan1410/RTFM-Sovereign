import { ethers } from 'ethers';

interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface AttestationData {
  user: string;      // address
  topic: string;     // keccak256 hash or plain (match contract)
  score: number;     // uint256 (0-100)
  nonce: number;     // uint256 (timestamp or counter)
  deadline: number;  // uint256 (unix timestamp)
}

const TYPES = {
  Attestation: [
    { name: "user", type: "address" },
    { name: "topic", type: "string" },
    { name: "score", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

/**
 * TEEIdentity: Sovereign Identity Management
 * - No private key persistence
 * - No key logging
 * - KMS injection only
 */
export class TEEIdentity {
  private wallet: ethers.HDNodeWallet;
  private domain: EIP712Domain;

  constructor() {
    // CRITICAL: Validate KMS injection
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic || mnemonic.split(' ').length !== 12) {
      throw new Error('KMS_INJECTION_FAILURE: MNEMONIC invalid or missing');
    }

    this.wallet = ethers.Wallet.fromPhrase(mnemonic);

    // EIP-712 Domain Configuration
    // Uses real contract address injected via env
    this.domain = {
      name: "RTFM-Sovereign",
      version: "1",
      chainId: 11155111, // Sepolia
      verifyingContract: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
    };
  }

  getAddress(): string { return this.wallet.address; }

  // Helper for /identity endpoint (mock quote for hackathon)
  getAttestationQuote(): { quote: string; publicKey: string } {
    return {
      quote: Buffer.from('MOCK_SGX_QUOTE_PROOF_OF_TEE_EXECUTION').toString('base64'),
      publicKey: this.wallet.signingKey.publicKey
    };
  }

  async signAttestation(data: AttestationData): Promise<string> {
    // Input validation
    if (data.score < 0 || data.score > 100) throw new Error("INVALID_SCORE");
    if (data.deadline < Math.floor(Date.now()/1000)) throw new Error("EXPIRED_DEADLINE");

    // Critical: Use signTypedData, NOT signMessage
    const signature = await this.wallet.signTypedData(this.domain, TYPES, data);

    // Verify self-recoverable (paranoid check)
    const recovered = ethers.verifyTypedData(this.domain, TYPES, data, signature);
    if (recovered.toLowerCase() !== this.wallet.address.toLowerCase()) {
      throw new Error("SIGNATURE_CORRUPTION");
    }

    return signature; // 0x + r(64) + s(64) + v(2) = 132 chars
  }
}
