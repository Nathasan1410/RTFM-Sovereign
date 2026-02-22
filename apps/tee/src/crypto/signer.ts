import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const SEALED_PATH = process.env.SEALED_PATH || '/app/sealed';
const KEY_FILE = path.join(SEALED_PATH, 'tee-key.json');

/**
 * Manages the TEE identity keypair.
 * Supports EigenCompute KMS (via MNEMONIC env var) and local dev fallback.
 */
export class TEESigner {
  private wallet: ethers.Wallet;

  constructor() {
    this.wallet = this.loadOrGenerateKey();
  }

  private loadOrGenerateKey(): ethers.Wallet {
    // 1. Priority: EigenCompute KMS (Production)
    if (process.env.MNEMONIC) {
      console.log('🔒 Initializing TEE Identity from EigenCompute KMS...');
      try {
        const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC);
        console.log(`✅ TEE Identity Active: ${wallet.address}`);
        return wallet;
      } catch (error) {
        console.error('❌ Failed to derive wallet from MNEMONIC:', (error as Error).message);
        throw new Error('Critical: Invalid MNEMONIC provided by KMS');
      }
    }

    // 2. Fallback: Local Development / Simulation Mode
    console.warn('⚠️  MNEMONIC not found. Using local file-based key (NOT SECURE FOR PRODUCTION).');
    
    try {
      if (fs.existsSync(KEY_FILE)) {
        console.log('📂 Loading existing local key...');
        const data = fs.readFileSync(KEY_FILE, 'utf8');
        const keyData = JSON.parse(data);
        return new ethers.Wallet(keyData.privateKey);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load local key, generating new one:', (error as Error).message);
    }

    console.log('🎲 Generating new local key for simulation...');
    const randomWallet = ethers.Wallet.createRandom();
    
    // Save locally for persistence during dev
    try {
      if (!fs.existsSync(SEALED_PATH)) {
        fs.mkdirSync(SEALED_PATH, { recursive: true });
      }
      const keyData = {
        privateKey: randomWallet.privateKey,
        address: randomWallet.address,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(KEY_FILE, JSON.stringify(keyData, null, 2), { mode: 0o600 });
      console.log(`💾 Local Identity saved: ${randomWallet.address}`);
    } catch (error) {
      console.error('❌ Failed to save local key:', (error as Error).message);
    }

    return randomWallet;
  }

  public getAddress(): string {
    return this.wallet.address;
  }

  public getPublicKey(): string {
    return this.wallet.signingKey.publicKey;
  }

  public async signMessage(message: string | Uint8Array): Promise<string> {
    return this.wallet.signMessage(message);
  }

  public async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    return this.wallet.signTypedData(domain, types, value);
  }

  /**
   * Simulates SGX Remote Attestation
   * In production, this calls the SGX hardware to generate a Quote
   */
  public getAttestationQuote(): { quote: string; publicKey: string } {
    // Mock quote for hackathon MVP
    // Real implementation would use: sgx_get_quote(...)
    return {
      quote: Buffer.from('MOCK_SGX_QUOTE_PROOF_OF_TEE_EXECUTION').toString('base64'),
      publicKey: this.getPublicKey()
    };
  }

  public isReady(): boolean {
    try {
      return !!this.wallet && !!this.wallet.address && !!this.wallet.signingKey;
    } catch {
      return false;
    }
  }
}
