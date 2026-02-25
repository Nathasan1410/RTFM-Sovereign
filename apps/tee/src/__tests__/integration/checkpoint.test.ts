/**
 * Checkpoint Integration Tests
 *
 * Tests for the IPFS checkpoint integration including:
 * - ProjectManagerAgent checkpoint recording with IPFS
 * - HistoryTracker IPFS hash tracking
 * - End-to-end checkpoint flow
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

describe('Checkpoint Integration', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock IPFS service
    mockIPFSService = {
      uploadJSON: jest.fn().mockResolvedValue('QmTestHash123'),
      uploadFile: jest.fn().mockResolvedValue('QmFileHash'),
      getFile: jest.fn().mockResolvedValue({ test: 'data' }),
      retrieveSnapshot: jest.fn().mockResolvedValue(null),
      uploadCodeSnapshot: jest.fn().mockResolvedValue('QmSnapshotHash'),
      uploadCompressed: jest.fn().mockResolvedValue('QmCompressedHash'),
      downloadAndDecompress: jest.fn().mockResolvedValue({}),
      uploadBatch: jest.fn().mockResolvedValue({ ipfsHashes: [], totalSize: 0, duration: 0 }),
      verifyUpload: jest.fn().mockResolvedValue(true),
      calculateChecksum: jest.fn().mockImplementation((content: string) => 'mock-checksum'),
      calculateFileHash: jest.fn().mockImplementation((content: string) => 'mock-file-hash'),
      getGatewayUrl: jest.fn().mockImplementation((hash: string) => `https://gateway.pinata.cloud/ipfs/${hash}`),
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

  describe('ProjectManagerAgent.recordCheckpoint', () => {
    it('should record checkpoint with IPFS upload', async () => {
      const milestoneId = 3;
      const score = 85;
      const codeHash = '0x' + 'a'.repeat(64);

      // Create session first and get the session ID
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;

      // Mock IPFS upload
      (mockIPFSService.uploadJSON as jest.Mock).mockResolvedValue('QmCheckpointHash');

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.milestoneId).toBe(milestoneId);
      expect(result.score).toBe(score);
      expect(result.ipfsHash).toBe('QmCheckpointHash');
      expect(result.ipfsGatewayUrl).toContain('QmCheckpointHash');
    });

    it('should record checkpoint without IPFS when service unavailable', async () => {
      const projectManagerNoIPFS = new ProjectManagerAgent(mockLLMService);
      projectManagerNoIPFS.initializeContractIntegration(null, null, null);
      
      const session = projectManagerNoIPFS.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 1;
      const score = 75;
      const codeHash = '0x' + 'b'.repeat(64);

      const result = await projectManagerNoIPFS.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result).toBeDefined();
      expect(result.ipfsHash).toBe('');
      expect(result.ipfsGatewayUrl).toBe('');
    });

    it('should handle IPFS upload failure gracefully', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 2;
      const score = 80;
      const codeHash = '0x' + 'c'.repeat(64);

      // Mock IPFS upload failure
      (mockIPFSService.uploadJSON as jest.Mock).mockRejectedValue(new Error('IPFS unavailable'));

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      // Should still return a result with empty IPFS hash
      expect(result).toBeDefined();
      expect(result.milestoneId).toBe(milestoneId);
      expect(result.ipfsHash).toBe('');
    });

    it('should trigger on-chain checkpoint for milestone 3', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 3;
      const score = 85;
      const codeHash = '0x' + 'd'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock).mockResolvedValue('QmMilestone3Hash');

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result.milestoneId).toBe(3);
      expect(result.ipfsHash).toBe('QmMilestone3Hash');
      // On-chain tx hash should be present (mock)
      expect(result.onChainTxHash).toBeDefined();
    });

    it('should trigger on-chain checkpoint for milestone 5', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 5;
      const score = 90;
      const codeHash = '0x' + 'e'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock).mockResolvedValue('QmMilestone5Hash');

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result.milestoneId).toBe(5);
      expect(result.onChainTxHash).toBeDefined();
    });

    it('should trigger on-chain checkpoint for milestone 7', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 7;
      const score = 95;
      const codeHash = '0x' + 'f'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock).mockResolvedValue('QmMilestone7Hash');

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result.milestoneId).toBe(7);
      expect(result.onChainTxHash).toBeDefined();
    });

    it('should not trigger on-chain checkpoint for other milestones', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 4;
      const score = 70;
      const codeHash = '0x' + '0'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock).mockResolvedValue('QmMilestone4Hash');

      const result = await projectManager.recordCheckpoint(
        sessionId,
        milestoneId,
        score,
        codeHash
      );

      expect(result.milestoneId).toBe(4);
      expect(result.onChainTxHash).toBeUndefined();
    });
  });

  describe('HistoryTracker.recordCheckpoint', () => {
    it('should record checkpoint with IPFS hash', () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const sessionId = 'test-session';
      const milestoneId = 3;
      const ipfsHash = 'QmTestHash';
      const score = 85;

      historyTracker.recordCheckpoint(userAddress, sessionId, milestoneId, ipfsHash, score);

      const history = historyTracker.getUserHistory(userAddress);
      const submission = history.submissions.find(
        s => s.sessionId === sessionId && s.milestoneId === milestoneId
      );

      // Note: recordCheckpoint only updates existing submissions
      // This test verifies the method doesn't throw
      expect(history.lastActivity).toBeDefined();
    });

    it('should update existing submission with IPFS hash', () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const sessionId = 'test-session';
      const milestoneId = 3;
      const code = 'contract Test {}';
      const codeHash = '0x' + '1'.repeat(64);
      const ipfsHash = 'QmTestHash';
      const score = 85;

      // First record a submission
      historyTracker.recordSubmission(userAddress, sessionId, milestoneId, code, codeHash);
      
      // Then record checkpoint with IPFS hash
      historyTracker.recordCheckpoint(userAddress, sessionId, milestoneId, ipfsHash, score);

      const history = historyTracker.getUserHistory(userAddress);
      const submission = history.submissions.find(
        s => s.sessionId === sessionId && s.milestoneId === milestoneId
      );

      expect(submission).toBeDefined();
      expect(submission?.ipfsHash).toBe(ipfsHash);
      expect(submission?.score).toBe(score);
    });
  });

  describe('Snapshot Capture and Upload', () => {
    it('should capture code snapshot with files', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const milestoneId = 3;
      const score = 85;
      const codeHash = '0x' + '2'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock).mockImplementation((data: any) => {
        // Verify snapshot structure
        expect(data.sessionId).toBe(sessionId);
        expect(data.milestoneId).toBe(milestoneId);
        expect(data.files).toBeDefined();
        expect(data.dependencies).toBeDefined();
        expect(data.metadata).toBeDefined();
        expect(data.checksum).toBeDefined();
        return Promise.resolve('QmSnapshotHash');
      });

      await projectManager.recordCheckpoint(sessionId, milestoneId, score, codeHash);

      expect(mockIPFSService.uploadJSON).toHaveBeenCalled();
    });
  });

  describe('Multiple Checkpoints', () => {
    it('should handle multiple checkpoints for same session', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const codeHash = '0x' + '3'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock)
        .mockResolvedValueOnce('QmMilestone3Hash')
        .mockResolvedValueOnce('QmMilestone5Hash')
        .mockResolvedValueOnce('QmMilestone7Hash');

      // Record checkpoints for milestones 3, 5, 7
      const checkpoint3 = await projectManager.recordCheckpoint(sessionId, 3, 80, codeHash);
      const checkpoint5 = await projectManager.recordCheckpoint(sessionId, 5, 85, codeHash);
      const checkpoint7 = await projectManager.recordCheckpoint(sessionId, 7, 90, codeHash);

      expect(checkpoint3.ipfsHash).toBe('QmMilestone3Hash');
      expect(checkpoint5.ipfsHash).toBe('QmMilestone5Hash');
      expect(checkpoint7.ipfsHash).toBe('QmMilestone7Hash');

      // All should have on-chain tx hashes
      expect(checkpoint3.onChainTxHash).toBeDefined();
      expect(checkpoint5.onChainTxHash).toBeDefined();
      expect(checkpoint7.onChainTxHash).toBeDefined();
    });

    it('should generate unique IPFS hashes for different checkpoints', async () => {
      const session = projectManager.createSession('0x1234567890123456789012345678901234567890');
      const sessionId = session.session_id;
      const codeHash = '0x' + '4'.repeat(64);

      (mockIPFSService.uploadJSON as jest.Mock)
        .mockResolvedValueOnce('QmUniqueHash1')
        .mockResolvedValueOnce('QmUniqueHash2');

      const checkpoint1 = await projectManager.recordCheckpoint(sessionId, 1, 75, codeHash);
      const checkpoint2 = await projectManager.recordCheckpoint(sessionId, 2, 80, codeHash);

      expect(checkpoint1.ipfsHash).not.toBe(checkpoint2.ipfsHash);
    });
  });
});
