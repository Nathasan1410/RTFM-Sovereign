export interface GoldenPath {
  topic: string;
  theory: string;
  objectives: string[];
  prerequisites: string[];
}

export interface SessionState {
  session_id: string;
  user_address: string;
  project: ProjectState;
  staking: StakingState;
  ai_agents: AgentState;
  verification: VerificationState;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectState {
  golden_path: GoldenPath | null;
  current_milestone: number;
  current_micro_step: number;
  completed_milestones: number[];
  accumulated_code: CodeFile[];
}

export interface CodeFile {
  file_path: string;
  content: string;
  last_modified: number;
}

export interface StakingState {
  amount: number;
  staked_at: number;
  milestone_checkpoints: number[];
  refund_claimed: boolean;
}

export interface AgentState {
  agent_3_instances: Agent3Instance[];
}

export interface Agent3Instance {
  instance_id: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  step_output: MicroStepOutput | null;
  timestamp: number;
}

export interface VerificationState {
  milestone_scores: MilestoneScore[];
}

export interface MilestoneScore {
  milestone_id: number;
  score: number;
  feedback: string;
  submission_hash: string;
  ipfs_hash: string;
  timestamp: number;
}

export interface DelegationPayload {
  delegation_type: 'LITE_MODE' | 'DEEP_MODE_SWARM' | 'CHECKPOINT';
  session_context: SessionContext;
  milestone_spec?: MilestoneSpec;
  swarm_configuration?: SwarmConfiguration;
}

export interface SessionContext {
  session_id: string;
  user_address: string;
  current_milestone: number;
  previous_code_state: string;
  accumulated_dependencies: string[];
}

export interface MilestoneSpec {
  title: string;
  description: string;
  success_criteria: string[];
  rubric: Rubric;
  file_targets: string[];
}

export interface Rubric {
  completeness: number;
  code_quality: number;
  best_practices: number;
  documentation: number;
}

export interface SwarmConfiguration {
  iteration_count: number;
  execution_mode: 'sequential' | 'parallel';
  context_passing: 'full' | 'partial' | 'none';
  early_exit_conditions: string[];
}

export interface MicroStep {
  step_id: number;
  title: string;
  objective: string;
  previous_context?: string;
  input_template: string;
  verification_criteria: string[];
  input_context: {
    previous_code: string;
    files_in_scope: string[];
    dependencies_available: string[];
  };
}

export interface MicroStepOutput {
  step_id: number;
  step_title: string;
  step_objective: string;
  input_context: {
    previous_code: string;
    files_in_scope: string[];
    dependencies_available: string[];
  };
  output_deliverable: {
    code_changes: CodeChange[];
    verification_checklist: VerificationItem[];
    concept_explanation: string;
    documentation_references: DocReference[];
  };
  next_step_hint: string;
}

export interface CodeChange {
  file_path: string;
  action: 'create' | 'modify' | 'delete';
  content: string;
  explanation: string;
}

export interface VerificationItem {
  check: string;
  test_type: 'regex' | 'ast' | 'runtime' | 'manual';
  pattern?: string;
}

export interface DocReference {
  title: string;
  url: string;
}

// ==================== ON-CHAIN CHECKPOINT TYPES ====================

/**
 * On-chain checkpoint record
 * Matches the Checkpoint struct in RTFMAttestation.sol
 */
export interface OnChainCheckpoint {
  user: string;           // User wallet address
  sessionId: string;      // Session identifier
  milestoneId: number;    // Milestone ID (3, 5, or 7)
  timestamp: number;      // Unix timestamp
  ipfsHash: string;       // IPFS hash of code snapshot
  signature: string;      // TEE signature
  verified: boolean;      // Verification status
  txHash?: string;        // Transaction hash (optional, for pending checkpoints)
  blockNumber?: number;   // Block number (optional)
  gasUsed?: string;       // Gas used (optional)
}

/**
 * Checkpoint data for EIP-712 signing
 * Matches the CheckpointData struct in RTFMAttestation.sol
 */
export interface CheckpointData {
  user: string;           // User wallet address
  sessionId: string;      // Session identifier (bytes32 as hex string)
  milestoneId: number;    // Milestone ID (3, 5, or 7)
  timestamp: number;      // Unix timestamp
  ipfsHash: string;       // IPFS hash (bytes32 as hex string)
  codeHash: string;       // Hash of code snapshot content (bytes32 as hex string)
}

/**
 * TEE signature components
 */
export interface TEESignature {
  signature: string;      // Full signature (0x + r + s + v)
  r: string;              // r component (64 chars)
  s: string;              // s component (64 chars)
  v: number;              // v component (27 or 28)
}

/**
 * Checkpoint verification result
 */
export interface CheckpointVerificationResult {
  onChainVerified: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
}

/**
 * On-chain checkpoint record with transaction details
 */
export interface OnChainCheckpointRecord extends OnChainCheckpoint {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  confirmations: number;
}

// ==================== DYNAMIC ROADMAP TYPES ====================

/**
 * Topic analysis result
 * Used by ArchitectAgent to analyze user learning requests
 */
export interface TopicAnalysis {
  project_type: 'component' | 'page' | 'feature' | 'system' | 'application';
  tech_stack: {
    framework: string;
    language: string;
    styling: string;
    tools: string[];
  };
  key_concepts: string[];
  phases: Array<{
    phase_number: number;
    phase_title: string;
    key_concepts: string[];
    estimated_time_minutes: number;
  }>;
}

/**
 * Micro-step with detailed context and verification
 * Following the IMPLEMENTATION_GUIDE.md specification
 */
export interface DynamicMicroStep {
  step_id: number;
  step_title: string;
  step_objective: string;
  
  prerequisites: {
    concepts: string[];           // Konsep yang harus dipahami
    previous_steps: number[];      // Step yang harus selesai sebelumnya
    files_needed: string[];         // File yang harus sudah ada
  };

  theory: {
    explanation: string;             // Penjelasan singkat konsep
    key_concepts: string[];        // Poin-poin penting
    duration_minutes: number;          // Estimasi waktu
  };

  documentation: {
    required_docs: Array<{
      topic: string;              // Topik spesifik
      url: string;               // Link ke dokumentasi
      relevance: string;           // Kenapa relevan
      sections_to_read: string[];  // Bagian mana yang harus dibaca
    }>;
  };

  challenge: {
    title: string;
    description: string;
    requirements: {
      must_include: string[];      // Fitur yang harus ada
      must_not_include: string[];  // Fitur yang tidak boleh ada
      constraints: string[];         // Batasan teknis
    };
    deliverables: {
      file_names: string[];        // Nama file yang harus dibuat
      folder_structure: string;      // Struktur folder
      code_snippets?: string[];      // Snippet contoh (optional)
    };
    success_criteria: {
      checks: string[];            // Checklist yang bisa dicek
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
    final_code: string;           // Code lengkap yang benar
    key_explanation: string[];     // Penjelasan bagian penting
    test_commands: string[];       // Command untuk testing
  };

  documentation_references: Array<{
    topic: string;
    url: string;
    relevance: string;
  }>;

  next_step_hint: string;
}

/**
 * Dynamic milestone with context-aware micro-steps
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
 * Dynamic golden path generated by ArchitectAgent
 * Context-aware and topic-specific (not template-based)
 */
export interface DynamicGoldenPath {
  project_id: string;
  project_title: string;
  tech_stack: {
    framework: string;
    language: string;
    styling: string;
    tools: string[];
  };
  milestones: DynamicMilestone[];
  estimated_duration: number;  // in minutes
}
