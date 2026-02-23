export interface AttestationData {
  exists: boolean;
  score: number;
  timestamp: number;
  signature: string;
  ipfsHash: string;
  transactionHash: string;
  milestoneScores?: number[];
}

export interface RubricBreakdown {
  functionality: number;
  codeQuality: number;
  bestPractices: number;
  innovation: number;
}

export interface MilestoneData {
  id: number;
  score: number;
  codeSnapshot?: string;
  timestamp?: number;
  isCheckpoint: boolean;
}
