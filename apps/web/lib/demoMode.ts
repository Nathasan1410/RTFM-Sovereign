export const isDemoMode = () =>
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  (typeof window !== 'undefined' && localStorage.getItem('RTFM_DEMO_MODE') === 'true');

export const enableDemoMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('RTFM_DEMO_MODE', 'true');
    window.location.reload();
  }
};

export const disableDemoMode = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('RTFM_DEMO_MODE');
    window.location.reload();
  }
};

export interface MockStakeResponse {
  hash: string;
  wait: () => Promise<{ blockNumber: number; status: number }>;
}

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

export interface MockAttestation {
  exists: boolean;
  score: number;
  timestamp: number;
  ipfsHash: string;
  transactionHash: string;
}

export const mockStake = async (skill: string): Promise<MockStakeResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log('[DEMO] Mock stake for:', skill);
  return {
    hash: '0xDemo' + Date.now().toString(16),
    wait: async () => ({ blockNumber: 12345678, status: 1 })
  };
};

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

export const mockAttestation = (address: string, skill: string): MockAttestation => ({
  exists: true,
  score: 88,
  timestamp: Math.floor(Date.now() / 1000) - 3600,
  ipfsHash: 'QmDemo' + Math.random().toString(36).substring(7),
  transactionHash: '0xDemoAttest' + Date.now()
});
