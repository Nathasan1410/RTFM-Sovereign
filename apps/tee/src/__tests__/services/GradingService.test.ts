import { GradingService, ExpectedAnswer } from '../../services/GradingService';

describe('GradingService', () => {
  let gradingService: GradingService;

  beforeEach(() => {
    gradingService = new GradingService();
  });

  describe('gradeSubmission', () => {
    it('should return perfect score when all keywords match', () => {
      const userAnswers = ['Solidity smart contracts', 'Ethereum blockchain', 'Gas optimization'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 1 },
        { keywords: ['Ethereum', 'blockchain'], weight: 1 },
        { keywords: ['Gas optimization'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should return partial score when some keywords match', () => {
      const userAnswers = ['Solidity smart contracts', 'Web3 development'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts', 'Ethereum'], weight: 1 },
        { keywords: ['Web3', 'blockchain', 'decentralized'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(50);
    });

    it('should return zero score when no keywords match', () => {
      const userAnswers = ['Python programming', 'Django framework'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 1 },
        { keywords: ['Ethereum', 'blockchain'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(0);
    });

    it('should handle empty keywords array (full credit)', () => {
      const userAnswers = ['Any answer'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: [], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should be deterministic - same inputs produce same score', () => {
      const userAnswers = ['Solidity smart contracts'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts', 'Ethereum'], weight: 1 }
      ];

      const score1 = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      const score2 = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      const score3 = gradingService.gradeSubmission(userAnswers, expectedAnswers);

      expect(score1).toBe(score2);
      expect(score2).toBe(score3);
    });

    it('should handle case-insensitive keyword matching', () => {
      const userAnswers = ['SOLIDITY SMART CONTRACTS'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['solidity', 'smart contracts'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should handle whitespace trimming in user answers', () => {
      const userAnswers = ['  Solidity smart contracts  '];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should handle weighted questions correctly', () => {
      const userAnswers = ['Solidity smart contracts', 'Gas optimization'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 2 },
        { keywords: ['Gas optimization'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should handle partial matches with weights', () => {
      const userAnswers = ['Solidity basics', 'Basic optimization'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts', 'Ethereum'], weight: 2 },
        { keywords: ['Gas optimization', 'efficiency'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(22);
    });

    it('should handle mismatched answer lengths gracefully', () => {
      const userAnswers = ['Solidity smart contracts'];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 1 },
        { keywords: ['Ethereum', 'blockchain'], weight: 1 },
        { keywords: ['Gas optimization'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBe(100);
    });

    it('should clamp score to 0-100 range', () => {
      const userAnswers = [''];
      const expectedAnswers: ExpectedAnswer[] = [
        { keywords: ['Solidity', 'smart contracts'], weight: 1 }
      ];

      const score = gradingService.gradeSubmission(userAnswers, expectedAnswers);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('isPassing', () => {
    it('should return true for scores >= 70', () => {
      expect(gradingService.isPassing(70)).toBe(true);
      expect(gradingService.isPassing(75)).toBe(true);
      expect(gradingService.isPassing(100)).toBe(true);
    });

    it('should return false for scores < 70', () => {
      expect(gradingService.isPassing(69)).toBe(false);
      expect(gradingService.isPassing(50)).toBe(false);
      expect(gradingService.isPassing(0)).toBe(false);
    });

    it('should handle edge case at threshold', () => {
      expect(gradingService.isPassing(69.99)).toBe(false);
      expect(gradingService.isPassing(70)).toBe(true);
    });
  });
});
