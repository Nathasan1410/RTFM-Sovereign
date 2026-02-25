
import { z } from 'zod';

// ==========================================
// 1. AGENT 1 (ARCHITECT) SCHEMAS
// ==========================================

export const GoldenPathSchema = z.object({
  project_id: z.string().uuid(),
  project_title: z.string(),
  learning_objectives: z.array(z.string()),
  tech_stack: z.object({
    framework: z.string(),
    styling: z.string(),
    language: z.string()
  }),
  file_structure: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    template_type: z.enum(['component', 'hook', 'style', 'asset', 'config', 'other'])
  })),
  milestones: z.array(z.object({
    milestone_id: z.number(),
    title: z.string(),
    description: z.string(),
    success_criteria: z.array(z.string()),
    deep_mode: z.boolean(),
    estimated_time: z.number(),
    prerequisites: z.array(z.number()),
    rubric: z.object({
      functionality_weight: z.number(),
      code_quality_weight: z.number(),
      best_practices_weight: z.number(),
      innovation_weight: z.number()
    }),
    key_concepts: z.array(z.string())
  })),
  final_deliverable: z.object({
    description: z.string(),
    demo_commands: z.array(z.string()),
    verification_tests: z.array(z.string())
  })
});

export type GoldenPath = z.infer<typeof GoldenPathSchema>;

// ==========================================
// 2. AGENT 2 (PROJECT MANAGER) SCHEMAS
// ==========================================

export const SessionStateSchema = z.object({
  session_id: z.string().uuid(),
  user_address: z.string(),
  project: z.object({
    golden_path: GoldenPathSchema,
    current_milestone: z.number(),
    current_micro_step: z.number(),
    completed_milestones: z.array(z.number()),
    accumulated_code: z.array(z.object({
      file_path: z.string(),
      content: z.string(),
      last_modified: z.number()
    }))
  }),
  staking: z.object({
    amount: z.number(),
    staked_at: z.number(),
    milestone_checkpoints: z.array(z.object({
      milestone_id: z.number(),
      checkpointed_at: z.string(),
      tx_hash: z.string()
    })),
    refund_claimed: z.boolean(),
    refunded_at: z.string().optional(),
    refund_tx: z.string().optional()
  }),
  ai_agents: z.object({
    agent_3_instances: z.array(z.object({
      instance_id: z.number(),
      status: z.enum(['idle', 'processing', 'complete', 'error']),
      step_output: z.any().optional(), // Defined below
      timestamp: z.number()
    }))
  }),
  verification: z.object({
    milestone_scores: z.array(z.object({
      milestone_id: z.number(),
      score: z.number(),
      feedback: z.string(),
      submission_hash: z.string(),
      timestamp: z.number(),
      verified_at: z.string().optional()
    })),
    attestation_tx: z.string().optional(),
    ipfs_hash: z.string().optional(),
    final_score: z.number().optional(),
    attested_at: z.string().optional()
  })
});

export type SessionState = z.infer<typeof SessionStateSchema>;

export const DelegationPayloadSchema = z.object({
  delegation_type: z.literal('DEEP_MODE_SWARM'),
  session_context: z.object({
    session_id: z.string().uuid(),
    user_address: z.string(),
    current_milestone: z.number(),
    previous_code_state: z.string(), // Stringified JSON of accumulated code
    accumulated_dependencies: z.array(z.string())
  }),
  milestone_spec: z.object({
    title: z.string(),
    description: z.string(),
    success_criteria: z.array(z.string()),
    rubric: z.object({
        functionality_weight: z.number(),
        code_quality_weight: z.number(),
        best_practices_weight: z.number(),
        innovation_weight: z.number()
    }),
    file_targets: z.array(z.string())
  }),
  swarm_configuration: z.object({
    iteration_count: z.number().min(3).max(7),
    execution_mode: z.enum(['sequential', 'parallel']),
    context_passing: z.literal('full'),
    early_exit_conditions: z.array(z.string())
  })
});

export type DelegationPayload = z.infer<typeof DelegationPayloadSchema>;

// ==========================================
// 3. AGENT 3 (SWARM) SCHEMAS
// ==========================================

export const MicroStepOutputSchema = z.object({
  step_id: z.number(),
  step_title: z.string(),
  step_objective: z.string(),
  input_context: z.object({
    previous_code: z.string(),
    files_in_scope: z.array(z.string()),
    dependencies_available: z.array(z.string())
  }),
  output_deliverable: z.object({
    code_changes: z.array(z.object({
      file_path: z.string(),
      action: z.enum(['create', 'modify', 'delete']),
      content: z.string(),
      explanation: z.string()
    })),
    verification_checklist: z.array(z.object({
      check: z.string(),
      test_type: z.enum(['ast_check', 'regex', 'lint'])
    })),
    concept_explanation: z.string(),
    documentation_references: z.array(z.object({
      topic: z.string(),
      url: z.string(),
      relevance: z.string()
    }))
  }),
  next_step_hint: z.string()
});

export type MicroStepOutput = z.infer<typeof MicroStepOutputSchema>;

export const CheckpointPayloadSchema = z.object({
  checkpoint_type: z.literal('MILESTONE_COMPLETE'),
  session_id: z.string().uuid(),
  milestone_id: z.number(),
  user_address: z.string(),
  score_cumulative: z.number(),
  code_ipfs_hash: z.string(),
  tee_signature: z.string()
});

export type CheckpointPayload = z.infer<typeof CheckpointPayloadSchema>;
