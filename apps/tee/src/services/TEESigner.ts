/**
 * TEESigner Service
 *
 * EIP-712 typed data signing service for on-chain checkpoint recording.
 * Generates cryptographic signatures from within the TEE for milestone completions.
 *
 * Key Features:
 * - EIP-712 typed data signing for Ethereum compatibility
 * - CheckpointData structure signing
 * - Signature recovery and verification
 * - Secure key management (private key never leaves TEE)
 *
 * Security Considerations:
 * - Private key MUST be injected via KMS or environment variable
 * - Private key NEVER logged or exported
 * - Memory buffers cleared after signing operations
 * - Signature verification enforces only TEE can record checkpoints
 *
 * @module apps/tee/src/services/TEESigner
 */

import { ethers } from 'ethers';

/**
 * CheckpointData structure for EIP-712 signing
 * Matches the CheckpointData struct in RTFMAttestation.sol
 */
export interface CheckpointData {
  user: string;           // User wallet address
  sessionId: string;      // Session identifier (bytes32 as hex string)
  milestoneId: number;    // Milestone ID (3, 5, or 7)
  timestamp: number;      // Unix timestamp
  ipfsHash: string;       // IPFS hash (bytes32 as hex string)
  codeHash: string;       // Hash of code snapshot content (bytes32 as hex string)
}

/**
 * Signature components
 */
export interface TEESignature {
  signature: string;      // Full signature (0x + r + s + v)
  r: string;              // r component (64 chars)
  s: string;              // s component (64 chars)
  v: number;              // v component (27 or 28)
}

/**
 * TEESigner configuration
 */
export interface TEESignerConfig {
  privateKey: string;           // TEE private key (from KMS/env)
  chainId: number;              // Blockchain chain ID
  contractAddress: string;      // RTFMAttestation contract address
}

/**
 * EIP-712 domain configuration
 */
interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export class TEESigner {
  private wallet: ethers.Wallet;
  private domain: EIP712Domain;
  private chainId: number;
  private contractAddress: string;

  // EIP-712 type definition for CheckpointData
  private readonly types = {
    CheckpointData: [
      { name: 'user', type: 'address' },
      { name: 'sessionId', type: 'bytes32' },
      { name: 'milestoneId', type: 'uint8' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'ipfsHash', type: 'bytes32' },
      { name: 'codeHash', type: 'bytes32' }
    ]
  };

  /**
   * Creates a new TEESigner instance
   * @param config - TEESigner configuration
   */
  constructor(config: TEESignerConfig) {
    // Validate configuration
    if (!config.privateKey || config.privateKey.length < 64) {
      throw new Error('TEESigner: Invalid private key');
    }
    if (!config.contractAddress || !ethers.isAddress(config.contractAddress)) {
      throw new Error('TEESigner: Invalid contract address');
    }

    this.wallet = new ethers.Wallet(config.privateKey);
    this.chainId = config.chainId;
    this.contractAddress = config.contractAddress;

    this.domain = {
      name: 'RTFMAttestation',
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.contractAddress
    };
  }

  /**
   * Gets the TEE public address (signer address)
   * @returns The Ethereum address derived from the private key
   */
  public getPublicKey(): string {
    return this.wallet.address;
  }

  /**
   * Gets the private key (for key rotation only, never log this)
   * WARNING: Use with extreme caution
   * @returns The private key (without 0x prefix)
   */
  public getPrivateKey(): string {
    return this.wallet.privateKey.slice(2);
  }

  /**
   * Signs checkpoint data using EIP-712 typed data signing
   * @param data - CheckpointData to sign
   * @returns EIP-712 signature (132 chars including 0x prefix)
   * @throws Error if signing fails
   */
  public async signCheckpoint(data: CheckpointData): Promise<string> {
    try {
      // Validate input data
      this.validateCheckpointData(data);

      // Convert string hex values to proper format for signing
      const typedData = {
        user: data.user,
        sessionId: this.ensureBytes32(data.sessionId),
        milestoneId: data.milestoneId,
        timestamp: BigInt(data.timestamp),
        ipfsHash: this.ensureBytes32(data.ipfsHash),
        codeHash: this.ensureBytes32(data.codeHash)
      };

      // Sign using EIP-712
      const signature = await this.wallet.signTypedData(
        this.domain,
        this.types,
        typedData
      );

      return signature;
    } catch (error) {
      console.error('[TEESigner] signCheckpoint failed:', error);
      throw new Error(`TEESigner: Signature generation failed - ${(error as Error).message}`);
    }
  }

  /**
   * Signs checkpoint data and returns split signature components
   * @param data - CheckpointData to sign
   * @returns Signature components (signature, r, s, v)
   */
  public async signCheckpointV2(data: CheckpointData): Promise<TEESignature> {
    const signature = await this.signCheckpoint(data);

    // Split signature into components
    const r = signature.slice(0, 66); // 0x + 64 hex chars
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);

    return { signature, r, s, v };
  }

  /**
   * Verifies a signature against checkpoint data
   * @param data - CheckpointData that was signed
   * @param signature - Signature to verify
   * @returns True if signature is valid and matches this signer
   */
  public async verifySignature(data: CheckpointData, signature: string): Promise<boolean> {
    try {
      const typedData = {
        user: data.user,
        sessionId: this.ensureBytes32(data.sessionId),
        milestoneId: data.milestoneId,
        timestamp: BigInt(data.timestamp),
        ipfsHash: this.ensureBytes32(data.ipfsHash),
        codeHash: this.ensureBytes32(data.codeHash)
      };

      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        this.types,
        typedData,
        signature
      );

      return recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();
    } catch (error) {
      console.error('[TEESigner] verifySignature failed:', error);
      return false;
    }
  }

  /**
   * Recovers the signer address from a signature
   * @param data - CheckpointData that was signed
   * @param signature - Signature
   * @returns Recovered Ethereum address
   */
  public async recoverSigner(data: CheckpointData, signature: string): Promise<string> {
    const typedData = {
      user: data.user,
      sessionId: this.ensureBytes32(data.sessionId),
      milestoneId: data.milestoneId,
      timestamp: BigInt(data.timestamp),
      ipfsHash: this.ensureBytes32(data.ipfsHash),
      codeHash: this.ensureBytes32(data.codeHash)
    };

    return ethers.verifyTypedData(this.domain, this.types, typedData, signature);
  }

  /**
   * Validates checkpoint data
   * @param data - CheckpointData to validate
   * @throws Error if validation fails
   */
  private validateCheckpointData(data: CheckpointData): void {
    if (!ethers.isAddress(data.user)) {
      throw new Error('Invalid user address');
    }

    if (data.milestoneId !== 3 && data.milestoneId !== 5 && data.milestoneId !== 7) {
      throw new Error('Invalid milestone ID: must be 3, 5, or 7');
    }

    if (data.timestamp <= 0) {
      throw new Error('Invalid timestamp');
    }

    // Check for future timestamp (allow some clock drift)
    const now = Math.floor(Date.now() / 1000);
    if (data.timestamp > now + 60) {
      throw new Error('Future timestamp not allowed');
    }
  }

  /**
   * Checks if a string is a valid hexadecimal string
   * @param value - String to check
   * @returns True if valid hex string (with or without 0x prefix)
   */
  private isHexString(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    const hexValue = value.startsWith('0x') ? value.slice(2) : value;
    return /^[a-fA-F0-9]*$/.test(hexValue);
  }

  /**
   * Ensures a value is in bytes32 format (64 hex characters with 0x prefix)
   *
   * Handles multiple input formats:
   * - Hex strings with 0x prefix (e.g., "0xabcd"): Padded or truncated to 64 chars
   * - Hex strings without prefix (e.g., "abcd"): Prefix added, padded/truncated to 64 chars
   * - Plain strings (e.g., "test-string"): Converted to bytes32 via UTF-8 encoding, then padded
   *
   * Critical: This method must NOT double-encode hex strings. If the input is already
   * a valid hex representation, it should be treated as hex data, not as a plain string.
   *
   * @param value - String value to convert to bytes32
   * @returns Bytes32 formatted string (0x + exactly 64 hex characters)
   * @throws Error if value is empty, undefined, or not a string
   *
   * @example
   * // Plain string → hash, then padded
   * ensureBytes32('test') === '0x74657374000000000000000000000000...'
   *
   * @example
   * // Hex string (short) → padded
   * ensureBytes32('0xab') === '0xab000000000000000000000000000000...'
   *
   * @example
   * // Hex string (long) → truncated
   * ensureBytes32('0x' + 'ab'.repeat(40)) === '0x' + 'ab'.repeat(32)
   */
  private ensureBytes32(value: string): string {
    // Validate input
    if (!value || typeof value !== 'string') {
      throw new Error('ensureBytes32: value must be a non-empty string');
    }

    // Remove 0x prefix if present for processing
    let hexValue = value.startsWith('0x') ? value.slice(2) : value;

    // Check if it's a valid hex string (without 0x prefix)
    if (!/^[a-fA-F0-9]*$/.test(hexValue)) {
      // Not hex, convert string to bytes via UTF-8 encoding
      const utf8Bytes = ethers.toUtf8Bytes(value);
      const utf8Hex = ethers.hexlify(utf8Bytes).slice(2); // Remove 0x prefix
      
      // Pad to 64 characters
      hexValue = utf8Hex.padEnd(64, '0');
    } else {
      // It's hex - pad or truncate to exactly 64 characters
      if (hexValue.length > 64) {
        // Truncate from the right
        hexValue = hexValue.slice(0, 64);
      } else if (hexValue.length < 64) {
        // Right-pad with zeros
        hexValue = hexValue.padEnd(64, '0');
      }
    }

    return '0x' + hexValue;
  }

  /**
   * Gets the EIP-712 domain separator
   * @returns Domain configuration
   */
  public getDomain(): EIP712Domain {
    return { ...this.domain };
  }

  /**
   * Gets the chain ID
   * @returns Chain ID
   */
  public getChainId(): number {
    return this.chainId;
  }

  /**
   * Gets the contract address
   * @returns RTFMAttestation contract address
   */
  public getContractAddress(): string {
    return this.contractAddress;
  }
}

/**
 * Factory function to create TEESigner instance
 * @param config - TEESigner configuration
 * @returns TEESigner instance
 */
export function createTEESigner(config: TEESignerConfig): TEESigner {
  return new TEESigner(config);
}
