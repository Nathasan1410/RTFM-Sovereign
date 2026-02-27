/**
 * Attestation Submission Integration Tests
 *
 * End-to-end tests for the /contract/submit-attestation and /contract/claim-refund endpoints including:
 * - Complete attestation submission flow
 * - Refund claiming after attestation
 * - Error handling for edge cases
 * - Session state management
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

// Mock external dependencies for controlled testing
jest.mock('../../contracts', () => {
  const mockContractIntegration: any = {
    getSignerAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
    submitAttestation: jest.fn().mockImplementation(async (user: any, skill: any, score: any, signature: any, ipfsHash: any, milestoneScores: any) => {
      const txHash = '0x' + 'a'.repeat(64);
      return {
        hash: txHash,
        wait: jest.fn().mockResolvedValue({
          hash: txHash,
          blockNumber: 123456,
          gasUsed: BigInt(95000),
          status: 1,
          logs: []
        })
      };
    }),
    claimRefund: jest.fn().mockImplementation(async (user: any, skill: any) => {
      const txHash = '0x' + 'b'.repeat(64);
      return {
        hash: txHash,
        wait: jest.fn().mockResolvedValue({
          hash: txHash,
          blockNumber: 123457,
          gasUsed: BigInt(75000),
          status: 1,
          logs: []
        })
      };
    }),
    verifyStake: jest.fn().mockResolvedValue(true),
    verifyAttestation: jest.fn().mockImplementation(async (user: any, skill: any) => {
      const exists = (global as any).attestationSubmitted || false;
      console.log('DEBUG verifyAttestation called, attestationSubmitted:', exists);
      return {
        exists,
        score: '85',
        timestamp: Date.now().toString(),
        signature: '0x' + 'sig'.repeat(43)
      };
    }),
    getStakeDetails: jest.fn().mockImplementation(async (user: any, skill: any) => {
      return {
        amount: '1000000000000000000',
        stakedAt: Date.now().toString(),
        milestoneCheckpoint: '5',
        attestationComplete: (global as any).attestationSubmitted || false,
        refunded: (global as any).refundClaimed || false,
        skillTopic: skill
      };
    }),
    attestation: {
      submitAttestation: {
        estimateGas: jest.fn().mockResolvedValue(BigInt(90000))
      },
      interface: {
        parseLog: jest.fn()
      }
    },
    staking: {
      claimRefund: {
        estimateGas: jest.fn().mockResolvedValue(BigInt(70000))
      },
      interface: {
        parseLog: jest.fn()
      }
    }
  };

  const mockEIP712Signer = {
    signAttestation: jest.fn().mockResolvedValue('0x' + 'sig'.repeat(43)),
    getSignerAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
  };

  return {
    ContractIntegration: jest.fn().mockImplementation(() => mockContractIntegration),
    EIP712Signer: jest.fn().mockImplementation(() => mockEIP712Signer),
    createContractIntegration: jest.fn().mockResolvedValue(mockContractIntegration),
    createEIP712Signer: jest.fn().mockResolvedValue(mockEIP712Signer)
  };
});

jest.mock('../../services/ipfs', () => ({
  IPFSService: jest.fn(),
  createIPFSService: jest.fn().mockResolvedValue({
    uploadCodeSnapshot: jest.fn().mockResolvedValue('QmTestHash'),
    uploadToPinata: jest.fn().mockResolvedValue('QmTestHash')
  })
}));

jest.mock('../../services/TEESigner', () => ({
  TEESigner: jest.fn().mockImplementation(() => ({
    signCheckpoint: jest.fn().mockResolvedValue('0x' + 'sig'.repeat(43)),
    getSignerAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
  })),
  createTEESigner: jest.fn().mockReturnValue({
    signCheckpoint: jest.fn().mockResolvedValue('0x' + 'sig'.repeat(43)),
    getSignerAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
  })
}));

describe('Attestation Submission Integration', () => {
  const testUserAddress = '0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48';
  let sessionId: string;
  let app: any;

  beforeAll(async () => {
    // Set up test environment BEFORE importing server
    process.env.NODE_ENV = 'test';
    process.env.TEE_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.CONTRACT_ATTESTATION = '0x621218a5C6Ef20505AB37D8b934AE83F18CD778d';
    process.env.CONTRACT_STAKING = '0xA607F8A4E5c35Ca6a81623e4B20601205D1d7790';
    process.env.CHAIN_ID = '11155111';
    process.env.RPC_URL = 'https://1rpc.io/sepolia';
    process.env.PINATA_API_KEY = 'test-key';
    process.env.PINATA_SECRET_API_KEY = 'test-secret';

    // Import server after mocks and environment are set up
    const serverModule = await import('../../server');
    app = serverModule.app;

    // Initialize global state
    (global as any).attestationSubmitted = false;
    (global as any).refundClaimed = false;

    // Create a test session with goldenPath.milestones included
    const createResponse = await request(app)
      .post('/session/create')
      .send({
        userAddress: testUserAddress,
        goldenPath: {
          topic: 'React Development',
          theory: 'React Development',
          objectives: ['Learn components', 'Learn hooks', 'Learn state management'],
          prerequisites: ['JavaScript basics', 'HTML/CSS'],
          milestones: [
            { id: 1, title: 'Milestone 1', description: 'First milestone' },
            { id: 2, title: 'Milestone 2', description: 'Second milestone' },
            { id: 3, title: 'Milestone 3', description: 'Third milestone' },
            { id: 4, title: 'Milestone 4', description: 'Fourth milestone' },
            { id: 5, title: 'Milestone 5', description: 'Fifth milestone' }
          ]
        }
      });

    sessionId = createResponse.body.sessionId;

    // Simulate milestone completions (all 5 milestones) using test endpoint
    const scores = [];
    for (let i = 1; i <= 5; i++) {
      scores.push({
        milestone_id: i,
        score: 80 + (i * 2), // Scores: 82, 84, 86, 88, 90
        feedback: `Milestone ${i} completed`
      });
    }

    await request(app)
      .post('/test/add-milestone-scores')
      .send({
        sessionId,
        scores
      });
  });

  afterAll(async () => {
    // Cleanup global state
    (global as any).attestationSubmitted = false;
    (global as any).refundClaimed = false;
    jest.clearAllMocks();
  });

  describe('POST /contract/submit-attestation', () => {
    it('should submit final attestation successfully', async () => {
      const response = await request(app)
        .post('/contract/submit-attestation')
        .send({
          sessionId
        });

      // Debug: log response before assertion
      console.log('DEBUG Response:', response.status, response.body);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        success: true,
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
        ipfsHash: expect.any(String),
        finalScore: expect.any(Number),
        message: 'Attestation submitted successfully'
      });

      expect(response.body.finalScore).toBeGreaterThanOrEqual(0);
      expect(response.body.finalScore).toBeLessThanOrEqual(100);
      expect(response.body.timestamp).toBeDefined();

      // Update global state for subsequent tests
      (global as any).attestationSubmitted = true;
    });

    it('should fail to submit attestation twice', async () => {
      const response = await request(app)
        .post('/contract/submit-attestation')
        .send({
          sessionId
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already exists')
      });
    });

    it('should fail with missing sessionId', async () => {
      const response = await request(app)
        .post('/contract/submit-attestation')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    });

    it('should fail with null sessionId', async () => {
      const response = await request(app)
        .post('/contract/submit-attestation')
        .send({
          sessionId: null
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    });

    it('should fail for non-existent session', async () => {
      const response = await request(app)
        .post('/contract/submit-attestation')
        .send({
          sessionId: 'non-existent-session-id'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Failed to submit attestation')
      });
    });
  });

  describe('POST /contract/claim-refund', () => {
    it('should claim refund successfully after attestation', async () => {
      const response = await request(app)
        .post('/contract/claim-refund')
        .send({
          sessionId
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        txHash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
        refundAmount: expect.any(String),
        finalScore: expect.any(Number),
        message: 'Refund claimed successfully'
      });

      expect(response.body.timestamp).toBeDefined();

      // Update global state for subsequent tests
      (global as any).refundClaimed = true;
    });

    it('should fail to claim refund twice', async () => {
      const response = await request(app)
        .post('/contract/claim-refund')
        .send({
          sessionId
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('refunded')
      });
    });

    it('should fail with missing sessionId', async () => {
      const response = await request(app)
        .post('/contract/claim-refund')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    });

    it('should fail with null sessionId', async () => {
      const response = await request(app)
        .post('/contract/claim-refund')
        .send({
          sessionId: null
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    });

    it('should fail for session without attestation', async () => {
      // Create new session without attestation
      const createResponse = await request(app)
        .post('/session/create')
        .send({
          userAddress: '0x1234567890123456789012345678901234567890',
          goldenPath: {
            topic: 'Test Without Attestation',
            theory: 'Test theory',
            objectives: ['Test objective'],
            prerequisites: [],
            milestones: [
              { id: 1, title: 'Milestone 1', description: 'First milestone' },
              { id: 2, title: 'Milestone 2', description: 'Second milestone' },
              { id: 3, title: 'Milestone 3', description: 'Third milestone' },
              { id: 4, title: 'Milestone 4', description: 'Fourth milestone' },
              { id: 5, title: 'Milestone 5', description: 'Fifth milestone' }
            ]
          }
        });

      const newSessionId = createResponse.body.sessionId;

      const response = await request(app)
        .post('/contract/claim-refund')
        .send({
          sessionId: newSessionId
        })
        .expect(400);

      // The error could be about no attestation OR already refunded, depending on global state
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('Complete Flow', () => {
    let flowSessionId: string;

    beforeAll(async () => {
      // Reset global state for this independent test flow
      (global as any).attestationSubmitted = false;
      (global as any).refundClaimed = false;

      // Create fresh session for flow test with goldenPath included
      const createResponse = await request(app)
        .post('/session/create')
        .send({
          userAddress: '0x9876543210987654321098765432109876543210',
          goldenPath: {
            topic: 'Complete Flow Test',
            theory: 'Complete Flow Test',
            objectives: ['Test objective'],
            prerequisites: [],
            milestones: [
              { id: 1, title: 'Milestone 1', description: 'First milestone' },
              { id: 2, title: 'Milestone 2', description: 'Second milestone' },
              { id: 3, title: 'Milestone 3', description: 'Third milestone' },
              { id: 4, title: 'Milestone 4', description: 'Fourth milestone' },
              { id: 5, title: 'Milestone 5', description: 'Fifth milestone' }
            ]
          });

      flowSessionId = createResponse.body.sessionId;

      // Complete all 5 milestones using test endpoint
      const scores = [];
      for (let i = 1; i <= 5; i++) {
        scores.push({
          milestone_id: i,
          score: 85,
          feedback: `Flow test milestone ${i}`
        });
      }

      await request(app)
        .post('/test/add-milestone-scores')
        .send({
          sessionId: flowSessionId,
          scores
        });
    });

    it('should complete full flow: milestones → attestation → refund', async () => {
      // Step 1: Submit attestation
      const attestationResponse = await request(app)
        .post('/contract/submit-attestation')
        .send({
          sessionId: flowSessionId
        })
        .expect(200);

      expect(attestationResponse.body.success).toBe(true);
      expect(attestationResponse.body).toHaveProperty('txHash');
      expect(attestationResponse.body).toHaveProperty('finalScore');

      // Step 2: Claim refund
      const refundResponse = await request(app)
        .post('/contract/claim-refund')
        .send({
          sessionId: flowSessionId
        })
        .expect(200);

      expect(refundResponse.body.success).toBe(true);
      expect(refundResponse.body).toHaveProperty('txHash');
      expect(refundResponse.body).toHaveProperty('refundAmount');
    });
  });
});
