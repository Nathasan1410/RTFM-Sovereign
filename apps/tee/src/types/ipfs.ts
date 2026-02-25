/**
 * IPFS Integration Type Definitions
 *
 * Types for milestone checkpoint code snapshots stored on IPFS.
 * Used for staking and attestation system verification.
 *
 * @module apps/tee/src/types/ipfs
 */

/**
 * Complete snapshot of code at a milestone checkpoint
 */
export interface MilestoneSnapshot {
  sessionId: string;
  milestoneId: number;
  userAddress: string;
  timestamp: number;
  files: CodeFileSnapshot[];
  dependencies: DependencyInfo[];
  metadata: SnapshotMetadata;
  ipfsHash: string;
  checksum: string;
  compressed: boolean;
}

/**
 * Individual code file within a snapshot
 */
export interface CodeFileSnapshot {
  path: string;
  content: string;
  size: number;
  lastModified: number;
  hash: string;
  encoding: 'utf-8' | 'base64';
}

/**
 * Dependency information for the project
 */
export interface DependencyInfo {
  name: string;
  version: string;
  type: 'npm' | 'yarn' | 'pnpm' | 'python' | 'rust' | 'go';
  dev: boolean;
}

/**
 * Metadata about the snapshot
 */
export interface SnapshotMetadata {
  framework: string;
  language: string;
  testResults: TestResult[];
  buildStatus: 'success' | 'failure' | 'pending';
  aiScore: number;
  reviewer?: string;
  reviewTimestamp?: number;
}

/**
 * Test execution result
 */
export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  output: string;
}

/**
 * Complete checkpoint record with IPFS information
 */
export interface CheckpointRecord {
  sessionId: string;
  milestoneId: number;
  score: number;
  codeHash: string;
  ipfsHash: string;
  onChainTxHash?: string;
  timestamp: number;
  ipfsGatewayUrl: string;
}

/**
 * IPFS upload metrics for monitoring and debugging
 */
export interface IPFSUploadMetrics {
  sessionId: string;
  milestoneId: number;
  fileSize: number;
  compressedSize?: number;
  uploadDuration: number;
  retries: number;
  cid: string;
  gatewayUrl: string;
}

/**
 * Checkpoint trigger information
 */
export interface CheckpointTrigger {
  milestoneId: number;
  triggerType: 'automatic' | 'manual' | 'emergency';
  timestamp: number;
  codeSnapshot: MilestoneSnapshot;
  ipfsHash: string;
  onChainTxHash?: string;
}

/**
 * Enhanced milestone score with IPFS hash
 */
export interface MilestoneScoreWithIPFS {
  milestone_id: number;
  score: number;
  feedback: string;
  submission_hash: string;
  ipfs_hash: string;
  timestamp: number;
}
