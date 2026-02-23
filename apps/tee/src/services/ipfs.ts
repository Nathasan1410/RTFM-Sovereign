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
 *
 * Dependencies:
 * - Pinata API: IPFS pinning service
 * - Axios: HTTP client for API requests
 *
 * @module apps/tee/src/services/ipfs
 */

import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud';

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

export class IPFSService {
  private apiKey: string;
  private secretApiKey: string;
  private jwt: string | undefined;

  constructor(credentials: IPFSCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretApiKey = credentials.secretApiKey;
    this.jwt = credentials.jwt;
  }

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

      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (this.jwt) {
        headers['Authorization'] = `Bearer ${this.jwt}`;
      } else {
        headers['pinata_api_key'] = this.apiKey;
        headers['pinata_secret_api_key'] = this.secretApiKey;
      }

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
        data,
        { headers }
      );

      const ipfsHash = response.data.IpfsHash;
      console.log(`[IPFS] Snapshot uploaded: ${ipfsHash}`);
      return ipfsHash;
    } catch (error) {
      console.error('[IPFS] Upload failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('[IPFS] Response:', error.response?.data);
      }
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async retrieveSnapshot(ipfsHash: string): Promise<IPFSSnapshot | null> {
    try {
      const response = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        {
          timeout: 10000
        }
      );

      console.log(`[IPFS] Snapshot retrieved: ${ipfsHash}`);
      return response.data as IPFSSnapshot;
    } catch (error) {
      console.error('[IPFS] Retrieval failed:', error);
      return null;
    }
  }

  public async uploadSingleFile(content: string, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([content], { type: 'text/plain' }), filename);

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.secretApiKey
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      const ipfsHash = response.data.IpfsHash;
      console.log(`[IPFS] File uploaded: ${ipfsHash}`);
      return ipfsHash;
    } catch (error) {
      console.error('[IPFS] File upload failed:', error);
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public static getGatewayUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

export async function createIPFSService(credentials: IPFSCredentials): Promise<IPFSService> {
  return new IPFSService(credentials);
}
