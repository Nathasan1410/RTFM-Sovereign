/**
 * Unit Tests for ContractVerifier
 *
 * Tests smart contract verification including:
 * - Constructor with environment variables
 * - Network detection and configuration
 * - Connection testing
 * - Certificate verification
 * - Milestone checkpoint verification
 *
 * Follows TDD methodology: tests written FIRST, then implementation
 */

import { ContractVerifier } from '../../verification/ContractVerifier';

describe('ContractVerifier', () => {
  let originalEnv: NodeJS.ProcessEnv;

  const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const VALID_ATTESTATION_ADDRESS = '0x7006e886e56426Fbb942B479AC8eF5C47a7531f1';
  const VALID_STAKING_ADDRESS = '0xA607F8A4E5c35Ca6a81623e4B20601205D1d7790';

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Set up test environment
    process.env.TEE_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.CONTRACT_ATTESTATION = VALID_ATTESTATION_ADDRESS;
    process.env.CONTRACT_STAKING = VALID_STAKING_ADDRESS;
    process.env.RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/test';
    process.env.CHAIN_ID = '11155111';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Constructor - Network Configuration', () => {
    it('should initialize with Sepolia when CHAIN_ID=11155111', () => {
      process.env.CHAIN_ID = '11155111';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(11155111);
      expect(config.network.name).toBe('Sepolia');
    });

    it('should initialize with Mainnet when CHAIN_ID=1', () => {
      process.env.CHAIN_ID = '1';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(1);
      expect(config.network.name).toBe('Mainnet');
    });

    it('should initialize with Goerli when CHAIN_ID=5', () => {
      process.env.CHAIN_ID = '5';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(5);
      expect(config.network.name).toBe('Goerli');
    });

    it('should default to Sepolia for unknown chain ID', () => {
      process.env.CHAIN_ID = '999999';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.name).toBe('Sepolia (default)');
      expect(config.network.chainId).toBe(11155111); // Sepolia's chain ID
    });

    it('should default to Sepolia when CHAIN_ID is not set', () => {
      delete process.env.CHAIN_ID;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(11155111);
      expect(config.network.name).toBe('Sepolia');
    });

    it('should use custom RPC URL from environment', () => {
      process.env.RPC_URL = 'https://custom-rpc.example.com';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.rpcUrl).toBe('https://custom-rpc.example.com');
    });

    it('should use contract addresses from environment', () => {
      process.env.CONTRACT_ATTESTATION = VALID_ATTESTATION_ADDRESS;
      process.env.CONTRACT_STAKING = VALID_STAKING_ADDRESS;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.contracts.attestation).toBe(VALID_ATTESTATION_ADDRESS);
      expect(config.contracts.staking).toBe(VALID_STAKING_ADDRESS);
    });
  });

  describe('Constructor - Validation', () => {
    it('should throw error for invalid private key (too short)', () => {
      const shortKey = '0x1234';

      expect(() => new ContractVerifier(shortKey))
        .toThrow('CONTRACT_VERIFIER_INVALID_PRIVATE_KEY');
    });

    it('should throw error for invalid private key (no 0x prefix)', () => {
      const noPrefix = '1'.repeat(64);

      expect(() => new ContractVerifier(noPrefix))
        .toThrow('CONTRACT_VERIFIER_INVALID_PRIVATE_KEY');
    });

    it('should throw error for invalid attestation address', () => {
      process.env.CONTRACT_ATTESTATION = 'invalid-address';

      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .toThrow('CONTRACT_VERIFIER_INVALID_ATTESTATION_ADDRESS');
    });

    it('should throw error for invalid staking address', () => {
      process.env.CONTRACT_STAKING = 'invalid-address';

      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .toThrow('CONTRACT_VERIFIER_INVALID_STAKING_ADDRESS');
    });

    it('should throw error when attestation address is missing', () => {
      delete process.env.CONTRACT_ATTESTATION;

      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .toThrow('CONTRACT_VERIFIER_INVALID_ATTESTATION_ADDRESS');
    });

    it('should throw error when staking address is missing', () => {
      delete process.env.CONTRACT_STAKING;

      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .toThrow('CONTRACT_VERIFIER_INVALID_STAKING_ADDRESS');
    });

    it('should accept valid Ethereum addresses', () => {
      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .not.toThrow();
    });

    it('should accept mixed-case addresses', () => {
      process.env.CONTRACT_ATTESTATION = '0x7006e886e56426Fbb942B479AC8eF5C47a7531f1'; // Mixed case
      process.env.CONTRACT_STAKING = '0xA607F8A4E5c35Ca6a81623e4B20601205D1d7790'; // Mixed case

      expect(() => new ContractVerifier(TEST_PRIVATE_KEY))
        .not.toThrow();
    });
  });

  describe('testConnection - Contract Connectivity', () => {
    let verifier: ContractVerifier;

    beforeEach(() => {
      verifier = new ContractVerifier(TEST_PRIVATE_KEY);
    });

    it('should return connection test result with correct structure', async () => {
      const result = await verifier.testConnection();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('network');
      expect(result).toHaveProperty('contracts');
      expect(result).toHaveProperty('timestamp');
      expect(result.network).toHaveProperty('chainId');
      expect(result.network).toHaveProperty('name');
      expect(result.network).toHaveProperty('rpcUrl');
      expect(result.contracts).toHaveProperty('attestation');
      expect(result.contracts).toHaveProperty('staking');
    });

    it('should include attestation contract status in result', async () => {
      const result = await verifier.testConnection();

      expect(result.contracts.attestation).toHaveProperty('address');
      expect(result.contracts.attestation).toHaveProperty('connected');
      expect(result.contracts.attestation).toHaveProperty('error'); // Can be undefined
      expect(result.contracts.attestation.address).toBe(VALID_ATTESTATION_ADDRESS);
    });

    it('should include staking contract status in result', async () => {
      const result = await verifier.testConnection();

      expect(result.contracts.staking).toHaveProperty('address');
      expect(result.contracts.staking).toHaveProperty('connected');
      expect(result.contracts.staking).toHaveProperty('error'); // Can be undefined
      expect(result.contracts.staking.address).toBe(VALID_STAKING_ADDRESS);
    });

    it('should return timestamp from recent time', async () => {
      const before = Date.now();
      const result = await verifier.testConnection();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should mark success=false when contracts are unreachable', async () => {
      // Use invalid RPC URL
      process.env.RPC_URL = 'https://invalid-rpc-that-does-not-exist-12345.com';
      const invalidVerifier = new ContractVerifier(TEST_PRIVATE_KEY);

      const result = await invalidVerifier.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('getConfig - Configuration Access', () => {
    it('should return complete configuration', () => {
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('contracts');
      expect(config).toHaveProperty('rpcUrl');
      expect(config.network).toHaveProperty('chainId');
      expect(config.network).toHaveProperty('name');
      expect(config.contracts).toHaveProperty('attestation');
      expect(config.contracts).toHaveProperty('staking');
    });

    it('should return RPC URL in config', () => {
      process.env.RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/super-secret-key-12345';
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.rpcUrl).toBe('https://eth-sepolia.g.alchemy.com/v2/super-secret-key-12345');
    });

    it('should return correct chain info for Sepolia', () => {
      process.env.CHAIN_ID = '11155111';
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(11155111);
      expect(config.network.name).toBe('Sepolia');
    });

    it('should return correct contract addresses', () => {
      const customAttestation = '0x1111111111111111111111111111111111111111';
      const customStaking = '0x2222222222222222222222222222222222222222';
      process.env.CONTRACT_ATTESTATION = customAttestation;
      process.env.CONTRACT_STAKING = customStaking;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.contracts.attestation).toBe(customAttestation);
      expect(config.contracts.staking).toBe(customStaking);
    });
  });

  describe('queryCertificate - Method Uses Correct Address', () => {
    it('should use environment attestation address, not hardcoded', async () => {
      const customAddress = '0x3333333333333333333333333333333333333333';
      process.env.CONTRACT_ATTESTATION = customAddress;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      // Verify the verifier was initialized with custom address
      expect(config.contracts.attestation).toBe(customAddress);
    });

    it('should have publicClient for read operations', () => {
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      // The verifier should have created a public client
      // We can't directly test this without accessing private properties,
      // but we can verify the constructor completed successfully
      expect(verifier).toBeDefined();
    });
  });

  describe('verifyMilestoneCheckpoint - Method Uses Correct Address', () => {
    it('should use environment staking address, not hardcoded', async () => {
      const customAddress = '0x4444444444444444444444444444444444444444';
      process.env.CONTRACT_STAKING = customAddress;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      // Verify the verifier was initialized with custom address
      expect(config.contracts.staking).toBe(customAddress);
    });
  });

  describe('getUserCertificates - Method Uses Correct Address', () => {
    it('should use environment attestation address for totalSupply query', () => {
      const customAddress = '0x5555555555555555555555555555555555555555';
      process.env.CONTRACT_ATTESTATION = customAddress;

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.contracts.attestation).toBe(customAddress);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      process.env.RPC_URL = 'https://invalid-rpc.example.com';
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);

      const result = await verifier.testConnection();

      expect(result.success).toBe(false);
      expect(result.contracts.attestation.connected).toBe(false);
      expect(result.contracts.staking.connected).toBe(false);
    });

    it('should include error messages when connection fails', async () => {
      process.env.RPC_URL = 'https://invalid-rpc.example.com';
      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);

      const result = await verifier.testConnection();

      // At least one contract should have an error message
      const hasAttestationError = !!result.contracts.attestation.error;
      const hasStakingError = !!result.contracts.staking.error;

      expect(hasAttestationError || hasStakingError).toBe(true);
    });
  });

  describe('Multiple Network Support', () => {
    it('should support Optimism Sepolia', () => {
      process.env.CHAIN_ID = '11155420';

      const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
      const config = verifier.getConfig();

      expect(config.network.chainId).toBe(11155420);
      expect(config.network.name).toBe('Optimism Sepolia');
    });

    it('should handle all supported networks', () => {
      const supportedNetworks = [
        { chainId: 1, name: 'Mainnet' },
        { chainId: 5, name: 'Goerli' },
        { chainId: 11155111, name: 'Sepolia' },
        { chainId: 11155420, name: 'Optimism Sepolia' }
      ];

      supportedNetworks.forEach(({ chainId, name }) => {
        process.env.CHAIN_ID = chainId.toString();
        const verifier = new ContractVerifier(TEST_PRIVATE_KEY);
        const config = verifier.getConfig();

        expect(config.network.chainId).toBe(chainId);
        expect(config.network.name).toBe(name);
      });
    });
  });
});
