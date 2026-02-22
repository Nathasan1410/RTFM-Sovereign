import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const SEALED_PATH = process.env.SEALED_PATH || '/app/sealed';
const KEY_FILE = path.join(SEALED_PATH, 'tee-key.json'); // Changed to .json per spec

/**
 * Manages the TEE identity keypair.
 * Generates a new key if none exists, or loads the existing one.
 * In a real SGX environment, this file would be sealed to the enclave.
 */
export class TEESigner {
  private wallet: ethers.Wallet;

  constructor() {
    this.wallet = this.loadOrGenerateKey();
  }

  private loadOrGenerateKey(): ethers.Wallet {
    try {
      if (fs.existsSync(KEY_FILE)) {
        console.log('Loading existing TEE key...');
        // Load JSON format { privateKey: "0x...", address: "0x..." }
        const data = fs.readFileSync(KEY_FILE, 'utf8');
        const keyData = JSON.parse(data);
        
        if (!keyData.privateKey || !ethers.isHexString(keyData.privateKey)) {
          throw new Error('Invalid key format in sealed file');
        }

        return new ethers.Wallet(keyData.privateKey);
      }
    } catch (error) {
      console.warn('Failed to load key, generating new one:', (error as Error).message);
    }

    console.log('Generating new TEE key...');
    // Generate cryptographically secure random wallet
    const randomWallet = ethers.Wallet.createRandom();
    const privateKey = randomWallet.privateKey;
    const address = randomWallet.address;
    
    // Save key (in production this writes to sealed storage)
    try {
      if (!fs.existsSync(SEALED_PATH)) {
        fs.mkdirSync(SEALED_PATH, { recursive: true });
      }
      
      // Save as JSON object
      const keyData = {
        privateKey: privateKey,
        address: address,
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(KEY_FILE, JSON.stringify(keyData, null, 2), { mode: 0o600 });
      console.log(`TEE Identity created: ${address}`); // Log only address
    } catch (error) {
      console.error('Failed to save TEE key:', (error as Error).message);
    }

    return new ethers.Wallet(privateKey);
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
