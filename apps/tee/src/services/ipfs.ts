/**
 * IPFS Service
 *
 * Decentralized storage service using Pinata IPFS gateway.
 * Handles uploading and pinning code snapshots and project data to IPFS.
 *
 * Key Responsibilities:
 * - Upload code snapshots to IPFS via Pinata
 * - Pin files for persistent storage
 * - Return IPFS hashes (CID) for blockchain reference
 * - Attach metadata to uploads (project, user, score)
 * - Handle authentication with API keys or JWT
 * - Compression support for large files
 * - Batch upload capabilities
 * - Upload verification
 *
 * Dependencies:
 * - Pinata API: IPFS pinning service
 * - Axios: HTTP client for API requests
 * - zlib: Compression/decompression
 *
 * @module apps/tee/src/services/ipfs
 */

import axios from 'axios';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { agentLogger } from '../utils/logger';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface IPFSCredentials {
  apiKey: string;
  secretApiKey: string;
  jwt?: string;
}

export interface MilestoneData {
  id: number;
  code: string;
  score: number;
  feedback: string;
  timestamp: number;
}

export interface IPFSSnapshot {
  project: string;
  user: string;
  milestones: MilestoneData[];
  final_score: number;
  attestation_tx: string | null;
}

export interface IPFSUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
}

export interface BatchUploadResult {
  ipfsHashes: string[];
  totalSize: number;
  duration: number;
}

export class IPFSService {
  private apiKey: string;
  private secretApiKey: string;
  private jwt: string | undefined;
  private maxRetries: number = 3;
  private compressionThreshold: number = 1000000; // 1MB

  constructor(credentials: IPFSCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretApiKey = credentials.secretApiKey;
    this.jwt = credentials.jwt;
  }

  /**
   * Upload JSON data to IPFS with retry logic
   */
  public async uploadJSON(data: any, filename?: string): Promise<string> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.uploadJSONInternal(data, filename);
        
        // Verify upload
        const verified = await this.verifyUpload(result.ipfsHash);
        if (!verified) {
          throw new Error('Upload verification failed');
        }
        
        agentLogger.info({
          filename,
          hash: result.ipfsHash,
          duration: Date.now() - startTime,
          attempt
        }, 'IPFS: JSON upload successful');
        
        return result.ipfsHash;
      } catch (error) {
        if (attempt === this.maxRetries) {
          agentLogger.error({
            filename,
            attempt,
            error: (error as Error).message
          }, 'IPFS: JSON upload failed after all retries');
          throw new Error('Max retries exceeded');
        }
        
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        agentLogger.warn({
          filename,
          attempt,
          maxRetries: this.maxRetries,
          backoffMs,
          error: (error as Error).message
        }, 'IPFS: JSON upload failed, retrying...');
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private async uploadJSONInternal(data: any, filename?: string): Promise<IPFSUploadResult> {
    const content = JSON.stringify(data);

    // Automatically compress if content exceeds threshold
    if (content.length > this.compressionThreshold) {
      return this.uploadCompressedInternal(data, filename || `snapshot-${Date.now()}`, content.length);
    }

    const pinataData = {
      pinataContent: data,
      pinataMetadata: {
        name: filename || `snapshot-${Date.now()}`,
        keyvalues: {
          originalSize: content.length,
          uploadType: 'json',
          compressed: false
        }
      }
    };

    const response = await this.makePinataRequest(pinataData);

    return {
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.pinSize,
      timestamp: response.data.timestamp
    };
  }

  private async uploadCompressedInternal(data: any, filename: string, originalSize: number): Promise<IPFSUploadResult> {
    const content = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(content));
    const base64Content = compressed.toString('base64');

    const uploadData = {
      pinataContent: {
        content: base64Content,
        compressed: true,
        originalSize: originalSize
      },
      pinataMetadata: {
        name: `${filename}.gz`,
        keyvalues: {
          compressed: true,
          originalSize: originalSize,
          compressedSize: compressed.length,
          uploadType: 'compressed'
        }
      }
    };

    const response = await this.makePinataRequest(uploadData);

    return {
      ipfsHash: response.data.IpfsHash,
      pinSize: compressed.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Upload file content to IPFS with retry logic
   */
  public async uploadFile(content: string, filename: string): Promise<string> {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.uploadFileInternal(content, filename);
        
        // Verify upload
        const verified = await this.verifyUpload(result.ipfsHash);
        if (!verified) {
          throw new Error('Upload verification failed');
        }
        
        agentLogger.info({
          filename,
          hash: result.ipfsHash,
          duration: Date.now() - startTime,
          attempt
        }, 'IPFS: File upload successful');
        
        return result.ipfsHash;
      } catch (error) {
        if (attempt === this.maxRetries) {
          agentLogger.error({
            filename,
            attempt,
            error: (error as Error).message
          }, 'IPFS: File upload failed after all retries');
          throw new Error('Max retries exceeded');
        }
        
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        agentLogger.warn({
          filename,
          attempt,
          maxRetries: this.maxRetries,
          backoffMs,
          error: (error as Error).message
        }, 'IPFS: File upload failed, retrying...');
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private async uploadFileInternal(content: string, filename: string): Promise<IPFSUploadResult> {
    // Automatically compress if content exceeds threshold
    if (content.length > this.compressionThreshold) {
      const compressed = await gzip(Buffer.from(content));
      const base64Content = compressed.toString('base64');

      const uploadData = {
        pinataContent: {
          content: base64Content,
          compressed: true,
          originalSize: content.length,
          filename: filename
        },
        pinataMetadata: {
          name: `${filename}.gz`,
          keyvalues: {
            compressed: true,
            originalSize: content.length,
            compressedSize: compressed.length,
            uploadType: 'compressed-file'
          }
        }
      };

      const response = await this.makePinataRequest(uploadData);

      return {
        ipfsHash: response.data.IpfsHash,
        pinSize: compressed.length,
        timestamp: response.data.timestamp
      };
    }

    const formData = new FormData();
    formData.append('file', new Blob([content], { type: 'text/plain' }), filename);

    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: this.getAuthHeaders(true),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    return {
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.pinSize,
      timestamp: response.data.timestamp
    };
  }

  /**
   * Upload compressed data to IPFS
   */
  public async uploadCompressed(data: any, filename: string): Promise<string> {
    const content = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(content));
    const base64Content = compressed.toString('base64');
    
    const uploadData = {
      pinataContent: {
        content: base64Content,
        compressed: true,
        originalSize: content.length
      },
      pinataMetadata: {
        name: `${filename}.gz`,
        keyvalues: {
          compressed: true,
          originalSize: content.length,
          compressedSize: compressed.length,
          uploadType: 'compressed'
        }
      }
    };

    const response = await this.makePinataRequest(uploadData);
    return response.data.IpfsHash;
  }

  /**
   * Download and decompress data from IPFS
   */
  public async downloadAndDecompress(hash: string): Promise<any> {
    const data = await this.getFile(hash);

    // Check if data is compressed
    if (data && typeof data === 'object' && data.compressed === true && data.content) {
      const compressed = Buffer.from(data.content as string, 'base64');
      const decompressed = await gunzip(compressed);
      return JSON.parse(decompressed.toString());
    }

    return data;
  }

  /**
   * Retrieve data from IPFS
   */
  public async getFile(hash: string): Promise<any> {
    try {
      const response = await axios.get(
        `${PINATA_GATEWAY}/ipfs/${hash}`,
        {
          timeout: 15000,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status === 404) {
        throw new Error(`IPFS hash not found: ${hash}`);
      }

      return response.data;
    } catch (error) {
      agentLogger.error({ hash, error: (error as Error).message }, 'IPFS: File retrieval failed');
      throw error;
    }
  }

  /**
   * Retrieve snapshot from IPFS
   */
  public async retrieveSnapshot(ipfsHash: string): Promise<IPFSSnapshot | null> {
    try {
      const response = await axios.get(
        `${PINATA_GATEWAY}/ipfs/${ipfsHash}`,
        {
          timeout: 15000
        }
      );

      agentLogger.info({ ipfsHash }, 'IPFS: Snapshot retrieved');
      return response.data as IPFSSnapshot;
    } catch (error) {
      agentLogger.error({ ipfsHash, error: (error as Error).message }, 'IPFS: Snapshot retrieval failed');
      return null;
    }
  }

  /**
   * Upload code snapshot with metadata
   */
  public async uploadCodeSnapshot(snapshot: IPFSSnapshot): Promise<string> {
    try {
      const data = {
        pinataContent: snapshot,
        pinataMetadata: {
          name: `${snapshot.project}-${snapshot.user}-${Date.now()}`,
          keyvalues: {
            project: snapshot.project,
            user: snapshot.user,
            finalScore: snapshot.final_score.toString()
          }
        }
      };

      const response = await this.makePinataRequest(data);
      const ipfsHash = response.data.IpfsHash;
      
      agentLogger.info({ 
        project: snapshot.project, 
        user: snapshot.user, 
        ipfsHash 
      }, 'IPFS: Code snapshot uploaded');
      
      return ipfsHash;
    } catch (error) {
      agentLogger.error({ 
        project: snapshot.project, 
        error: (error as Error).message 
      }, 'IPFS: Snapshot upload failed');
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch upload multiple files
   */
  public async uploadBatch(files: Array<{ path: string; content: string }>): Promise<BatchUploadResult> {
    const startTime = Date.now();
    const ipfsHashes: string[] = [];
    let totalSize = 0;

    for (const file of files) {
      try {
        const hash = await this.uploadFile(file.content, file.path);
        ipfsHashes.push(hash);
        totalSize += file.content.length;
        
        agentLogger.info({ path: file.path, hash }, 'IPFS: Batch file uploaded');
      } catch (error) {
        agentLogger.error({ 
          path: file.path, 
          error: (error as Error).message 
        }, 'IPFS: Batch file upload failed');
        throw error;
      }
    }

    return {
      ipfsHashes,
      totalSize,
      duration: Date.now() - startTime
    };
  }

  /**
   * Verify that a file exists on IPFS
   */
  public async verifyUpload(hash: string): Promise<boolean> {
    try {
      const response = await axios.head(
        `${PINATA_GATEWAY}/ipfs/${hash}`,
        {
          timeout: 10000,
          validateStatus: (status) => status < 500
        }
      );
      return response.status === 200;
    } catch (error) {
      agentLogger.warn({ hash, error: (error as Error).message }, 'IPFS: Verification failed');
      return false;
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  public calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate file hash
   */
  public calculateFileHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get IPFS gateway URL
   */
  public static getGatewayUrl(ipfsHash: string): string {
    return `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;
  }

  /**
   * Get alternative gateway URLs for redundancy
   */
  public static getAlternativeGatewayUrls(ipfsHash: string): string[] {
    const gateways = [
      'https://ipfs.io/ipfs',
      'https://cloudflare-ipfs.com/ipfs',
      'https://dweb.link/ipfs'
    ];
    
    return gateways.map(gw => `${gw}/${ipfsHash}`);
  }

  /**
   * Make authenticated Pinata request
   */
  private async makePinataRequest(data: any): Promise<any> {
    const headers = this.getAuthHeaders();
    
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      data,
      { headers }
    );

    return response;
  }

  /**
   * Get authentication headers for Pinata
   */
  private getAuthHeaders(isFileUpload: boolean = false): any {
    if (isFileUpload) {
      return {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.secretApiKey
      };
    }

    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
    } else {
      headers['pinata_api_key'] = this.apiKey;
      headers['pinata_secret_api_key'] = this.secretApiKey;
    }

    return headers;
  }
}

export async function createIPFSService(credentials: IPFSCredentials): Promise<IPFSService> {
  return new IPFSService(credentials);
}
