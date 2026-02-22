import { logger } from '../utils/logger';

export interface ExpectedAnswer {
  keywords: string[];
  weight: number;
}

export class GradingService {
  private readonly PASSING_THRESHOLD = 70;

  constructor() {
    logger.info({ service: 'GradingService' }, 'GradingService initialized');
  }

  /**
   * Deterministic grading algorithm based on keyword matching.
   * Same inputs (userAnswers, expectedAnswers) MUST produce same score.
   */
  public gradeSubmission(
    userAnswers: string[],
    expectedAnswers: ExpectedAnswer[]
  ): number {
    if (userAnswers.length !== expectedAnswers.length) {
      logger.warn(
        { userLength: userAnswers.length, expectedLength: expectedAnswers.length },
        'Mismatch in number of answers vs expected answers'
      );
      // Fail gracefully or penalize, but for now we clamp to the shorter length to avoid crash
    }

    let totalScore = 0;
    let totalWeight = 0;
    const length = Math.min(userAnswers.length, expectedAnswers.length);

    for (let i = 0; i < length; i++) {
      const userAns = (userAnswers[i] || '').toLowerCase().trim();
      const expected = expectedAnswers[i];
      
      // Keyword matching
      // We count how many unique keywords from the expected list appear in the user's answer
      const uniqueKeywords = new Set(expected.keywords.map(k => k.toLowerCase()));
      let matchCount = 0;

      for (const keyword of uniqueKeywords) {
        if (userAns.includes(keyword)) {
          matchCount++;
        }
      }
      
      // Calculate ratio of matched keywords
      // If expected.keywords is empty, we give full score for that question (avoid division by zero)
      const ratio = uniqueKeywords.size > 0 ? matchCount / uniqueKeywords.size : 1;
      
      // Weighted score for this question
      const questionScore = ratio * expected.weight;
      
      totalScore += questionScore;
      totalWeight += expected.weight;
    }

    // Normalize to 100
    // If totalWeight is 0, return 0 to avoid division by zero
    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    
    // Clamp 0-100 just in case
    return Math.min(100, Math.max(0, finalScore));
  }

  public isPassing(score: number): boolean {
    return score >= this.PASSING_THRESHOLD;
  }
}
