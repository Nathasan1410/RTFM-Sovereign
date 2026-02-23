/**
 * Unit Tests for demoMode
 * Tests mock functions for staking, judging, and attestations
 */

import {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  mockStake,
  mockJudge,
  mockAttestation
} from '../../lib/demoMode';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock window object
global.window = global.window || {};
global.window.localStorage = mockLocalStorage as any;
global.process = global.process || {};
global.process.env = global.process.env || {};

describe('demoMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
  });

  describe('isDemoMode', () => {
    it('should return true when NEXT_PUBLIC_DEMO_MODE is true', () => {
      global.process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

      const result = isDemoMode();

      expect(result).toBe(true);
    });

    it('should return true when localStorage has RTFM_DEMO_MODE=true', () => {
      global.process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      mockLocalStorage.getItem.mockReturnValue('true');

      const result = isDemoMode();

      expect(result).toBe(true);
    });

    it('should return false when both conditions are false', () => {
      global.process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = isDemoMode();

      expect(result).toBe(false);
    });

    it('should check localStorage when window is defined', () => {
      global.process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
      mockLocalStorage.getItem.mockReturnValue('true');

      const result = isDemoMode();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('RTFM_DEMO_MODE');
    });
  });

  describe('enableDemoMode', () => {
    it('should set RTFM_DEMO_MODE to true in localStorage', () => {
      enableDemoMode();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('RTFM_DEMO_MODE', 'true');
    });

    it('should reload the page', () => {
      const reloadMock = jest.fn();
      global.window.location = { reload: reloadMock } as any;

      enableDemoMode();

      expect(reloadMock).toHaveBeenCalled();
    });

    it('should not throw when localStorage is not available', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => {
        enableDemoMode();
      }).not.toThrow();
    });
  });

  describe('disableDemoMode', () => {
    it('should remove RTFM_DEMO_MODE from localStorage', () => {
      disableDemoMode();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('RTFM_DEMO_MODE');
    });

    it('should reload the page', () => {
      const reloadMock = jest.fn();
      global.window.location = { reload: reloadMock } as any;

      disableDemoMode();

      expect(reloadMock).toHaveBeenCalled();
    });
  });
});

describe('mockStake', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return mock stake response with transaction hash', async () => {
    const skill = 'Solidity Smart Contracts';

    const result = await mockStake(skill);

    expect(result.hash).toBeDefined();
    expect(result.hash).toMatch(/^0xDemo/);
    expect(result.wait).toBeInstanceOf(Function);
  });

  it('should resolve after realistic delay', async () => {
    const startTime = Date.now();
    await mockStake('React Hooks');
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(1500);
  });

  it('should return mock receipt from wait function', async () => {
    const result = await mockStake('TypeScript');

    const receipt = await result.wait();

    expect(receipt).toBeDefined();
    expect(receipt.blockNumber).toBe(12345678);
    expect(receipt.status).toBe(1);
  });

  it('should generate unique transaction hashes', async () => {
    const result1 = await mockStake('Skill1');
    const result2 = await mockStake('Skill2');

    expect(result1.hash).not.toBe(result2.hash);
  });
});

describe('mockJudge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return mock judge response with score', async () => {
    const code = 'function test() {}';
    const milestoneId = 2;

    const result = await mockJudge(code, milestoneId);

    expect(result).toBeDefined();
    expect(result.passed).toBe(true);
    expect(result.score).toBeDefined();
    expect(result.breakdown).toBeDefined();
    expect(result.feedback).toBeDefined();
  });

  it('should increase score with milestone ID', async () => {
    const result1 = await mockJudge('code', 1);
    const result2 = await mockJudge('code', 3);
    const result3 = await mockJudge('code', 5);

    expect(result2.score).toBeGreaterThan(result1.score);
    expect(result3.score).toBeGreaterThan(result2.score);
  });

  it('should return false when score is below 70', async () => {
    const code = 'function test() {}';
    const milestoneId = 1;

    const result = await mockJudge(code, milestoneId);

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
  });

  it('should return true when score is 70 or above', async () => {
    const code = 'function test() {}';
    const milestoneId = 3;

    const result = await mockJudge(code, milestoneId);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('should include strengths in feedback', async () => {
    const result = await mockJudge('code', 2);

    expect(result.feedback.strengths).toBeDefined();
    expect(Array.isArray(result.feedback.strengths)).toBe(true);
    expect(result.feedback.strengths.length).toBeGreaterThan(0);
  });

  it('should include improvements in feedback', async () => {
    const result = await mockJudge('code', 2);

    expect(result.feedback.improvements).toBeDefined();
    expect(Array.isArray(result.feedback.improvements)).toBe(true);
    expect(result.feedback.improvements.length).toBeGreaterThan(0);
  });

  it('should record checkpoints at milestones 3 and 5', async () => {
    const result1 = await mockJudge('code', 3);
    const result2 = await mockJudge('code', 5);
    const result3 = await mockJudge('code', 4);

    expect(result1.checkpoint_recorded).toBe(true);
    expect(result2.checkpoint_recorded).toBe(true);
    expect(result3.checkpoint_recorded).toBe(false);
  });
});

describe('mockAttestation', () => {
  it('should return mock attestation data', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const skill = 'Solidity';

    const result = mockAttestation(address, skill);

    expect(result).toBeDefined();
    expect(result.exists).toBe(true);
    expect(result.score).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.ipfsHash).toBeDefined();
    expect(result.transactionHash).toBeDefined();
  });

  it('should return consistent timestamp', () => {
    const address1 = '0x1234...';
    const address2 = '0x5678...';

    const result1 = mockAttestation(address1, 'Skill1');
    const result2 = mockAttestation(address2, 'Skill2');

    expect(result1.timestamp).toBe(result2.timestamp);
  });

  it('should return random IPFS hash', () => {
    const address = '0x1234...';
    const skill = 'Skill1';
    const skill2 = 'Skill2';

    const result1 = mockAttestation(address, skill);
    const result2 = mockAttestation(address, skill2);

    expect(result1.ipfsHash).not.toBe(result2.ipfsHash);
  });
});
