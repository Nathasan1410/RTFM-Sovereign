/**
 * Demo Mode Utilities
 *
 * Provides mock implementations of core functionality for presentation/demo scenarios.
 * Allows running the application without real ETH, TEE service, or blockchain interactions.
 *
 * Key Features:
 * - Demo mode toggle (environment variable + localStorage)
 * - Mock staking with simulated transactions
 * - Mock judging with realistic scoring
 * - Mock attestations with fake blockchain data
 * - Realistic timing delays for authentic demo experience
 *
 * Usage:
 * - Enable via environment variable: NEXT_PUBLIC_DEMO_MODE=true
 * - Enable via UI: Press Shift+D x3 in browser
 * - Disable via localStorage.removeItem('RTFM_DEMO_MODE')
 *
 * @module apps/web/lib/demoMode
 */

/**
 * Checks if demo mode is currently active.
 * Demo mode is active if either:
 * 1. Environment variable NEXT_PUBLIC_DEMO_MODE is 'true'
 * 2. localStorage contains RTFM_DEMO_MODE='true'
 *
 * @returns True if demo mode is active, false otherwise
 *
 * @example
 * ```typescript
 * if (isDemoMode()) {
 *   const mockResult = await mockStake('Solidity');
 * } else {
 *   const realResult = await realStake('Solidity');
 * }
 * ```
 */
export const isDemoMode = () =>
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  (typeof window !== 'undefined' && localStorage.getItem('RTFM_DEMO_MODE') === 'true');

/**
 * Enables demo mode by setting localStorage flag and reloading page.
 * This triggers all mock implementations throughout the application.
 *
 * @example
 * ```typescript
 * enableDemoMode(); // Page will reload
 * ```
 */
export const enableDemoMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('RTFM_DEMO_MODE', 'true');
    window.location.reload();
  }
};

/**
 * Disables demo mode by removing localStorage flag and reloading page.
 * Restores real blockchain and TEE interactions.
 *
 * @example
 * ```typescript
 * disableDemoMode(); // Page will reload
 * ```
 */
export const disableDemoMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('RTFM_DEMO_MODE');
    window.location.reload();
  }
};

/**
 * Interface for mock staking transaction response
 */
export interface MockStakeResponse {
  hash: string;
  wait: () => Promise<{ blockNumber: number; status: number }>;
}

/**
 * Interface for mock judging response
 */
export interface MockJudgeResponse {
  passed: boolean;
  score: number;
  breakdown: {
    functionality: number;
    quality: number;
    bestPractices: number;
    innovation: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  next_step_unlocked: boolean;
  checkpoint_recorded: boolean;
  tx_hash: string;
}

/**
 * Interface for mock attestation data
 */
export interface MockAttestation {
  exists: boolean;
  score: number;
  timestamp: number;
  ipfsHash: string;
  transactionHash: string;
}

/**
 * Mock staking function that simulates blockchain staking transaction.
 * Returns a realistic transaction hash and confirmation after 1.5s delay.
 *
 * @param skill - The skill/topic being staked for
 * @returns Promise resolving to mock stake response with transaction details
 *
 * @example
 * ```typescript
 * const result = await mockStake('Solidity Smart Contracts');
 * console.log('Transaction hash:', result.hash);
 * const receipt = await result.wait();
 * console.log('Block number:', receipt.blockNumber);
 * ```
 */
export const mockStake = async (skill: string): Promise<MockStakeResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log('[DEMO] Mock stake for:', skill);
  return {
    hash: '0xDemo' + Date.now().toString(16),
    wait: async () => ({ blockNumber: 12345678, status: 1 })
  };
};

/**
 * Mock code judging function that simulates TEE-based code analysis.
 * Returns realistic scores and feedback based on milestone ID.
 *
 * @param code - The code being judged (unused in mock, but included for realism)
 * @param milestoneId - The current milestone number (affects score progression)
 * @returns Promise resolving to mock judge response with scores and feedback
 *
 * @example
 * ```typescript
 * const result = await mockJudge('function hello() { return "world"; }', 2);
 * console.log('Passed:', result.passed);
 * console.log('Score:', result.score);
 * console.log('Feedback:', result.feedback);
 * ```
 *
 * @remarks
 * - Delay: 2 seconds to simulate AI processing
 * - Score progression: Increases with milestone ID
 * - Pass threshold: 70 points
 * - Checkpoints: Recorded at milestones 3 and 5
 */
export const mockJudge = async (code: string, milestoneId: number): Promise<MockJudgeResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const scores = {
    functionality: 85 + milestoneId * 2,
    quality: 80 + milestoneId * 2,
    bestPractices: 75 + milestoneId * 3,
    innovation: 70 + milestoneId * 4
  };

  const overall = Math.floor((scores.functionality + scores.quality + scores.bestPractices + scores.innovation) / 4);

  return {
    passed: overall >= 70,
    score: overall,
    breakdown: scores,
    feedback: {
      strengths: [
        'Clean component structure demonstrated',
        'Good use of React hooks pattern',
        milestoneId > 2 ? 'Proper prop handling' : 'Solid foundation'
      ],
      improvements: [
        'Consider adding more TypeScript interfaces',
        milestoneId > 3 ? 'Add error boundaries' : 'Handle edge cases better',
        'Optimize re-renders with memoization'
      ]
    },
    next_step_unlocked: overall >= 70,
    checkpoint_recorded: milestoneId === 3 || milestoneId === 5,
    tx_hash: '0xDemoCheckpoint' + Date.now()
  };
};

/**
 * Mock attestation retrieval function that simulates blockchain query.
 * Returns fake attestation data with random IPFS hash.
 *
 * @param address - The user wallet address (unused in mock)
 * @param skill - The skill/topic being verified (unused in mock)
 * @returns Mock attestation object with fake blockchain data
 *
 * @example
 * ```typescript
 * const attestation = mockAttestation('0x123...', 'Solidity');
 * console.log('Score:', attestation.score);
 * console.log('Timestamp:', attestation.timestamp);
 * console.log('IPFS Hash:', attestation.ipfsHash);
 * ```
 */
export const mockAttestation = (address: string, skill: string): MockAttestation => ({
  exists: true,
  score: 88,
  timestamp: Math.floor(Date.now() / 1000) - 3600,
  ipfsHash: 'QmDemo' + Math.random().toString(36).substring(7),
  transactionHash: '0xDemoAttest' + Date.now()
});
