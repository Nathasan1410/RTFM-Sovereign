
import { v4 as uuidv4 } from 'uuid';
import { SessionState, SessionStateSchema, GoldenPath, DelegationPayload, DelegationPayloadSchema } from '../schemas';
import { agentLogger } from '../../utils/logger';
import { SwarmAgent } from '../swarm/SwarmAgent';
import { JudgingEngine, JudgingRequest } from '../../judging/JudgingEngine';

export class ProjectManagerAgent {
  private sessions: Map<string, SessionState> = new Map();
  private swarmAgent: SwarmAgent;
  private judgingEngine: JudgingEngine;

  constructor(swarmAgent: SwarmAgent, judgingEngine: JudgingEngine) {
    this.swarmAgent = swarmAgent;
    this.judgingEngine = judgingEngine;
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
}
