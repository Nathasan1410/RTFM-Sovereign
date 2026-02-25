/**
 * Checkpoint E2E Tests
 *
 * End-to-end tests for the complete IPFS checkpoint flow:
 * - Session creation
 * - Milestone completion
 * - Code snapshot capture
 * - IPFS upload
 * - Checkpoint retrieval
 * - User checkpoint history
 */

import { ProjectManagerAgent } from '../../agents/manager/ProjectManagerAgent';
import { HistoryTracker } from '../../verification/HistoryTracker';
import { IPFSService, createIPFSService, IPFSCredentials } from '../../services/ipfs';
import { LLMService } from '../../services/llm/LLMService';
import { CheckpointRecord, MilestoneSnapshot } from '../../types/ipfs';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../services/llm/LLMService');
jest.mock('../../services/TEESigner');
jest.mock('../../contracts');

describe('E2E: Milestone Checkpoint System', () => {
  let projectManager: ProjectManagerAgent;
  let historyTracker: HistoryTracker;
  let mockIPFSService: IPFSService;
  let mockLLMService: LLMService;
  let mockTEESigner: any;
  let mockAttestationContract: any;

  const mockCredentials: IPFSCredentials = {
    apiKey: 'test-api-key',
    secretApiKey: 'test-secret-key'
  };

  const testUserAddress = '0x1234567890123456789012345678901234567890';

  // Mock IPFS storage for simulation
  const mockIPFSStorage = new Map<string, any>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIPFSStorage.clear();

    // Create mock IPFS service with storage simulation
    mockIPFSService = {
      uploadJSON: jest.fn().mockImplementation((data: any, filename?: string) => {
        const hash = `Qm${Date.now()}${Math.random().toString(36).substring(7)}`;
        mockIPFSStorage.set(hash, data);
        return Promise.resolve(hash);
      }),
      uploadFile: jest.fn().mockImplementation((content: string, filename: string) => {
        const hash = `QmFile${Date.now()}${Math.random().toString(36).substring(7)}`;
        mockIPFSStorage.set(hash, { content, filename });
        return Promise.resolve(hash);
      }),
      getFile: jest.fn().mockImplementation((hash: string) => {
        const data = mockIPFSStorage.get(hash);
        if (data) return Promise.resolve(data);
        return Promise.reject(new Error(`IPFS hash not found: ${hash}`));
      }),
      retrieveSnapshot: jest.fn().mockImplementation((hash: string) => {
        const data = mockIPFSStorage.get(hash);
        return Promise.resolve(data || null);
      }),
      uploadCodeSnapshot: jest.fn().mockResolvedValue('QmSnapshotHash'),
      uploadCompressed: jest.fn().mockResolvedValue('QmCompressedHash'),
      downloadAndDecompress: jest.fn().mockResolvedValue({}),
      uploadBatch: jest.fn().mockResolvedValue({ ipfsHashes: [], totalSize: 0, duration: 0 }),
      verifyUpload: jest.fn().mockResolvedValue(true),
      calculateChecksum: jest.fn().mockImplementation((content: string) =>
        'mock-checksum-' + content.length
      ),
      calculateFileHash: jest.fn().mockImplementation((content: string) =>
        'mock-file-hash-' + content.length
      ),
      getGatewayUrl: jest.fn().mockImplementation((hash: string) =>
        `https://gateway.pinata.cloud/ipfs/${hash}`
      ),
      getAlternativeGatewayUrls: jest.fn().mockImplementation((hash: string) => [])
    } as any;

    // Create mock TEE signer
    mockTEESigner = {
      signCheckpoint: jest.fn().mockResolvedValue('0x' + 's'.repeat(130)),
      getPublicKey: jest.fn().mockReturnValue('0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48')
    };

    // Create mock attestation contract
    mockAttestationContract = {
      recordCheckpoint: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue({ hash: '0x' + 'a'.repeat(64), blockNumber: 1 })
      })
    };

    mockLLMService = {} as LLMService;
    projectManager = new ProjectManagerAgent(mockLLMService);
    projectManager.initializeContractIntegration(
      null,
      mockTEESigner,
      mockIPFSService,
      mockTEESigner,
      mockAttestationContract
    );
    historyTracker = new HistoryTracker();
  });

  describe('Complete Checkpoint Flow', () => {
    it('should complete full checkpoint flow for milestone 3', async () => {
      // 1. Create session
      const session = projectManager.createSession(testUserAddress);
      const sessionId = session.session_id;

      // 2. Complete milestone 3
      const milestoneId = 3;
      const score = 85;
      const codeHash = '0x' + 'a'.repeat(64);

      const checkpoint = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      // 3. Verify IPFS upload
      expect(checkpoint.ipfsHash).toMatch(/^Qm/);
      expect(checkpoint.ipfsGatewayUrl).toContain(checkpoint.ipfsHash);

      // 4. Verify snapshot stored in mock IPFS
      const storedSnapshot = mockIPFSStorage.get(checkpoint.ipfsHash);
      expect(storedSnapshot).toBeDefined();
      expect(storedSnapshot.sessionId).toBe(sessionId);
      expect(storedSnapshot.milestoneId).toBe(milestoneId);

      // 5. Verify on-chain record (mock)
      expect(checkpoint.onChainTxHash).toBeDefined();
    });

    it('should handle multiple checkpoints per session', async () => {
      const session = projectManager.createSession(testUserAddress);
      const sessionId = session.session_id;
      const codeHash = '0x' + 'b'.repeat(64);

      // Complete milestones 3, 5, 7
      const checkpoint3 = await projectManager.recordCheckpoint(sessionId, 3, 80, codeHash);
      const checkpoint5 = await projectManager.recordCheckpoint(sessionId, 5, 85, codeHash);
      const checkpoint7 = await projectManager.recordCheckpoint(sessionId, 7, 90, codeHash);

      // Verify all checkpoints
      expect(checkpoint3.ipfsHash).toBeDefined();
      expect(checkpoint5.ipfsHash).toBeDefined();
      expect(checkpoint7.ipfsHash).toBeDefined();

      // Verify unique hashes
      expect(checkpoint3.ipfsHash).not.toBe(checkpoint5.ipfsHash);
      expect(checkpoint5.ipfsHash).not.toBe(checkpoint7.ipfsHash);
      expect(checkpoint3.ipfsHash).not.toBe(checkpoint7.ipfsHash);

      // Verify all have on-chain tx hashes
      expect(checkpoint3.onChainTxHash).toBeDefined();
      expect(checkpoint5.onChainTxHash).toBeDefined();
      expect(checkpoint7.onChainTxHash).toBeDefined();
    });

    it('should retrieve user checkpoint history', async () => {
      // Create multiple sessions and checkpoints
      const session1 = projectManager.createSession(testUserAddress);
      const session2 = projectManager.createSession(testUserAddress);

      const codeHash = '0x' + 'c'.repeat(64);

      await projectManager.recordCheckpoint(session1.session_id, 3, 80, codeHash);
      await projectManager.recordCheckpoint(session1.session_id, 5, 85, codeHash);
      await projectManager.recordCheckpoint(session2.session_id, 3, 75, codeHash);

      // Get all sessions for user
      const allSessions = projectManager.getAllSessions();
      const userSessions = allSessions.filter(s => s.user_address.toLowerCase() === testUserAddress.toLowerCase());

      // Collect checkpoints
      const checkpoints = [];
      for (const session of userSessions) {
        for (const score of session.verification.milestone_scores) {
          if (score.ipfs_hash) {
            checkpoints.push({
              sessionId: session.session_id,
              milestoneId: score.milestone_id,
              score: score.score,
              ipfsHash: score.ipfs_hash
            });
          }
        }
      }

      expect(checkpoints.length).toBeGreaterThanOrEqual(3);
      checkpoints.forEach(cp => {
        expect(cp).toHaveProperty('ipfsHash');
        expect(cp.ipfsHash).toMatch(/^Qm/);
      });
    });

    it('should retrieve snapshot from IPFS by checkpoint', async () => {
      const session = projectManager.createSession(testUserAddress);
      const sessionId = session.session_id;
      const milestoneId = 3;
      const score = 85;
      const codeHash = '0x' + 'd'.repeat(64);

      const checkpoint = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      // Retrieve from IPFS
      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot).toBeDefined();
      expect(snapshot.sessionId).toBe(sessionId);
      expect(snapshot.milestoneId).toBe(milestoneId);
      expect(snapshot.userAddress).toBe(testUserAddress);
    });

    it('should verify snapshot checksum', async () => {
      const session = projectManager.createSession(testUserAddress);
      const sessionId = session.session_id;
      const milestoneId = 5;
      const score = 90;
      const codeHash = '0x' + 'e'.repeat(64);

      const checkpoint = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot.checksum).toBeDefined();
      expect(snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Checkpoint Triggers', () => {
    it('should trigger automatic checkpoint on milestone 3', async () => {
      const session = projectManager.createSession(testUserAddress);
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + 'f'.repeat(64)
      );

      expect(checkpoint.onChainTxHash).toBeDefined();
    });

    it('should trigger automatic checkpoint on milestone 5', async () => {
      const session = projectManager.createSession(testUserAddress);
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        5,
        85,
        '0x' + '0'.repeat(64)
      );

      expect(checkpoint.onChainTxHash).toBeDefined();
    });

    it('should trigger automatic checkpoint on milestone 7', async () => {
      const session = projectManager.createSession(testUserAddress);
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        7,
        90,
        '0x' + '1'.repeat(64)
      );

      expect(checkpoint.onChainTxHash).toBeDefined();
    });

    it('should not trigger automatic checkpoint on other milestones', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint1 = await projectManager.recordCheckpoint(
        session.session_id,
        1,
        70,
        '0x' + '2'.repeat(64)
      );
      
      const checkpoint2 = await projectManager.recordCheckpoint(
        session.session_id,
        4,
        75,
        '0x' + '3'.repeat(64)
      );

      expect(checkpoint1.onChainTxHash).toBeUndefined();
      expect(checkpoint2.onChainTxHash).toBeUndefined();
    });
  });

  describe('Snapshot Content Verification', () => {
    it('should capture files in snapshot', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + '4'.repeat(64)
      );

      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot.files).toBeDefined();
      expect(Array.isArray(snapshot.files)).toBe(true);
    });

    it('should capture dependencies in snapshot', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + '5'.repeat(64)
      );

      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot.dependencies).toBeDefined();
      expect(Array.isArray(snapshot.dependencies)).toBe(true);
    });

    it('should capture metadata in snapshot', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + '6'.repeat(64)
      );

      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot.metadata).toBeDefined();
      expect(snapshot.metadata.framework).toBeDefined();
      expect(snapshot.metadata.language).toBeDefined();
      expect(snapshot.metadata.aiScore).toBeDefined();
    });

    it('should include timestamp in snapshot', async () => {
      const session = projectManager.createSession(testUserAddress);
      const beforeTimestamp = Date.now();
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + '7'.repeat(64)
      );
      
      const afterTimestamp = Date.now();

      const snapshot = await mockIPFSService.getFile(checkpoint.ipfsHash);

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(snapshot.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('Error Handling', () => {
    it('should handle IPFS upload failure gracefully', async () => {
      const failingIPFSService = {
        ...mockIPFSService,
        uploadJSON: jest.fn().mockRejectedValue(new Error('IPFS unavailable'))
      } as any;

      const projectManagerNoIPFS = new ProjectManagerAgent(mockLLMService);
      projectManagerNoIPFS.initializeContractIntegration(null, null, failingIPFSService);

      const session = projectManagerNoIPFS.createSession(testUserAddress);
      
      const checkpoint = await projectManagerNoIPFS.recordCheckpoint(
        session.session_id,
        3,
        80,
        '0x' + '8'.repeat(64)
      );

      // Should still complete with empty IPFS hash
      expect(checkpoint).toBeDefined();
      expect(checkpoint.milestoneId).toBe(3);
      expect(checkpoint.ipfsHash).toBe('');
    });

    it('should handle session not found', async () => {
      await expect(
        projectManager.recordCheckpoint(
          'non-existent-session',
          3,
          80,
          '0x' + '9'.repeat(64)
        )
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Checkpoint Record Structure', () => {
    it('should return complete CheckpointRecord', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        3,
        85,
        '0x' + 'a'.repeat(64)
      );

      // Verify CheckpointRecord structure
      expect(checkpoint).toHaveProperty('sessionId');
      expect(checkpoint).toHaveProperty('milestoneId');
      expect(checkpoint).toHaveProperty('score');
      expect(checkpoint).toHaveProperty('codeHash');
      expect(checkpoint).toHaveProperty('ipfsHash');
      expect(checkpoint).toHaveProperty('timestamp');
      expect(checkpoint).toHaveProperty('ipfsGatewayUrl');
    });

    it('should include onChainTxHash for automatic checkpoints', async () => {
      const session = projectManager.createSession(testUserAddress);
      
      const checkpoint = await projectManager.recordCheckpoint(
        session.session_id,
        5,
        85,
        '0x' + 'b'.repeat(64)
      );

      expect(checkpoint).toHaveProperty('onChainTxHash');
      expect(checkpoint.onChainTxHash).toBeDefined();
    });
  });
});
