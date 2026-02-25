import { LLMService } from '../../services/llm/LLMService';
import { DelegationPayload, MicroStepOutput, MicroStep } from '../types/delegation.types';
import { logger } from '../../utils/logger';

export class SwarmAgent {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  public async executeSwarm(payload: DelegationPayload): Promise<{ status: string; steps: MicroStepOutput[] }> {
    logger.info({ sessionId: payload.session_context.session_id, delegationType: payload.delegation_type }, 'SwarmAgent: Starting Execution');

    const swarmConfig = payload.swarm_configuration;
    if (!swarmConfig) {
      throw new Error('Swarm configuration is required');
    }

    const iterationCount = swarmConfig.iteration_count;
    const executionMode = swarmConfig.execution_mode;
    const contextPassing = swarmConfig.context_passing;
    const earlyExitConditions = swarmConfig.early_exit_conditions;

    const results: MicroStepOutput[] = [];
    let accumulatedContext = payload.session_context.previous_code_state;

    for (let i = 1; i <= iterationCount; i++) {
      logger.info({ iteration: i, total: iterationCount, executionMode }, 'SwarmAgent: Executing Micro-Step');

      try {
        const stepOutput = await this.executeMicroStep(i, payload, accumulatedContext);
        
        if (contextPassing === 'full' || contextPassing === 'partial') {
          accumulatedContext = this.updateAccumulatedContext(accumulatedContext, stepOutput);
        }

        results.push(stepOutput);
      } catch (error) {
        logger.error({ iteration: i, error: (error as Error).message }, 'SwarmAgent: Micro-Step failed');
        
        if (earlyExitConditions.includes('syntax_error') || earlyExitConditions.includes('test_failure')) {
          logger.warn({ iteration: i }, 'SwarmAgent: Early exit triggered');
          break;
        }
      }
    }

    logger.info({ sessionId: payload.session_context.session_id, totalSteps: results.length }, 'SwarmAgent: Execution Complete');
    return {
      status: 'COMPLETE',
      steps: results
    };
  }

  private async executeMicroStep(
    stepId: number,
    payload: DelegationPayload,
    accumulatedContext: string
  ): Promise<MicroStepOutput> {
    const milestoneTitle = payload.milestone_spec?.title || 'Module';
    const milestoneDescription = payload.milestone_spec?.description || 'Build a feature';
    const successCriteria = payload.milestone_spec?.success_criteria || [];
    const fileTargets = payload.milestone_spec?.file_targets || ['src/index.ts'];
    const dependencies = payload.session_context.accumulated_dependencies;

    const prompt = `Execute micro-step ${stepId} for: ${milestoneTitle}

OBJECTIVE: ${milestoneDescription}

CONTEXT:
- Previous code: ${accumulatedContext || 'No previous code (starting fresh)'}
- Files to modify: ${fileTargets.join(', ')}
- Available dependencies: ${dependencies.join(', ')}

SUCCESS CRITERIA:
${successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

INSTRUCTIONS:
1. Generate code changes for this micro-step
2. Update the specified files
3. Ensure all success criteria are met
4. Provide explanation and verification checklist

Output JSON only:
{
  "step_id": ${stepId},
  "step_title": "Micro-Step Title",
  "step_objective": "Specific objective",
  "input_context": {
    "previous_code": "${accumulatedContext || ''}",
    "files_in_scope": ${JSON.stringify(fileTargets)},
    "dependencies_available": ${JSON.stringify(dependencies)}
  },
  "output_deliverable": {
    "code_changes": [
      {
        "file_path": "path/to/file",
        "action": "create|modify|delete",
        "content": "code",
        "explanation": "why this change"
      }
    ],
    "verification_checklist": [
      { "check": "check description", "test_type": "regex|ast|runtime|manual", "pattern": "optional" }
    ],
    "concept_explanation": "What was implemented and why",
    "documentation_references": [
      { "title": "Reference Title", "url": "https://..." }
    ]
  },
  "next_step_hint": "Hint for next step or 'Milestone Complete'"
}`;

    const llmResponse = await this.llmService.generateChallenge(
      payload.session_context.user_address,
      `${milestoneTitle} - Step ${stepId}`,
      Date.now()
    );

    const stepOutput: MicroStepOutput = this.parseLLMResponse(llmResponse, stepId);
    return stepOutput;
  }

  private parseLLMResponse(response: any, stepId: number): MicroStepOutput {
    const content = typeof response === 'string' ? response : JSON.stringify(response);
    
    let jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonContent);
    
    return {
      step_id: parsed.step_id || stepId,
      step_title: parsed.step_title || `Micro-Step ${stepId}`,
      step_objective: parsed.step_objective || 'Complete implementation',
      input_context: {
        previous_code: parsed.input_context?.previous_code || '',
        files_in_scope: parsed.input_context?.files_in_scope || [],
        dependencies_available: parsed.input_context?.dependencies_available || []
      },
      output_deliverable: {
        code_changes: parsed.output_deliverable?.code_changes || [],
        verification_checklist: parsed.output_deliverable?.verification_checklist || [],
        concept_explanation: parsed.output_deliverable?.concept_explanation || '',
        documentation_references: parsed.output_deliverable?.documentation_references || []
      },
      next_step_hint: parsed.next_step_hint || 'Continue to next step'
    };
  }

  private updateAccumulatedContext(previousContext: string, stepOutput: MicroStepOutput): string {
    let newContext = previousContext;
    
    stepOutput.output_deliverable.code_changes.forEach(change => {
      if (change.action === 'create' || change.action === 'modify') {
        newContext += `\n\n// ${change.file_path}\n${change.content}`;
      }
    });
    
    return newContext;
  }
}
