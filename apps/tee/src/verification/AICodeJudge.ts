import { LLMService } from '../services/llm/LLMService';
import { logger } from '../utils/logger';

export interface CodeSubmission {
  userAddress: string;
  sessionId: string;
  milestoneId: number;
  code: string;
  criteria: string[];
  rubric: {
    completeness: number;
    code_quality: number;
    best_practices: number;
    documentation: number;
  };
}

export interface Judgement {
  score: number;
  feedback: string;
  passed: boolean;
  detailedScores: {
    completeness: number;
    code_quality: number;
    best_practices: number;
    documentation: number;
  };
  improvements: string[];
}

export class AICodeJudge {
  constructor(private llmService: LLMService) {}

  async judgeCode(submission: CodeSubmission): Promise<Judgement> {
    logger.info({ 
      sessionId: submission.sessionId,
      milestoneId: submission.milestoneId,
      codeLength: submission.code.length
    }, 'AICodeJudge: Starting evaluation');

    const prompt = this.buildJudgmentPrompt(submission);

    try {
      const response = await this.llmService.generateChallenge(
        submission.userAddress,
        `Judge: ${submission.milestoneId}`,
        Date.now()
      );

      const judgement = this.parseJudgement(response);

      logger.info({ 
        sessionId: submission.sessionId,
        milestoneId: submission.milestoneId,
        score: judgement.score,
        passed: judgement.passed
      }, 'AICodeJudge: Evaluation complete');

      return judgement;
    } catch (error) {
      logger.error({ 
        sessionId: submission.sessionId,
        milestoneId: submission.milestoneId,
        error: (error as Error).message
      }, 'AICodeJudge: Evaluation failed');
      throw error;
    }
  }

  private buildJudgmentPrompt(submission: CodeSubmission): string {
    const rubricText = `
COMPLETENESS (${submission.rubric.completeness}%): 
- All required features implemented
- All success criteria met

CODE QUALITY (${submission.rubric.code_quality}%):
- Clean, readable code
- Proper error handling
- No hardcoded values

BEST PRACTICES (${submission.rubric.best_practices}%):
- Follows framework conventions
- Proper naming conventions
- Modular, reusable code

DOCUMENTATION (${submission.rubric.documentation}%):
- Clear comments
- Explains complex logic
- Documents edge cases
`;

    return `You are a senior code reviewer. Evaluate the following submission against these criteria:

${rubricText}

SUCCESS CRITERIA:
${submission.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

SUBMITTED CODE:
\`\`\`
${submission.code}
\`\`\`

OUTPUT JSON ONLY:
{
  "score": 0-100,
  "detailedScores": {
    "completeness": 0-100,
    "code_quality": 0-100,
    "best_practices": 0-100,
    "documentation": 0-100
  },
  "feedback": "Detailed feedback explaining strengths and weaknesses",
  "improvements": [
    "Specific improvement 1",
    "Specific improvement 2",
    "Specific improvement 3"
  ],
  "passed": true/false
}`;
  }

  private parseJudgement(response: any): Judgement {
    const content = typeof response === 'string' ? response : JSON.stringify(response);
    
    let jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonContent);
    const overallScore = this.calculateWeightedScores(parsed.detailedScores);

    return {
      score: Math.round(overallScore),
      feedback: parsed.feedback || 'No feedback provided',
      passed: parsed.passed || overallScore >= 70,
      detailedScores: {
        completeness: parsed.detailedScores?.completeness || 0,
        code_quality: parsed.detailedScores?.code_quality || 0,
        best_practices: parsed.detailedScores?.best_practices || 0,
        documentation: parsed.detailedScores?.documentation || 0
      },
      improvements: parsed.improvements || []
    };
  }

  private calculateWeightedScores(detailedScores: any, _submission?: CodeSubmission): number {
    const weights = {
      completeness: 0.4,
      code_quality: 0.3,
      best_practices: 0.2,
      documentation: 0.1
    };

    return (
      (detailedScores.completeness || 0) * weights.completeness +
      (detailedScores.code_quality || 0) * weights.code_quality +
      (detailedScores.best_practices || 0) * weights.best_practices +
      (detailedScores.documentation || 0) * weights.documentation
    );
  }

  async batchJudge(submissions: CodeSubmission[]): Promise<Judgement[]> {
    logger.info({ 
      count: submissions.length 
    }, 'AICodeJudge: Starting batch evaluation');

    const results: Judgement[] = [];
    
    for (const submission of submissions) {
      try {
        const judgement = await this.judgeCode(submission);
        results.push(judgement);
      } catch (error) {
        logger.error({ 
          sessionId: submission.sessionId,
          milestoneId: submission.milestoneId,
          error: (error as Error).message
        }, 'AICodeJudge: Batch evaluation failed for submission');
        results.push({
          score: 0,
          feedback: 'Evaluation failed',
          passed: false,
          detailedScores: {
            completeness: 0,
            code_quality: 0,
            best_practices: 0,
            documentation: 0
          },
          improvements: ['Retry submission']
        });
      }
    }

    return results;
  }

  async getScoreHistory(sessionId: string): Promise<number[]> {
    logger.info({ sessionId }, 'AICodeJudge: Fetching score history');
    
    return [];
  }
}
