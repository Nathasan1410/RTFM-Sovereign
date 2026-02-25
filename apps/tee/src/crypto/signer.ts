import { ethers } from 'ethers';
import * as fs from 'fs';
import * as crypto from 'crypto';

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

export interface AttestationQuote {
  quote: string;       // Base64-encoded SGX quote
  publicKey: string;   // TEE public key (for signature verification)
  measurement: string; // MRENCLAVE hash (0x + 64 hex chars)
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
 * SGX Quote Structure (simplified)
 * Based on Intel SGX ECDSA Quote Specification
 * https://download.01.org/intel-sgx/sgx-linux/2.9/docs/Intel_SGX_ECDSA_Attestation_API_Specification.pdf
 */
interface SGXQuoteBody {
  version: number;
  attestationKeyType: number;
  reserved1: number;
  attestationKeyMode: number;
  miscSelect: number;
  reserved2: number;
  attributes: Uint8Array;
  mrEnclave: Uint8Array;      // 32 bytes - Measurement (MRENCLAVE)
  reserved3: Uint8Array;       // 32 bytes
  mrSigner: Uint8Array;        // 32 bytes
  reserved4: Uint8Array;       // 96 bytes
  reportData: Uint8Array;      // 64 bytes
}

/**
 * TEEIdentity: Sovereign Identity Management with SGX Attestation
 *
 * Features:
 * - SGX quote generation (real or mock based on environment)
 * - Key sealing/unsealing for persistent identity
 * - EIP-712 typed data signing
 * - KMS injection support
 */
export class TEEIdentity {
  private wallet: ethers.Wallet | ethers.HDNodeWallet;
  private domain: EIP712Domain;
  private sealedKeyPath: string;
  private sgxEnabled: boolean;
  private useMockTee: boolean;

  constructor() {
    // CRITICAL: Validate KMS injection
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic || mnemonic.split(' ').length !== 12) {
      throw new Error('KMS_INJECTION_FAILURE: MNEMONIC invalid or missing');
    }

    // Check SGX configuration
    this.sgxEnabled = process.env.SGX_ENABLED === 'true';
    this.useMockTee = process.env.USE_MOCK_TEE === 'true';

    // Set sealed key path
    this.sealedKeyPath = process.env.SGX_SEALED_KEY_PATH || '/tmp/tee_key.sealed';

    // Try to unseal existing key, or generate new one
    const existingKey = this.tryUnsealKey();
    if (existingKey) {
      // Use unsealed key - always creates a regular Wallet
      this.wallet = new ethers.Wallet(existingKey);
    } else {
      // Generate from mnemonic - returns HDNodeWallet
      this.wallet = ethers.Wallet.fromPhrase(mnemonic);
      this.sealKey(this.wallet.privateKey);
    }

    // EIP-712 Domain Configuration
    this.domain = {
      name: "RTFM-Sovereign",
      version: "1",
      chainId: 11155111, // Sepolia
      verifyingContract: process.env.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
    };
  }

  getAddress(): string { return this.wallet.address; }

  /**
   * Generate SGX attestation quote
   *
   * In production with SGX hardware: Returns real DCAP quote
   * In development/mock mode: Returns mock quote with valid structure
   *
   * @returns Promise containing base64-encoded quote, public key, and measurement
   */
  async getAttestationQuote(): Promise<AttestationQuote> {
    if (this.sgxEnabled && !this.useMockTee) {
      return await this.generateRealSGXQuote();
    } else {
      return this.getMockAttestationQuote();
    }
  }

  /**
   * Generate real SGX quote using DCAP libraries
   *
   * This is called when SGX_ENABLED=true and USE_MOCK_TEE=false
   * Requires actual SGX hardware and DCAP libraries installed
   */
  private async generateRealSGXQuote(): Promise<AttestationQuote> {
    try {
      // TODO: Integrate with real DCAP quote provider
      // For now, this will throw as SGX hardware is not available in most environments
      throw new Error('SGX_DCAP_NOT_AVAILABLE: Real SGX attestation requires DCAP libraries and SGX hardware');

      // Example implementation with DCAP (would require @sgx-dcap/quote-provider):
      // const quoteProvider = new QuoteProvider();
      // const quote = await quoteProvider.getQuote({
      //   nonce: Buffer.from(this.wallet.address.slice(2), 'hex'),
      //   reportData: Buffer.from(this.wallet.signingKey.publicKey, 'hex')
      // });
      // const measurement = this.extractMeasurementFromQuote(quote);
      // return {
      //   quote: Buffer.from(quote).toString('base64'),
      //   publicKey: this.wallet.signingKey.publicKey,
      //   measurement: measurement
      // };
    } catch (error) {
      throw new Error(`SGX_QUOTE_GENERATION_FAILED: ${(error as Error).message}`);
    }
  }

  /**
   * Generate mock attestation quote for development/testing
   *
   * Returns a valid structure that mimics real SGX quote format
   * but uses deterministic mock data for testing
   */
  private getMockAttestationQuote(): AttestationQuote {
    // Create a mock quote that resembles SGX quote structure
    const mockQuoteData = Buffer.alloc(512); // Typical quote size

    // Write mock quote header
    mockQuoteData.writeUInt16LE(3, 0);     // version: 3
    mockQuoteData.writeUInt16LE(2, 2);     // attestationKeyType: ECDSA
    mockQuoteData.writeUInt16LE(1, 4);     // attestationKeyMode

    // Write mock MRENCLAVE (measurement) at offset 48+32=80
    // Using deterministic hash based on wallet address
    const measurementHash = crypto.createHash('sha256')
      .update(this.wallet.address + 'RTFM_TEE_ENCLAVE')
      .digest();
    measurementHash.copy(mockQuoteData, 80);

    // Write public key into report data
    const pubKeyBuffer = Buffer.from(this.wallet.signingKey.publicKey.slice(2), 'hex');
    pubKeyBuffer.copy(mockQuoteData, 400); // reportData offset

    return {
      quote: mockQuoteData.toString('base64'),
      publicKey: this.wallet.signingKey.publicKey,
      measurement: '0x' + measurementHash.toString('hex')
    };
  }

  /**
   * Extract MRENCLAVE (measurement) from SGX quote
   *
   * SGX quote structure:
   * - Header: 48 bytes
   * - Body: 384 bytes (starts at offset 48)
   *   - MRENCLAVE is at body offset 32 (total offset 80)
   */
  private extractMeasurementFromQuote(quote: Buffer): string {
    const HEADER_SIZE = 48;
    const MRENCLAVE_OFFSET_IN_BODY = 32;
    const MRENCLAVE_SIZE = 32;

    const measurementBytes = quote.slice(
      HEADER_SIZE + MRENCLAVE_OFFSET_IN_BODY,
      HEADER_SIZE + MRENCLAVE_OFFSET_IN_BODY + MRENCLAVE_SIZE
    );

    return '0x' + measurementBytes.toString('hex');
  }

  /**
   * Seal private key using SGX sealing (or mock sealing)
   *
   * In real SGX: Uses sgx_seal to encrypt with enclave-specific key
   * In mock mode: Uses AES encryption with file storage
   */
  private sealKey(privateKey: string): void {
    try {
      // Create directory if needed
      const dir = require('path').dirname(this.sealedKeyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (this.sgxEnabled) {
        // In real SGX, use hardware sealing
        // For now, use mock sealing
        this.mockSealKey(privateKey);
      } else {
        this.mockSealKey(privateKey);
      }
    } catch (error) {
      // Log warning but don't fail - TEE can still function with transient key
      console.warn(`Key sealing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Mock key sealing using AES encryption
   */
  private mockSealKey(privateKey: string): void {
    // Use wallet address as salt for deterministic encryption
    const salt = crypto.createHash('sha256')
      .update(this.wallet.address + 'TEE_SEALING_SALT')
      .digest();

    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(privateKey, salt, 100000, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const sealedData = JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
      address: this.wallet.address
    });

    fs.writeFileSync(this.sealedKeyPath, sealedData, { mode: 0o600 });
  }

  /**
   * Try to unseal existing private key
   *
   * @returns Private key if unsealing succeeds, null otherwise
   */
  private tryUnsealKey(): string | null {
    try {
      if (!fs.existsSync(this.sealedKeyPath)) {
        return null;
      }

      const sealedData = JSON.parse(fs.readFileSync(this.sealedKeyPath, 'utf8'));

      // Try to unseal
      const salt = crypto.createHash('sha256')
        .update(sealedData.address + 'TEE_SEALING_SALT')
        .digest();

      const iv = Buffer.from(sealedData.iv, 'hex');
      const authTag = Buffer.from(sealedData.authTag, 'hex');
      const key = crypto.pbkdf2Sync(sealedData.encrypted, salt, 100000, 32, 'sha256');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(sealedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If unsealing fails, return null to generate new key
      console.warn(`Key unsealing failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Sign attestation data using EIP-712 typed data
   *
   * @param data - Attestation data to sign
   * @returns EIP-712 signature (132 chars: 0x + r + s + v)
   */
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
