export type ChunkStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface DeploymentChunk {
  id: number;
  name: string;
  description: string;
  dependencies: number[];
  status: ChunkStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  output?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  gasUsed?: number;
  transactionHash?: string;
  isCritical: boolean;
}

export interface ContractDeploymentInfo {
  address: string;
  abi: any[];
  transactionHash: string;
  deployedAt: number;
  constructorArgs?: any[];
  bytecode?: string;
}

export interface DeploymentState {
  chunks: DeploymentChunk[];
  currentChunk: number;
  network: string;
  chainId: number;
  deployerAddress: string;
  contracts: {
    attestation?: ContractDeploymentInfo;
    staking?: ContractDeploymentInfo;
  };
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  success: boolean;
  error?: string;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer?: string;
  gasPrice?: string;
  gasLimit?: number;
}

export interface DeploymentConfig {
  network: NetworkConfig;
  privateKey: string;
  teeSignerAddress?: string;
  autoVerify: boolean;
  etherscanApiKey?: string;
  gasPrice?: string;
  gasLimit?: number;
}

export interface GasEstimate {
  attestation: number;
  staking: number;
  total: number;
  estimatedCost: string;
  currency: string;
}

export interface VerificationResult {
  contract: string;
  address: string;
  verified: boolean;
  functions: { name: string; working: boolean }[];
  events: { name: string; working: boolean }[];
  errors: string[];
}

export interface TestResult {
  contract: string;
  function: string;
  passed: boolean;
  transactionHash?: string;
  error?: string;
}

export interface DeploymentReport {
  summary: {
    startTime: string;
    endTime: string;
    duration: string;
    network: string;
    deployer: string;
    success: boolean;
  };
  chunks: DeploymentChunk[];
  contracts: {
    attestation?: ContractDeploymentInfo;
    staking?: ContractDeploymentInfo;
  };
  gasUsage: {
    attestation?: number;
    staking?: number;
    total?: number;
    cost?: string;
  };
  verification: VerificationResult[];
  tests: TestResult[];
  errors: string[];
}
