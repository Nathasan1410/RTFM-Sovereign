import { z } from 'zod';

export const CodeSubmissionSchema = z.object({
  user_address: z.string(),
  session_id: z.string().uuid(),
  milestone_id: z.number(),
  code_files: z.array(z.object({
    file_path: z.string(),
    content: z.string(),
    language: z.string()
  }))
});

export type CodeSubmission = z.infer<typeof CodeSubmissionSchema>;

export const RubricSchema = z.object({
  functionality_weight: z.number().min(0).max(1).default(0.4),
  quality_weight: z.number().min(0).max(1).default(0.3),
  best_practices_weight: z.number().min(0).max(1).default(0.2),
  innovation_weight: z.number().min(0).max(1).default(0.1)
});

export type Rubric = z.infer<typeof RubricSchema>;

export const Layer1ResultSchema = z.object({
  passed: z.boolean(),
  syntax_errors: z.array(z.string()),
  structural_issues: z.array(z.string()),
  security_violations: z.array(z.string()),
  file_count: z.number(),
  line_count: z.number(),
  ast_hash: z.string()
});

export type Layer1Result = z.infer<typeof Layer1ResultSchema>;

export const Layer2ResultSchema = z.object({
  functionality_score: z.number().min(0).max(100),
  quality_score: z.number().min(0).max(100),
  best_practices_score: z.number().min(0).max(100),
  innovation_score: z.number().min(0).max(100),
  weighted_score: z.number().min(0).max(100),
  feedback: z.string(),
  suggestions: z.array(z.string())
});

export type Layer2Result = z.infer<typeof Layer2ResultSchema>;

export const JudgingResultSchema = z.object({
  session_id: z.string().uuid(),
  milestone_id: z.number(),
  passed: z.boolean(),
  overall_score: z.number().min(0).max(100),
  layer1_result: Layer1ResultSchema,
  layer2_result: Layer2ResultSchema,
  rubric_used: RubricSchema,
  timestamp: z.string(),
  cached: z.boolean().default(false)
});

export type JudgingResult = z.infer<typeof JudgingResultSchema>;

export const JudgingRequestSchema = z.object({
  submission: CodeSubmissionSchema,
  rubric: RubricSchema.optional(),
  seed: z.number().optional().default(Date.now())
});

export type JudgingRequest = z.infer<typeof JudgingRequestSchema>;
