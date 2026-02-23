/**
 * Project Manager Agent
 *
 * Central orchestrator for learning sessions and project state management.
 * Manages the complete lifecycle of user learning sessions including session creation,
 * milestone tracking, code accumulation, and attestation recording.
 *
 * Key Responsibilities:
 * - Session lifecycle management (create, update, complete, fail)
 * - Golden path execution and milestone tracking
 * - Code accumulation across micro-steps
 * - Staking state management and checkpoint recording
 * - Integration with judging engine for code grading
 * - Blockchain integration for attestation recording
 * - IPFS snapshot uploads for persistent storage
 *
 * Dependencies:
 * - SwarmAgent: AI-powered task execution
 * - JudgingEngine: Code analysis and grading
 * - ContractIntegration: Smart contract interaction
 * - IPFSService: Decentralized storage
 *
 * @module apps/tee/src/agents/manager/ProjectManagerAgent
 */

import { v4 as uuidv4 } from 'uuid';
import { SessionState, SessionStateSchema, GoldenPath, DelegationPayload, DelegationPayloadSchema } from '../schemas';
import { agentLogger } from '../../utils/logger';
import { SwarmAgent } from '../swarm/SwarmAgent';
import { JudgingEngine, JudgingRequest } from '../../judging/JudgingEngine';
import { ContractIntegration, EIP712Signer, EIP712AttestationData } from '../../contracts';
import { IPFSService, IPFSSnapshot } from '../../services/ipfs';

export class ProjectManagerAgent {
  private sessions: Map<string, SessionState> = new Map();
  private swarmAgent: SwarmAgent;
  private judgingEngine: JudgingEngine;
  private contractIntegration: ContractIntegration | null = null;
  private eip712Signer: EIP712Signer | null = null;
  private ipfsService: IPFSService | null = null;

  constructor(swarmAgent: SwarmAgent, judgingEngine: JudgingEngine) {
    this.swarmAgent = swarmAgent;
    this.judgingEngine = judgingEngine;
  }

  public initializeContractIntegration(
    contractIntegration: ContractIntegration,
    eip712Signer: EIP712Signer,
    ipfsService: IPFSService
  ): void {
    this.contractIntegration = contractIntegration;
    this.eip712Signer = eip712Signer;
    this.ipfsService = ipfsService;
    agentLogger.info({ signer: eip712Signer.getSignerAddress() }, 'Contract integration initialized');
  }

  public async createSession(userAddress: string, goldenPath: GoldenPath): Promise<string> {
    const sessionId = uuidv4();
    const session: SessionState = {
      session_id: sessionId,
      user_address: userAddress,
      project: {
        golden_path: goldenPath,
        current_milestone: 1,
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
      }
    };

    // Validate initial state
    const validated = SessionStateSchema.parse(session);
    this.sessions.set(sessionId, validated);
    
    agentLogger.info({ sessionId, userAddress }, 'ProjectManager: Session Created');
    return sessionId;
  }

  public async processMilestone(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const currentMilestoneId = session.project.current_milestone;
    const milestone = session.project.golden_path.milestones.find(m => m.milestone_id === currentMilestoneId);
    
    if (!milestone) {
      agentLogger.warn({ sessionId, currentMilestoneId }, 'Milestone not found or project complete');
      return { status: 'COMPLETE', message: 'Project Complete' };
    }

    agentLogger.info({ sessionId, milestone: milestone.title, deepMode: milestone.deep_mode }, 'Processing Milestone');

    if (milestone.deep_mode) {
      // DELEGATE TO SWARM
      return this.delegateToSwarm(session, milestone);
    } else {
      // LITE MODE (Self-Execution or simple prompt)
      // For now, just return instructions
      return {
        status: 'LITE_MODE',
        instructions: `Execute milestone "${milestone.title}" manually. Success criteria: ${milestone.success_criteria.join(', ')}`
      };
    }
  }

  private async delegateToSwarm(session: SessionState, milestone: any) {
    const delegationPayload: DelegationPayload = {
      delegation_type: 'DEEP_MODE_SWARM',
      session_context: {
        session_id: session.session_id,
        user_address: session.user_address,
        current_milestone: milestone.milestone_id,
        previous_code_state: JSON.stringify(session.project.accumulated_code),
        accumulated_dependencies: [] // Extract from accumulated_code analysis in real impl
      },
      milestone_spec: {
        title: milestone.title,
        description: milestone.description,
        success_criteria: milestone.success_criteria,
        rubric: milestone.rubric,
        file_targets: [] // Determine from golden path or analysis
      },
      swarm_configuration: {
        iteration_count: 5, // Logic to determine complexity goes here
        execution_mode: 'sequential',
        context_passing: 'full',
        early_exit_conditions: ['syntax_error']
      }
    };

    // Validate Payload
    const validatedPayload = DelegationPayloadSchema.parse(delegationPayload);
    
    agentLogger.info({ sessionId: session.session_id, milestone: milestone.title }, 'Delegating to Swarm Agent');
    
    // Execute Swarm
    const swarmResult = await this.swarmAgent.executeSwarm(validatedPayload);
    
    // Update Session State with Swarm Result
    // In a real implementation, we would merge the code changes
    // session.project.accumulated_code = mergeCode(session.project.accumulated_code, swarmResult.code);
    
    return {
      status: 'DEEP_MODE_COMPLETE',
      swarm_output: swarmResult
    };
  }

  public async verifyMilestone(
    sessionId: string,
    milestoneId: number,
    codeFiles: Array<{ file_path: string; content: string; language?: string }>,
    rubric?: any,
    seed?: number
  ): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    agentLogger.info({ sessionId, milestoneId }, 'ProjectManager: Verifying Milestone');

    const submission = {
      user_address: session.user_address,
      session_id: sessionId,
      milestone_id: milestoneId,
      code_files: codeFiles.map(file => ({
        file_path: file.file_path,
        content: file.content,
        language: file.language || 'typescript'
      }))
    };

    const judgingRequest: JudgingRequest = {
      submission,
      rubric,
      seed: seed || Date.now()
    };

    const result = await this.judgingEngine.judge(judgingRequest);

    if (result.passed) {
      session.verification.milestone_scores.push({
        milestone_id: milestoneId,
        score: result.overall_score,
        verified_at: new Date().toISOString()
      });

      const completedMilestone = session.project.golden_path.milestones.find(m => m.milestone_id === milestoneId);
      if (completedMilestone) {
        session.project.completed_milestones.push(milestoneId);
      }
    }

    return {
      success: true,
      result,
      session_state: {
        current_milestone: session.project.current_milestone,
        completed_milestones: session.project.completed_milestones
      }
    };
  }

  public getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  public async recordMilestoneOnChain(
    sessionId: string,
    milestoneId: number
  ): Promise<any> {
    if (!this.contractIntegration) {
      throw new Error('Contract integration not initialized');
    }

    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    agentLogger.info({ sessionId, milestoneId }, 'Recording milestone on-chain');

    try {
      const hasStake = await this.contractIntegration.verifyStake(
        session.user_address,
        session.project.golden_path.project_title
      );

      if (!hasStake) {
        agentLogger.warn({ sessionId }, 'No active stake found');
        return { success: false, error: 'NO_STAKE' };
      }

      const tx = await this.contractIntegration.recordMilestone(
        session.user_address,
        session.project.golden_path.project_title,
        milestoneId
      );

      session.staking.milestone_checkpoints.push({
        milestone_id: milestoneId,
        checkpointed_at: new Date().toISOString(),
        tx_hash: tx.hash
      });

      agentLogger.info({ sessionId, milestoneId, txHash: tx.hash }, 'Milestone recorded on-chain');
      return { success: true, txHash: tx.hash };
    } catch (error) {
      agentLogger.error({ sessionId, milestoneId, error }, 'Failed to record milestone');
      return { success: false, error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' };
    }
  }

  public async submitFinalAttestation(
    sessionId: string
  ): Promise<any> {
    if (!this.contractIntegration || !this.eip712Signer || !this.ipfsService) {
      throw new Error('Contract integration not fully initialized');
    }

    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const scores = session.verification.milestone_scores;
    if (scores.length === 0) {
      throw new Error('No milestone scores available');
    }

    const finalScore = Math.round(
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    );

    agentLogger.info({ sessionId, finalScore }, 'Submitting final attestation');

    try {
      const ipfsSnapshot: IPFSSnapshot = {
        project: session.project.golden_path.project_title,
        user: session.user_address,
        milestones: scores.map(s => ({
          id: s.milestone_id,
          code: '',
          score: s.score,
          feedback: '',
          timestamp: new Date(s.verified_at).getTime()
        })),
        final_score: finalScore,
        attestation_tx: null
      };

      const ipfsHash = await this.ipfsService.uploadCodeSnapshot(ipfsSnapshot);

      const attestationData: EIP712AttestationData = {
        user: session.user_address,
        skill: session.project.golden_path.project_title,
        score: finalScore,
        nonce: Math.floor(Date.now() / 1000),
        ipfsHash: ipfsHash
      };

      const signature = await this.eip712Signer.signAttestation(attestationData);

      const milestoneScores = scores.map(s => s.score);

      const tx = await this.contractIntegration.submitAttestation(
        session.user_address,
        session.project.golden_path.project_title,
        finalScore,
        signature,
        ipfsHash,
        milestoneScores
      );

      session.verification.attestation_tx = tx.hash;
      session.verification.ipfs_hash = ipfsHash;
      session.verification.final_score = finalScore;
      session.verification.attested_at = new Date().toISOString();

      agentLogger.info({ 
        sessionId, 
        finalScore, 
        ipfsHash, 
        txHash: tx.hash 
      }, 'Attestation submitted successfully');

      return {
        success: true,
        txHash: tx.hash,
        ipfsHash,
        finalScore
      };
    } catch (error) {
      agentLogger.error({ sessionId, error }, 'Failed to submit attestation');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' 
      };
    }
  }

  public async claimRefundForUser(
    sessionId: string
  ): Promise<any> {
    if (!this.contractIntegration) {
      throw new Error('Contract integration not initialized');
    }

    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.staking.refund_claimed) {
      agentLogger.warn({ sessionId }, 'Refund already claimed');
      return { success: false, error: 'ALREADY_CLAIMED' };
    }

    if (!session.verification.final_score) {
      throw new Error('No final score available for refund calculation');
    }

    agentLogger.info({ sessionId }, 'Claiming refund');

    try {
      const finalScore = session.verification.final_score;
      const tx = await this.contractIntegration.claimRefund(
        session.user_address,
        session.project.golden_path.project_title,
        finalScore
      );

      session.staking.refund_claimed = true;
      session.staking.refunded_at = new Date().toISOString();
      session.staking.refund_tx = tx.hash;

      const stakeAmount = 0.001;
      const refundPercent = finalScore >= 70 ? 0.8 : 0.2;
      const refundAmount = (stakeAmount * refundPercent).toFixed(6);

      agentLogger.info({ 
        sessionId, 
        finalScore, 
        refundAmount, 
        txHash: tx.hash 
      }, 'Refund claimed successfully');

      return {
        success: true,
        txHash: tx.hash,
        refundAmount,
        finalScore
      };
    } catch (error) {
      agentLogger.error({ sessionId, error }, 'Failed to claim refund');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' 
      };
    }
  }
}
