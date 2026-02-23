// Jest setup file for TEE service
// This file is loaded before all test suites

// Mock environment variables
process.env.RPC_URL = 'https://mock-rpc-url.com';
process.env.CHAIN_ID = '11155111';
process.env.TEE_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000001';
process.env.CEREBRAS_API_KEY = 'mock-cerebras-key';
process.env.CONTRACT_ATTESTATION = '0x0000000000000000000000000000000000000000000001';
process.env.CONTRACT_STAKING = '0x0000000000000000000000000000000000000000000002';
process.env.PORT = '3001';

// Mock Pinata/IPFS
global.mockPinataUpload = jest.fn().mockResolvedValue({
  IpfsHash: 'QmTestHash123',
  PinSize: 1234,
  Timestamp: Date.now()
});

// Mock contract calls
global.mockContractWrite = jest.fn().mockResolvedValue({
  hash: '0xMockTransactionHash123'
});

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
};
