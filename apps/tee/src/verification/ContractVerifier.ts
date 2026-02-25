/**
 * ContractVerifier - Smart Contract Verification Service
 *
 * Verifies certificates and checkpoints against deployed smart contracts.
 * Supports multiple networks with environment-based configuration.
 *
 * Network Support:
 * - Sepolia (testnet) - Default
 * - Mainnet
 * - Goerli (legacy)
 * - Optimism Sepolia
 *
 * @module apps/tee/src/verification/ContractVerifier
 */

import { logger } from '../utils/logger';
import { createWalletClient, http, createPublicClient, type Chain, type Address } from 'viem';
import { sepolia, mainnet, goerli, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

interface Certificate {
  owner: string;
  title: string;
  completedAt: number;
  tokenId: bigint;
  isValid: boolean;
}

interface ConnectionTestResult {
  success: boolean;
  network: {
    chainId: number;
    name: string;
    rpcUrl: string;
  };
  contracts: {
    attestation: {
      address: string;
      connected: boolean;
      error?: string;
    };
    staking: {
      address: string;
      connected: boolean;
      error?: string;
    };
  };
  timestamp: number;
}

/**
 * Get network configuration from chain ID
 */
function getNetworkConfig(chainId: number): { chain: Chain; name: string } {
  const networks: Record<number, { chain: Chain; name: string }> = {
    [sepolia.id]: { chain: sepolia, name: 'Sepolia' },
    [mainnet.id]: { chain: mainnet, name: 'Mainnet' },
    [goerli.id]: { chain: goerli, name: 'Goerli' },
    [optimismSepolia.id]: { chain: optimismSepolia, name: 'Optimism Sepolia' }
  };

  const config = networks[chainId];

  if (!config) {
    logger.warn({ chainId }, 'Unknown chain ID, defaulting to Sepolia');
    return { chain: sepolia, name: 'Sepolia (default)' };
  }

  return config;
}

/**
 * ContractVerifier - Smart contract verification service
 *
 * Verifies certificates and checkpoints against deployed contracts.
 * All contract addresses are configurable via environment variables.
 */
export class ContractVerifier {
  private walletClient: any;
  private publicClient: any;
  private privateKey: `0x${string}`;
  private chain: Chain;
  private chainName: string;
  private attestationAddress: Address;
  private stakingAddress: Address;
  private rpcUrl: string;
  private chainId: number;

  /**
   * Initialize ContractVerifier with environment-based configuration
   *
   * Environment Variables:
   * - TEE_PRIVATE_KEY: Private key for signing transactions
   * - CONTRACT_ATTESTATION: Attestation contract address
   * - CONTRACT_STAKING: Staking contract address
   * - RPC_URL: RPC endpoint URL
   * - CHAIN_ID: Chain ID (default: 11155111 for Sepolia)
   */
  constructor(privateKey: string) {
    // Validate private key
    if (!privateKey || privateKey.length !== 66 || !privateKey.startsWith('0x')) {
      throw new Error('CONTRACT_VERIFIER_INVALID_PRIVATE_KEY: Private key must be 0x followed by 64 hex characters');
    }

    this.privateKey = privateKey as `0x${string}`;

    // Get network configuration
    this.chainId = parseInt(process.env.CHAIN_ID || '11155111');
    const networkConfig = getNetworkConfig(this.chainId);
    this.chain = networkConfig.chain;
    this.chainName = networkConfig.name;

    // Get RPC URL from environment or use chain default
    this.rpcUrl = process.env.RPC_URL || this.chain.rpcUrls.default.http[0];

    // Validate contract addresses
    const attestationAddr = process.env.CONTRACT_ATTESTATION;
    const stakingAddr = process.env.CONTRACT_STAKING;

    if (!attestationAddr || !/^0x[a-fA-F0-9]{40}$/.test(attestationAddr)) {
      throw new Error('CONTRACT_VERIFIER_INVALID_ATTESTATION_ADDRESS: CONTRACT_ATTESTATION must be a valid Ethereum address');
    }

    if (!stakingAddr || !/^0x[a-fA-F0-9]{40}$/.test(stakingAddr)) {
      throw new Error('CONTRACT_VERIFIER_INVALID_STAKING_ADDRESS: CONTRACT_STAKING must be a valid Ethereum address');
    }

    this.attestationAddress = attestationAddr as Address;
    this.stakingAddress = stakingAddr as Address;

    // Create account from private key
    const account = privateKeyToAccount(this.privateKey);

    // Create wallet client for transactions
    this.walletClient = createWalletClient({
      account,
      chain: this.chain,
      transport: http(this.rpcUrl)
    });

    // Create public client for read operations
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.rpcUrl)
    });

    logger.info({
      network: this.chainName,
      chainId: this.chainId,
      attestationAddress: this.attestationAddress,
      stakingAddress: this.stakingAddress,
      rpcUrl: this.rpcUrl.replace(/\/key\/.*/, '/key/***') // Sanitize RPC URL
    }, 'ContractVerifier initialized');
  }

  /**
   * Test connection to both contracts
   *
   * @returns Connection test result with status for each contract
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const result: ConnectionTestResult = {
      success: false,
      network: {
        chainId: this.chainId,
        name: this.chainName,
        rpcUrl: this.rpcUrl.replace(/\/key\/.*/, '/key/***')
      },
      contracts: {
        attestation: {
          address: this.attestationAddress,
          connected: false
        },
        staking: {
          address: this.stakingAddress,
          connected: false
        }
      },
      timestamp: Date.now()
    };

    // Test attestation contract
    try {
      const totalSupply = await this.publicClient.readContract({
        address: this.attestationAddress,
        abi: [
          {
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'totalSupply'
      });
      result.contracts.attestation.connected = true;
      logger.info({ totalSupply }, 'Attestation contract connection successful');
    } catch (error) {
      result.contracts.attestation.connected = false;
      result.contracts.attestation.error = (error as Error).message;
      logger.error({
        address: this.attestationAddress,
        error: (error as Error).message
      }, 'Attestation contract connection failed');
    }

    // Test staking contract
    try {
      // Try to read a simple value from staking contract
      const dummyCall = await this.publicClient.readContract({
        address: this.stakingAddress,
        abi: [
          {
            inputs: [],
            name: 'getName',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'getName'
      });
      result.contracts.staking.connected = true;
      logger.info('Staking contract connection successful');
    } catch (error) {
      // Staking contract might not have getName, try another method
      try {
        await this.publicClient.readContract({
          address: this.stakingAddress,
          abi: [
            {
              inputs: [],
              name: 'owner',
              outputs: [{ name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'owner'
        });
        result.contracts.staking.connected = true;
        logger.info('Staking contract connection successful (owner check)');
      } catch (retryError) {
        result.contracts.staking.connected = false;
        result.contracts.staking.error = (retryError as Error).message;
        logger.error({
          address: this.stakingAddress,
          error: (retryError as Error).message
        }, 'Staking contract connection failed');
      }
    }

    result.success = result.contracts.attestation.connected && result.contracts.staking.connected;
    return result;
  }

  /**
   * Verify a certificate for a user
   *
   * @param userAddress - User's Ethereum address
   * @param tokenId - Certificate token ID
   * @returns Certificate with validity status
   */
  async verifyCertificate(userAddress: string, tokenId: string | number): Promise<Certificate> {
    logger.info({ userAddress, tokenId }, 'ContractVerifier: Verifying certificate');

    try {
      const cert = await this.queryCertificate(tokenId);

      const isValid = cert.owner.toLowerCase() === userAddress.toLowerCase();

      logger.info({
        userAddress,
        tokenId,
        isValid,
        owner: cert.owner
      }, 'ContractVerifier: Certificate verified');

      return {
        owner: cert.owner,
        title: cert.title,
        completedAt: cert.completedAt,
        tokenId: BigInt(tokenId),
        isValid
      };
    } catch (error) {
      logger.error({
        userAddress,
        tokenId,
        error: (error as Error).message
      }, 'ContractVerifier: Verification failed');
      throw error;
    }
  }

  /**
   * Query certificate data from attestation contract
   *
   * Uses environment-configured attestation address instead of hardcoded value.
   *
   * @param tokenId - Certificate token ID
   * @returns Certificate data from contract
   */
  async queryCertificate(tokenId: string | number): Promise<any> {
    const cert = await this.publicClient.readContract({
      address: this.attestationAddress,
      abi: [
        {
          inputs: [{ name: 'tokenId', type: 'uint256' }],
          name: 'certificates',
          outputs: [
            { name: 'owner', type: 'address' },
            { name: 'title', type: 'string' },
            { name: 'completedAt', type: 'uint256' }
          ],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'certificates',
      args: [BigInt(tokenId)]
    });

    return {
      owner: cert[0],
      title: cert[1],
      completedAt: cert[2]
    };
  }

  /**
   * Get all certificates for a user
   *
   * @param userAddress - User's Ethereum address
   * @returns Array of user's certificates
   */
  async getUserCertificates(userAddress: string): Promise<Certificate[]> {
    logger.info({ userAddress }, 'ContractVerifier: Fetching user certificates');

    try {
      const totalSupply = await this.publicClient.readContract({
        address: this.attestationAddress,
        abi: [
          {
            inputs: [],
            name: 'totalSupply',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'totalSupply'
      });

      const certificates: Certificate[] = [];

      // Note: This is inefficient for large supplies. In production, use
      // an indexing service or event-based approach.
      const maxToCheck = Math.min(Number(totalSupply), 1000);

      for (let i = 0; i < maxToCheck; i++) {
        try {
          const cert = await this.verifyCertificate(userAddress, i);
          if (cert.isValid) {
            certificates.push(cert);
          }
        } catch (error) {
          continue;
        }
      }

      logger.info({
        userAddress,
        count: certificates.length
      }, 'ContractVerifier: User certificates fetched');

      return certificates;
    } catch (error) {
      logger.error({
        userAddress,
        error: (error as Error).message
      }, 'ContractVerifier: Failed to fetch certificates');
      return [];
    }
  }

  /**
   * Verify a milestone checkpoint on-chain
   *
   * Uses environment-configured staking address instead of hardcoded value.
   *
   * @param sessionId - Session identifier
   * @param milestoneId - Milestone number
   * @param codeHash - Code hash to verify
   * @returns True if checkpoint matches on-chain record
   */
  async verifyMilestoneCheckpoint(
    sessionId: string,
    milestoneId: number,
    codeHash: string
  ): Promise<boolean> {
    logger.info({ sessionId, milestoneId }, 'ContractVerifier: Verifying checkpoint');

    try {
      const checkpoint = await this.publicClient.readContract({
        address: this.stakingAddress,
        abi: [
          {
            inputs: [
              { name: 'sessionId', type: 'string' },
              { name: 'milestoneId', type: 'uint256' }
            ],
            name: 'checkpoints',
            outputs: [{ name: 'codeHash', type: 'bytes32' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'checkpoints',
        args: [sessionId, BigInt(milestoneId)]
      });

      const storedHash = checkpoint;
      const isValid = storedHash.toLowerCase() === codeHash.toLowerCase();

      logger.info({
        sessionId,
        milestoneId,
        isValid,
        storedHash: typeof storedHash === 'string' ? storedHash : storedHash.toString(),
        submittedHash: codeHash
      }, 'ContractVerifier: Checkpoint verified');

      return isValid;
    } catch (error) {
      logger.error({
        sessionId,
        milestoneId,
        error: (error as Error).message
      }, 'ContractVerifier: Checkpoint verification failed');
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      network: {
        chainId: this.chain.id,
        name: this.chainName
      },
      contracts: {
        attestation: this.attestationAddress,
        staking: this.stakingAddress
      },
      rpcUrl: this.rpcUrl
    };
  }
}
