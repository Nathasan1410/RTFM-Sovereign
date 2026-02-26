import { z } from 'zod';

export const CheckResultSchema = z.object({
  category: z.enum(['lint', 'type', 'ai']),
  status: z.enum(['PASS', 'FAIL', 'WARNING']),
  message: z.string(),
  details: z.array(z.any()).optional(),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;

export const VerifyRequestSchema = z.object({
  userCode: z.string().max(50000),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
    language: z.string().optional(),
  })).optional(),
  requirements: z.array(z.string()),
  topic: z.string().optional(),
});

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const VerifyResponseSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'PARTIAL']),
  feedback: z.string(),
  hints: z.array(z.string()).optional(),
  checks: z.array(CheckResultSchema).optional(),
});

export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

// ==================== DYNAMIC ROADMAP TYPES ====================

/**
 * Dynamic Micro-Step from backend
 * Maps to detailed learning step with verification
 */
export interface DynamicMicroStep {
  step_id: number;
  step_title: string;
  step_objective: string;
  
  prerequisites: {
    concepts: string[];
    previous_steps: number[];
    files_needed: string[];
  };

  theory: {
    explanation: string;
    key_concepts: string[];
    duration_minutes: number;
  };

  documentation: {
    required_docs: Array<{
      topic: string;
      url: string;
      relevance: string;
      sections_to_read: string[];
    }>;
  };

  challenge: {
    title: string;
    description: string;
    requirements: {
      must_include: string[];
      must_not_include: string[];
      constraints: string[];
    };
    deliverables: {
      file_names: string[];
      folder_structure: string;
      code_snippets?: string[];
    };
    success_criteria: {
      checks: string[];
      metrics: {
        min_lines_of_code: number;
        must_use_concepts: string[];
      };
    };
  };

  verification: {
    auto_check: {
      enabled: boolean;
      checks: Array<{
        type: 'file_exists' | 'syntax' | 'import' | 'export';
        description: string;
      }>;
    };
    manual_verification: {
      description: string;
      steps: string[];
    };
  };

  ground_truth: {
    final_code: string;
    key_explanation: string[];
    test_commands: string[];
  };

  documentation_references: Array<{
    topic: string;
    url: string;
    relevance: string;
  }>;

  next_step_hint: string;
}

/**
 * Dynamic Milestone from backend
 * Contains multiple micro-steps
 */
export interface DynamicMilestone {
  milestone_id: number;
  title: string;
  description: string;
  micro_steps: DynamicMicroStep[];
  success_criteria: string[];
  deep_mode: boolean;
  estimated_time: number;
  prerequisites: number[];
  rubric: {
    functionality_weight: number;
    code_quality_weight: number;
    best_practices_weight: number;
    innovation_weight: number;
  };
  key_concepts: string[];
}

/**
 * Dynamic Golden Path response from backend
 */
export interface DynamicGoldenPathResponse {
  success: boolean;
  project_id: string;
  project_title: string;
  tech_stack: {
    framework: string;
    language: string;
    styling: string;
    tools: string[];
  };
  milestones: DynamicMilestone[];
  total_steps: number;
  estimated_duration_hours: number;
}
