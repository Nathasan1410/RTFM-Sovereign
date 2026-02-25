import { ethers } from 'hardhat';

export const STAKING_PARAMS = {
  minStakeAmount: ethers.parseEther('0.001'),
  maxStakeAmount: ethers.parseEther('1.0'),
  totalMilestones: 5,
  passThreshold: 70,
  failRefundPercent: 20,
  passRefundPercent: 80
} as const;

export const ATTESTATION_PARAMS = {
  maxScore: 100,
  minScore: 0,
  signatureType: 'EIP-712',
  domainName: 'RTFM-Sovereign',
  domainVersion: '1'
} as const;

export const NETWORK_CONFIGS = {
  localhost: {
    chainId: 31337,
    name: 'localhost',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: '',
    confirmations: 1
  },
  sepolia: {
    chainId: 11155111,
    name: 'sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    confirmations: 6
  },
  mainnet: {
    chainId: 1,
    name: 'mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    confirmations: 12
  }
} as const;

export const GAS_ESTIMATES = {
  skillStaking: {
    deployment: 1500000n,
    stake: 50000n,
    recordMilestone: 30000n,
    claimRefund: 45000n,
    withdrawTreasury: 30000n
  },
  skillAttestation: {
    deployment: 1800000n,
    submitAttestation: 80000n,
    verifyAttestation: 5000n,
    getHistory: 20000n,
    updateTEESigner: 25000n
  }
} as const;

export function getNetworkConfig(networkName: string) {
  const config = NETWORK_CONFIGS[networkName as keyof typeof NETWORK_CONFIGS];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }
  return config;
}

export function formatGasUsed(gasUsed: bigint): string {
  const gasUsedStr = gasUsed.toString();
  return `${Number(gasUsedStr).toLocaleString()} gas`;
}

export function formatEther(wei: bigint): string {
  return `${ethers.formatEther(wei)} ETH`;
}

export function calculateRefundAmount(
  stakeAmount: bigint,
  finalScore: number,
  passThreshold: number,
  passRefundPercent: number,
  failRefundPercent: number
): bigint {
  const refundPercent = finalScore >= passThreshold ? passRefundPercent : failRefundPercent;
  return (stakeAmount * BigInt(refundPercent)) / 100n;
}

export function calculateGasCost(
  gasUsed: bigint,
  gasPrice: bigint
): bigint {
  return gasUsed * gasPrice;
}

export async function getSignerBalance(
  signer: any,
  provider: any
): Promise<{ balance: string; formatted: string; sufficient: boolean }> {
  const balance = await provider.getBalance(signer.address);
  const formatted = ethers.formatEther(balance);
  const sufficient = balance >= ethers.parseEther('0.01');

  return {
    balance: balance.toString(),
    formatted,
    sufficient
  };
}

export function generateDomain(
  contractAddress: string,
  chainId: number
): any {
  return {
    name: ATTESTATION_PARAMS.domainName,
    version: ATTESTATION_PARAMS.domainVersion,
    chainId,
    verifyingContract: contractAddress
  };
}

export const ATTESTATION_TYPES = {
  Attestation: [
    { name: 'user', type: 'address' },
    { name: 'skill', type: 'string' },
    { name: 'score', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
} as const;

export function createAttestationValue(
  user: string,
  skill: string,
  score: number,
  nonce: number
): any {
  return {
    user,
    skill,
    score,
    nonce
  };
}

export interface DeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  deployer: string;
  network: string;
  chainId: number;
  timestamp: number;
}

export function createDeploymentResult(
  address: string,
  transactionHash: string,
  blockNumber: number,
  gasUsed: bigint,
  deployer: string,
  network: string,
  chainId: number
): DeploymentResult {
  return {
    address,
    transactionHash,
    blockNumber,
    gasUsed,
    deployer,
    network,
    chainId,
    timestamp: Date.now()
  };
}

export function printDeploymentBanner(chunkName: string): void {
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log(`║${chunkName.padStart(54)}║`);
  console.log('╚═════════════════════════════════════════════════════════╝');
  console.log('');
}

export function printSection(title: string): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(title);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export function printSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

export function printError(message: string): void {
  console.log(`❌ ${message}`);
}

export function printWarning(message: string): void {
  console.log(`⚠️  ${message}`);
}

export function printInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

export async function verifyContractOnChain(
  address: string,
  provider: any
): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    return code !== '0x' && code.length > 2;
  } catch {
    return false;
  }
}

export async function waitForConfirmations(
  transactionHash: string,
  confirmations: number,
  provider: any
): Promise<any> {
  const receipt = await provider.waitForTransactionReceipt(transactionHash, {
    confirmations
  });
  return receipt;
}

export function generateExplorerLinks(
  address: string,
  transactionHash: string,
  network: string
): { contractLink: string; transactionLink: string } {
  const config = getNetworkConfig(network);

  if (!config.blockExplorer) {
    return {
      contractLink: '',
      transactionLink: ''
    };
  }

  return {
    contractLink: `${config.blockExplorer}/address/${address}`,
    transactionLink: `${config.blockExplorer}/tx/${transactionHash}`
  };
}
