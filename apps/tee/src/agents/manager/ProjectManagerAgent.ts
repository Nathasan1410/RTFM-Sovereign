import { LLMService } from '../../services/llm/LLMService';
import { ResearchAgent } from '../research/ResearchAgent';
import { SwarmAgent } from '../swarm/SwarmAgent';
import {
  SessionState,
  DelegationPayload,
  GoldenPath,
  MicroStepOutput,
  CodeFile,
  CheckpointData
} from '../types/delegation.types';
import { logger, agentLogger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { IPFSService } from '../../services/ipfs';
import { MilestoneSnapshot, CodeFileSnapshot, DependencyInfo, SnapshotMetadata, CheckpointRecord } from '../../types/ipfs';
import { TEESigner } from '../../services/TEESigner';
import { ethers } from 'ethers';
import { ContractIntegration, EIP712Signer } from '../../contracts';

let contractIntegration: ContractIntegration | null = null;
let eip712Signer: EIP712Signer | null = null;

// Automatic checkpoint milestones for staking
const AUTOMATIC_CHECKPOINT_MILESTONES = [3, 5, 7];

export class ProjectManagerAgent {
  private sessions: Map<string, SessionState> = new Map();
  private researchAgent: ResearchAgent;
  private swarmAgent: SwarmAgent;
  private ipfsService: IPFSService | null = null;
  private teeSigner: TEESigner | null = null;
  private attestationContract: any = null;
  private provider: any = null;

  constructor(llmService: LLMService) {
    this.researchAgent = new ResearchAgent(llmService);
    this.swarmAgent = new SwarmAgent(llmService);
  }

  /**
   * Initialize contract integration with IPFS service and on-chain checkpoint support
   */
  initializeContractIntegration(
    contractIntegrationParam: any,
    eip712SignerParam: any,
    ipfsService: IPFSService | null,
    teeSigner?: TEESigner,
    attestationContract?: any,
    provider?: any
  ): void {
    contractIntegration = contractIntegrationParam;
    eip712Signer = eip712SignerParam;
    this.ipfsService = ipfsService;
    this.teeSigner = teeSigner || null;
    this.attestationContract = attestationContract || null;
    this.provider = provider || null;
    agentLogger.info({
      hasIPFS: !!ipfsService,
      hasTEESigner: !!teeSigner,
      hasContract: !!attestationContract
    }, 'ProjectManager: Contract integration initialized');
  }

  createSession(userAddress: string): SessionState {
    const sessionId = randomUUID();
    
    const session: SessionState = {
      session_id: sessionId,
      user_address: userAddress,
      project: {
        golden_path: null,
        current_milestone: 0,
        current_micro_step: 0,
        completed_milestones: [],
        accumulated_code: []
      },
      staking: {
        amount: 0,
        staked_at: 0,
        milestone_checkpoints: [],
        refund_claimed: false
      },
      ai_agents: {
        agent_3_instances: []
      },
      verification: {
        milestone_scores: []
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    this.sessions.set(sessionId, session);
    logger.info({ sessionId, userAddress }, 'ProjectManager: Session created');
    return session;
  }

  async executeMilestone(
    sessionId: string, 
    topic: string, 
    depth: 'lite' | 'deep' = 'lite'
  ): Promise<any> {
    const session = this.getSession(sessionId);
    
    logger.info({ 
      sessionId, 
      topic, 
      depth, 
      currentMilestone: session.project.current_milestone 
    }, 'ProjectManager: Executing milestone');

    if (depth === 'lite') {
      return this.executeLiteMode(session, topic);
    } else {
      return this.executeDeepMode(session, topic);
    }
  }

  private async executeLiteMode(session: SessionState, topic: string): Promise<any> {
    logger.info({ sessionId: session.session_id }, 'ProjectManager: LITE MODE - Direct generation');

    const roadmap = await this.researchAgent.generateGoldenPath(topic, 'lite');
    session.project.golden_path = roadmap;
    
    return {
      mode: 'lite',
      roadmap,
      session_id: session.session_id
    };
  }

  private async executeDeepMode(session: SessionState, topic: string): Promise<any> {
    logger.info({ sessionId: session.session_id }, 'ProjectManager: DEEP MODE - Swarm orchestration');

    const goldenPath = await this.researchAgent.generateGoldenPath(topic, 'deep');
    session.project.golden_path = goldenPath;

    if (!goldenPath.theory || !Array.isArray(goldenPath.objectives)) {
      throw new Error('Invalid golden path structure from ResearchAgent');
    }

    const delegationPayload: DelegationPayload = {
      delegation_type: 'DEEP_MODE_SWARM',
      session_context: {
        session_id: session.session_id,
        user_address: session.user_address,
        current_milestone: session.project.current_milestone + 1,
        previous_code_state: this.getAccumulatedCode(session),
        accumulated_dependencies: this.getAccumulatedDependencies(session)
      },
      milestone_spec: {
        title: goldenPath.theory || topic,
        description: goldenPath.objectives.join('. '),
        success_criteria: goldenPath.prerequisites,
        rubric: {
          completeness: 100,
          code_quality: 80,
          best_practices: 90,
          documentation: 70
        },
        file_targets: ['src/index.ts', 'src/components/']
      },
      swarm_configuration: {
        iteration_count: 7,
        execution_mode: 'sequential',
        context_passing: 'full',
        early_exit_conditions: ['syntax_error', 'test_failure']
      }
    };

    logger.info({ 
      sessionId: session.session_id, 
      milestone: delegationPayload.milestone_spec?.title || topic 
    }, 'ProjectManager: Delegating to SwarmAgent');

    const swarmResult = await this.swarmAgent.executeSwarm(delegationPayload);

    session.project.completed_milestones.push(session.project.current_milestone + 1);
    session.project.current_milestone++;
    
    this.updateSessionInternal(session.session_id, session);

    return {
      mode: 'deep',
      golden_path: goldenPath,
      swarm_result: swarmResult,
      session_id: session.session_id
    };
  }

  /**
   * Record checkpoint with IPFS snapshot upload
   */
  async recordCheckpoint(
    sessionId: string,
    milestoneId: number,
    score: number,
    codeHash: string
  ): Promise<CheckpointRecord> {
    const session = this.getSession(sessionId);

    // Capture code snapshot and upload to IPFS
    let ipfsHash = '';
    let onChainTxHash: string | undefined;

    if (this.ipfsService) {
      try {
        const snapshot = await this.captureCodeSnapshot(session, milestoneId, score);
        ipfsHash = await this.uploadSnapshotToIPFS(snapshot, milestoneId);
        
        // Update session with IPFS hash
        session.verification.milestone_scores.push({
          milestone_id: milestoneId,
          score,
          feedback: '',
          submission_hash: codeHash,
          ipfs_hash: ipfsHash,
          timestamp: Date.now()
        });

        // Record on-chain checkpoint for automatic milestone checkpoints
        if (AUTOMATIC_CHECKPOINT_MILESTONES.includes(milestoneId)) {
          onChainTxHash = await this.recordOnChainCheckpoint(
            sessionId,
            milestoneId,
            ipfsHash,
            score
          );
        }
      } catch (error) {
        agentLogger.error({
          sessionId,
          milestoneId,
          error: (error as Error).message
        }, 'ProjectManager: IPFS upload failed, recording checkpoint without IPFS');
        
        // Fallback: record checkpoint without IPFS
        session.verification.milestone_scores.push({
          milestone_id: milestoneId,
          score,
          feedback: `IPFS upload failed: ${(error as Error).message}`,
          submission_hash: codeHash,
          ipfs_hash: '',
          timestamp: Date.now()
        });
      }
    } else {
      // No IPFS service available - record without IPFS
      session.verification.milestone_scores.push({
        milestone_id: milestoneId,
        score,
        feedback: '',
        submission_hash: codeHash,
        ipfs_hash: '',
        timestamp: Date.now()
      });
    }

    session.staking.milestone_checkpoints.push(milestoneId);
    this.updateSessionInternal(sessionId, session);

    logger.info({
      sessionId,
      milestoneId,
      score,
      ipfsHash,
      onChainTxHash,
      totalCheckpoints: session.staking.milestone_checkpoints.length
    }, 'ProjectManager: Checkpoint recorded');

    return {
      sessionId,
      milestoneId,
      score,
      codeHash,
      ipfsHash,
      onChainTxHash,
      timestamp: Date.now(),
      ipfsGatewayUrl: ipfsHash ? `https://gateway.pinata.cloud/ipfs/${ipfsHash}` : ''
    };
  }

  /**
   * Capture complete code state at milestone completion
   */
  private async captureCodeSnapshot(
    session: SessionState,
    milestoneId: number,
    score: number
  ): Promise<MilestoneSnapshot> {
    const files: CodeFileSnapshot[] = [];
    
    // Capture accumulated code from session
    for (const codeFile of session.project.accumulated_code) {
      const fileHash = this.calculateFileHash(codeFile.content);
      files.push({
        path: codeFile.file_path,
        content: codeFile.content,
        size: codeFile.content.length,
        lastModified: codeFile.last_modified,
        hash: fileHash,
        encoding: 'utf-8' as const
      });
    }
    
    // Extract dependencies
    const dependencies = this.extractDependencies(session);
    
    // Calculate snapshot checksum
    const snapshotContent = JSON.stringify({ files, dependencies });
    const checksum = this.calculateChecksum(snapshotContent);
    
    return {
      sessionId: session.session_id,
      milestoneId,
      userAddress: session.user_address,
      timestamp: Date.now(),
      files,
      dependencies,
      metadata: {
        framework: this.detectFramework(files),
        language: this.detectLanguage(files),
        testResults: [],
        buildStatus: 'success' as const,
        aiScore: this.calculateAverageScore(session)
      },
      ipfsHash: '',
      checksum,
      compressed: false
    };
  }

  /**
   * Upload snapshot to IPFS with verification
   */
  private async uploadSnapshotToIPFS(
    snapshot: MilestoneSnapshot,
    milestoneId: number
  ): Promise<string> {
    const startTime = Date.now();
    
    agentLogger.info({
      sessionId: snapshot.sessionId,
      milestoneId,
      fileSize: JSON.stringify(snapshot).length,
      fileCount: snapshot.files.length
    }, 'ProjectManager: Uploading snapshot to IPFS');
    
    try {
      // Upload to IPFS
      const ipfsHash = await this.ipfsService!.uploadJSON(
        snapshot,
        `snapshot-${snapshot.sessionId}-${milestoneId}.json`
      );
      
      agentLogger.info({
        sessionId: snapshot.sessionId,
        milestoneId,
        ipfsHash,
        uploadDuration: Date.now() - startTime
      }, 'ProjectManager: IPFS upload successful');
      
      return ipfsHash;
    } catch (error) {
      agentLogger.error({
        error: (error as Error).message,
        sessionId: snapshot.sessionId,
        milestoneId
      }, 'ProjectManager: IPFS upload failed');
      throw error;
    }
  }

  /**
   * Record checkpoint on blockchain with TEE signature
   */
  private async recordOnChainCheckpoint(
    sessionId: string,
    milestoneId: number,
    ipfsHash: string,
    score: number
  ): Promise<string | undefined> {
    try {
      if (!this.teeSigner || !this.attestationContract) {
        agentLogger.warn({
          sessionId,
          milestoneId,
          hasTEESigner: !!this.teeSigner,
          hasContract: !!this.attestationContract
        }, 'ProjectManager: On-chain checkpoint recording not available');
        return undefined;
      }

      const session = this.getSession(sessionId);
      if (!session) {
        agentLogger.error({ sessionId }, 'ProjectManager: Session not found');
        return undefined;
      }

      // Calculate code hash from accumulated code
      const allCode = session.project.accumulated_code.map(f => f.content).join('\n');
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(allCode));

      // Convert to bytes32 format
      const ipfsHashBytes = ethers.hexlify(ethers.toUtf8Bytes(ipfsHash));
      const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

      // Generate TEE signature
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await this.teeSigner.signCheckpoint({
        user: session.user_address,
        sessionId: sessionIdBytes,
        milestoneId,
        timestamp,
        ipfsHash: ipfsHashBytes,
        codeHash
      });

      agentLogger.info({
        sessionId,
        milestoneId,
        user: session.user_address,
        timestamp
      }, 'ProjectManager: Recording on-chain checkpoint');

      // Submit to blockchain
      const tx = await this.attestationContract.recordCheckpoint(
        session.user_address,
        sessionIdBytes,
        milestoneId,
        timestamp,
        ipfsHashBytes,
        codeHash,
        signature
      );

      const receipt = await tx.wait(2); // Wait for 2 confirmations

      agentLogger.info({
        sessionId,
        milestoneId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }, 'ProjectManager: On-chain checkpoint recorded successfully');

      return receipt.hash;
    } catch (error) {
      agentLogger.error({
        sessionId,
        milestoneId,
        error: (error as Error).message
      }, 'ProjectManager: On-chain checkpoint recording failed');
      return undefined;
    }
  }

  /**
   * Record milestone on-chain via staking contract
   */
  public async recordMilestoneOnChain(
    sessionId: string,
    milestoneId: number
  ): Promise<{ success: boolean; txHash?: string; error?: string; code?: string }> {
    try {
      const session = this.getSession(sessionId);

      // Validate session exists
      if (!session) {
        return { 
          success: false, 
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        };
      }

      if (!contractIntegration) {
        return { 
          success: false, 
          error: 'Contract integration not initialized',
          code: 'CONTRACT_NOT_INITIALIZED'
        };
      }

      const skillTopic = session.project.golden_path?.theory || 'unknown';

      // Validate milestone ID is valid (1-5)
      if (milestoneId < 1 || milestoneId > 5) {
        return { 
          success: false, 
          error: 'Invalid milestone ID (must be 1-5)',
          code: 'INVALID_MILESTONE_ID'
        };
      }

      // Validate user is staked
      const isStaked = await contractIntegration.verifyStake(
        session.user_address,
        skillTopic
      );

      if (!isStaked) {
        return { 
          success: false, 
          error: 'User not staked for this skill',
          code: 'USER_NOT_STAKED'
        };
      }

      // Validate milestone hasn't been recorded yet
      const stakeDetails = await contractIntegration.getStakeDetails(
        session.user_address,
        skillTopic
      );

      const currentMilestone = parseInt(stakeDetails.milestoneCheckpoint);
      if (milestoneId <= currentMilestone) {
        return { 
          success: false, 
          error: `Milestone ${milestoneId} already recorded (current: ${currentMilestone})`,
          code: 'MILESTONE_ALREADY_RECORDED'
        };
      }

      agentLogger.info({
        sessionId,
        milestoneId,
        userAddress: session.user_address,
        skillTopic,
        currentMilestone
      }, 'ProjectManager: Recording milestone on-chain');

      // Estimate gas before sending transaction
      try {
        const gasEstimate = await contractIntegration.staking.recordMilestone.estimateGas(
          session.user_address,
          skillTopic,
          milestoneId
        );

        agentLogger.info({
          sessionId,
          milestoneId,
          gasEstimate: gasEstimate.toString()
        }, 'ProjectManager: Gas estimated for milestone recording');
      } catch (gasError) {
        agentLogger.warn({ 
          sessionId, 
          milestoneId, 
          error: (gasError as Error).message 
        }, 'ProjectManager: Gas estimation failed, proceeding anyway');
      }

      const tx = await contractIntegration.recordMilestone(
        session.user_address,
        skillTopic,
        milestoneId
      );

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      // Update session state after recording
      if (!session.staking) {
        session.staking = {
          amount: 0,
          staked_at: 0,
          milestone_checkpoints: [],
          refund_claimed: false
        };
      }

      // Add milestone to checkpoints
      if (!session.staking.milestone_checkpoints.includes(milestoneId)) {
        session.staking.milestone_checkpoints.push(milestoneId);
      }

      session.updated_at = new Date();
      this.updateSession(sessionId, session);

      agentLogger.info({
        sessionId,
        milestoneId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      }, 'ProjectManager: Milestone recorded on-chain successfully');

      return { 
        success: true, 
        txHash: tx.hash,
        code: 'MILESTONE_RECORDED'
      };
    } catch (error: any) {
      agentLogger.error({
        sessionId,
        milestoneId,
        error: error.message,
        code: error.code,
        reason: error.reason
      }, 'ProjectManager: Failed to record milestone on-chain');

      // Provide user-friendly error messages
      let userMessage = 'Failed to record milestone';
      let errorCode = 'CONTRACT_ERROR';

      if (error.code === 'CALL_EXCEPTION') {
        userMessage = `Contract call failed: ${error.reason || 'Unknown reason'}`;
        errorCode = 'CALL_EXCEPTION';
      } else if (error.code === 'NETWORK_ERROR') {
        userMessage = 'Network error, please try again';
        errorCode = 'NETWORK_ERROR';
      } else if (error.message?.includes('insufficient funds')) {
        userMessage = 'Insufficient gas for transaction';
        errorCode = 'INSUFFICIENT_FUNDS';
      } else if (error.message?.includes('Only TEE can call this function')) {
        userMessage = 'Contract configuration error: TEE address mismatch';
        errorCode = 'TEE_ADDRESS_MISMATCH';
      }

      return {
        success: false,
        error: userMessage,
        code: errorCode
      };
    }
  }

  /**
   * Submit final attestation on-chain
   */
  public async submitFinalAttestation(
    sessionId: string
  ): Promise<{ success: boolean; txHash?: string; ipfsHash?: string; finalScore?: number; error?: string; code?: string }> {
    try {
      const session = this.getSession(sessionId);

      // Validate session exists
      if (!session) {
        return { 
          success: false, 
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        };
      }

      if (!contractIntegration || !eip712Signer) {
        return { 
          success: false, 
          error: 'Contract integration not initialized',
          code: 'CONTRACT_NOT_INITIALIZED'
        };
      }

      if (session.verification.milestone_scores.length === 0) {
        return { 
          success: false, 
          error: 'No milestone scores available',
          code: 'NO_MILESTONE_SCORES'
        };
      }

      // Validate all 5 milestones are completed
      if (session.verification.milestone_scores.length < 5) {
        return {
          success: false,
          error: `Not all milestones completed (${session.verification.milestone_scores.length}/5)`,
          code: 'INCOMPLETE_MILESTONES'
        };
      }

      const skillTopic = session.project.golden_path?.theory || 'unknown';

      // Validate user is staked
      const isStaked = await contractIntegration.verifyStake(
        session.user_address,
        skillTopic
      );

      if (!isStaked) {
        return { 
          success: false, 
          error: 'User not staked for this skill',
          code: 'USER_NOT_STAKED'
        };
      }

      // Validate attestation doesn't already exist
      const attestationResult = await contractIntegration.verifyAttestation(
        session.user_address,
        skillTopic
      );

      if (attestationResult?.exists) {
        return {
          success: false,
          error: 'Attestation already exists for this user/skill',
          code: 'ATTESTATION_EXISTS'
        };
      }

      const milestoneScores = session.verification.milestone_scores.map(s => s.score);
      const finalScore = this.calculateFinalScore(session);

      const lastCheckpoint = session.verification.milestone_scores[session.verification.milestone_scores.length - 1];
      const ipfsHash = lastCheckpoint?.ipfs_hash || '';

      // Validate IPFS hash
      if (!ipfsHash || ipfsHash === '') {
        return { 
          success: false, 
          error: 'No IPFS hash available for code snapshot',
          code: 'NO_IPFS_HASH'
        };
      }

      // Validate final score is in valid range
      if (finalScore < 0 || finalScore > 100) {
        return { 
          success: false, 
          error: `Invalid final score: ${finalScore}`,
          code: 'INVALID_SCORE'
        };
      }

      const nonce = Date.now();

      const signature = await eip712Signer.signAttestation({
        user: session.user_address,
        skill: skillTopic,
        score: finalScore,
        nonce,
        ipfsHash
      });

      agentLogger.info({
        sessionId,
        userAddress: session.user_address,
        skillTopic,
        finalScore,
        milestoneScoresCount: milestoneScores.length,
        ipfsHash
      }, 'ProjectManager: Submitting final attestation on-chain');

      // Estimate gas before sending transaction
      try {
        const gasEstimate = await contractIntegration.attestation.submitAttestation.estimateGas(
          session.user_address,
          skillTopic,
          finalScore,
          signature,
          ipfsHash,
          milestoneScores
        );

        agentLogger.info({
          sessionId,
          finalScore,
          gasEstimate: gasEstimate.toString()
        }, 'ProjectManager: Gas estimated for attestation submission');
      } catch (gasError) {
        agentLogger.warn({ 
          sessionId, 
          error: (gasError as Error).message 
        }, 'ProjectManager: Gas estimation failed, proceeding anyway');
      }

      const tx = await contractIntegration.submitAttestation(
        session.user_address,
        skillTopic,
        finalScore,
        signature,
        ipfsHash,
        milestoneScores
      );

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      // Update session state to reflect attestation submission
      if (!session.staking) {
        session.staking = {
          amount: 0,
          staked_at: 0,
          milestone_checkpoints: [],
          refund_claimed: false
        };
      }

      session.staking.refund_claimed = false; // Reset for refund claiming
      session.updated_at = new Date();
      this.updateSession(sessionId, session);

      agentLogger.info({
        sessionId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        finalScore
      }, 'ProjectManager: Final attestation submitted successfully');

      return {
        success: true,
        txHash: tx.hash,
        ipfsHash,
        finalScore,
        code: 'ATTESTATION_SUBMITTED'
      };
    } catch (error: any) {
      agentLogger.error({
        sessionId,
        error: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      }, 'ProjectManager: Failed to submit final attestation');

      // Provide user-friendly error messages
      let userMessage = 'Failed to submit attestation';
      let errorCode = 'CONTRACT_ERROR';

      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason?.includes('Invalid score')) {
          userMessage = 'Final score must be between 0 and 100';
          errorCode = 'INVALID_SCORE';
        } else if (error.reason?.includes('Invalid signature')) {
          userMessage = 'TEESigner generated invalid signature';
          errorCode = 'INVALID_SIGNATURE';
        } else if (error.reason?.includes('Attestation already exists')) {
          userMessage = 'An attestation for this skill already exists';
          errorCode = 'ATTESTATION_EXISTS';
        } else if (error.reason?.includes('Only TEE')) {
          userMessage = 'Contract configuration error: TEE address mismatch';
          errorCode = 'TEE_ADDRESS_MISMATCH';
        } else {
          userMessage = `Contract call failed: ${error.reason || 'Unknown reason'}`;
          errorCode = 'CALL_EXCEPTION';
        }
      } else if (error.code === 'NETWORK_ERROR') {
        userMessage = 'Network error, please try again';
        errorCode = 'NETWORK_ERROR';
      } else if (error.message?.includes('insufficient funds')) {
        userMessage = 'Insufficient gas for transaction';
        errorCode = 'INSUFFICIENT_FUNDS';
      }

      return {
        success: false,
        error: userMessage,
        code: errorCode
      };
    }
  }

  /**
   * Claim refund for user on staking contract
   */
  public async claimRefundForUser(
    sessionId: string
  ): Promise<{ success: boolean; txHash?: string; refundAmount?: string; finalScore?: number; error?: string; code?: string }> {
    try {
      const session = this.getSession(sessionId);

      // Validate session exists
      if (!session) {
        return { 
          success: false, 
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        };
      }

      if (!contractIntegration) {
        return { 
          success: false, 
          error: 'Contract integration not initialized',
          code: 'CONTRACT_NOT_INITIALIZED'
        };
      }

      const skillTopic = session.project.golden_path?.theory || 'unknown';

      // Verify attestation exists
      const attestationExists = await contractIntegration.verifyAttestation(
        session.user_address,
        skillTopic
      );

      if (!attestationExists) {
        return { 
          success: false, 
          error: 'No attestation found for this user/skill',
          code: 'NO_ATTESTATION'
        };
      }

      // Verify stake hasn't been refunded yet
      const stakeDetails = await contractIntegration.getStakeDetails(
        session.user_address,
        skillTopic
      );

      if (stakeDetails.refunded) {
        return { 
          success: false, 
          error: 'Stake has already been refunded',
          code: 'ALREADY_REFUNDED'
        };
      }

      const finalScore = parseInt(stakeDetails.attestationComplete ? stakeDetails.amount : '0') > 0 
        ? this.calculateFinalScore(session) 
        : 0;

      agentLogger.info({
        sessionId,
        userAddress: session.user_address,
        skillTopic,
        finalScore
      }, 'ProjectManager: Claiming refund on-chain');

      const tx = await contractIntegration.claimRefund(
        session.user_address,
        skillTopic
      );

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      // Get refund amount from event logs
      let refundAmount = '0';
      try {
        const refundEvent = receipt.logs?.find(log => {
          try {
            const parsed = contractIntegration!.staking.interface.parseLog(log);
            return parsed?.name === 'RefundClaimed';
          } catch {
            return false;
          }
        });

        if (refundEvent) {
          const parsed = contractIntegration.staking.interface.parseLog(refundEvent);
          refundAmount = parsed?.args?.amount?.toString() || '0';
        }
      } catch (parseError) {
        agentLogger.warn({ error: (parseError as Error).message }, 'Failed to parse refund event');
        // Use estimated refund amount
        refundAmount = finalScore >= 70 ? '800000000000000000' : '200000000000000000'; // 0.0008 or 0.0002 ETH
      }

      // Update session state
      if (!session.staking) {
        session.staking = {
          amount: 0,
          staked_at: 0,
          milestone_checkpoints: [],
          refund_claimed: false
        };
      }

      session.staking.refund_claimed = true;
      session.updated_at = new Date();
      this.updateSession(sessionId, session);

      agentLogger.info({
        sessionId,
        txHash: tx.hash,
        refundAmount,
        finalScore
      }, 'ProjectManager: Refund claimed successfully');

      return {
        success: true,
        txHash: tx.hash,
        refundAmount,
        finalScore,
        code: 'REFUND_CLAIMED'
      };
    } catch (error: any) {
      agentLogger.error({
        sessionId,
        error: error.message,
        code: error.code,
        reason: error.reason
      }, 'ProjectManager: Failed to claim refund');

      // Provide user-friendly error messages
      let userMessage = 'Failed to claim refund';
      let errorCode = 'CONTRACT_ERROR';

      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason?.includes('No active stake')) {
          userMessage = 'No active stake found for this user/skill';
          errorCode = 'NO_ACTIVE_STAKE';
        } else if (error.reason?.includes('Already refunded')) {
          userMessage = 'Stake has already been refunded';
          errorCode = 'ALREADY_REFUNDED';
        } else if (error.reason?.includes('Attestation not complete')) {
          userMessage = 'Cannot refund before attestation is complete';
          errorCode = 'ATTESTATION_NOT_COMPLETE';
        } else {
          userMessage = `Contract call failed: ${error.reason || 'Unknown reason'}`;
          errorCode = 'CALL_EXCEPTION';
        }
      } else if (error.code === 'NETWORK_ERROR') {
        userMessage = 'Network error, please try again';
        errorCode = 'NETWORK_ERROR';
      } else if (error.message?.includes('insufficient funds')) {
        userMessage = 'Insufficient gas for transaction';
        errorCode = 'INSUFFICIENT_FUNDS';
      }

      return {
        success: false,
        error: userMessage,
        code: errorCode
      };
    }
  }

  /**
   * Extract dependencies from session code
   */
  private extractDependencies(session: SessionState): DependencyInfo[] {
    const deps = new Map<string, DependencyInfo>();
    
    session.project.accumulated_code.forEach(f => {
      // Match npm/yarn imports: import X from 'package' or require('package')
      const npmImports = f.content.match(/(?:import\s+.*\s+from\s+|require\(['"])['"]([^'"]+)['"]/g);
      if (npmImports) {
        npmImports.forEach(match => {
          const pkgMatch = match.match(/['"](@?[a-zA-Z0-9][\w\-.]*\/?[a-zA-Z0-9][\w\-.]*)['"]/);
          if (pkgMatch) {
            const pkgName = pkgMatch[1];
            if (!pkgName.startsWith('.') && !deps.has(pkgName)) {
              deps.set(pkgName, {
                name: pkgName,
                version: 'latest',
                type: 'npm' as const,
                dev: false
              });
            }
          }
        });
      }
    });
    
    return Array.from(deps.values());
  }

  /**
   * Detect framework from code files
   */
  private detectFramework(files: CodeFileSnapshot[]): string {
    const filePaths = files.map(f => f.path.toLowerCase());
    
    if (filePaths.some(p => p.includes('react') || p.endsWith('.tsx'))) return 'React';
    if (filePaths.some(p => p.includes('vue'))) return 'Vue';
    if (filePaths.some(p => p.includes('angular'))) return 'Angular';
    if (filePaths.some(p => p.includes('next'))) return 'Next.js';
    if (filePaths.some(p => p.includes('express'))) return 'Express';
    if (filePaths.some(p => p.includes('fastapi'))) return 'FastAPI';
    if (filePaths.some(p => p.includes('django'))) return 'Django';
    
    return 'Vanilla';
  }

  /**
   * Detect primary language from code files
   */
  private detectLanguage(files: CodeFileSnapshot[]): string {
    const extensions = new Set(files.map(f => f.path.split('.').pop()?.toLowerCase()));
    
    if (extensions.has('ts') || extensions.has('tsx')) return 'TypeScript';
    if (extensions.has('js') || extensions.has('jsx')) return 'JavaScript';
    if (extensions.has('py')) return 'Python';
    if (extensions.has('rs')) return 'Rust';
    if (extensions.has('go')) return 'Go';
    if (extensions.has('java')) return 'Java';
    if (extensions.has('cpp') || extensions.has('hpp')) return 'C++';
    if (extensions.has('c')) return 'C';
    
    return 'Unknown';
  }

  /**
   * Calculate average score from session
   */
  private calculateAverageScore(session: SessionState): number {
    const scores = session.verification.milestone_scores;
    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / scores.length);
  }

  /**
   * Calculate final score using weighted average
   * Later milestones are weighted more heavily
   */
  private calculateFinalScore(session: SessionState): number {
    const milestoneScores = session.verification.milestone_scores
      .filter(m => m.milestone_id > 0)
      .sort((a, b) => a.milestone_id - b.milestone_id);

    if (milestoneScores.length === 0) {
      return 0;
    }

    // Calculate weighted average (later milestones worth more)
    // Milestone 1 = weight 1, Milestone 2 = weight 2, etc.
    const weights = milestoneScores.map((_, i) => i + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = milestoneScores.reduce((sum, m, i) => sum + (m.score * weights[i]), 0);
    const weightedAverage = weightedSum / totalWeight;

    return Math.round(weightedAverage);
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Calculate file hash
   */
  private calculateFileHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private getAccumulatedCode(session: SessionState): string {
    return session.project.accumulated_code
      .map(f => f.content)
      .join('\n\n');
  }

  private getAccumulatedDependencies(session: SessionState): string[] {
    const deps = new Set<string>();
    session.project.accumulated_code.forEach(f => {
      const imports = f.content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
      if (imports) {
        imports.forEach(m => deps.add(m[1]));
      }
    });
    return Array.from(deps);
  }

  private getSession(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  private updateSessionInternal(sessionId: string, session: SessionState): void {
    session.updated_at = new Date();
    this.sessions.set(sessionId, session);
  }

  public updateSession(sessionId: string, session: SessionState): void {
    this.updateSessionInternal(sessionId, session);
  }

  getSessionState(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info({ sessionId }, 'ProjectManager: Session cleaned up');
  }
}
