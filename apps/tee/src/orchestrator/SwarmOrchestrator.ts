import pMap from 'p-map';
import { ArchitectAgent, Challenge } from '../agents/ArchitectAgent';
import { SpecialistAgent, Answer, EvaluationResult } from '../agents/SpecialistAgent';
import { agentLogger } from '../utils/logger';

export interface OrchestratorConfig {
  maxConcurrency: number;
  timeoutMs: number;
  retryAttempts: number;
}

export interface OrchestrationResult {
  challenges: Challenge[];
  evaluations: EvaluationResult[];
  successful: number;
  failed: number;
  durationMs: number;
}

export class SwarmOrchestrator {
  private readonly DEFAULT_CONFIG: OrchestratorConfig = {
    maxConcurrency: 3,
    timeoutMs: 60000,
    retryAttempts: 2,
  };

  private config: OrchestratorConfig;

  constructor(
    private readonly architectAgent: ArchitectAgent,
    private readonly specialistAgent: SpecialistAgent,
    config?: Partial<OrchestratorConfig>
  ) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    agentLogger.info({ config: this.config }, 'SwarmOrchestrator initialized');
  }

  public async orchestrateChallengeGeneration(
    userAddress: string,
    topics: string[],
    attemptNumber: number = 1
  ): Promise<Challenge[]> {
    const startTime = Date.now();

    agentLogger.info(
      { userAddress, topics, count: topics.length },
      'Orchestrating challenge generation'
    );

    try {
      const challenges = await pMap(
        topics,
        async (topic) => {
          return await this.generateChallengeWithRetry(
            userAddress,
            topic,
            attemptNumber
          );
        },
        {
          concurrency: this.config.maxConcurrency,
        }
      ) as Challenge[];

      const duration = Date.now() - startTime;

      agentLogger.info(
        { count: challenges.length, durationMs: duration },
        'Challenge generation orchestration completed'
      );

      return challenges;
    } catch (error) {
      agentLogger.error({ error }, 'Challenge generation orchestration failed');
      throw error;
    }
  }

  private async generateChallengeWithRetry(
    userAddress: string,
    topic: string,
    attemptNumber: number,
    attempt: number = 0
  ): Promise<Challenge> {
    try {
      return await this.architectAgent.generateChallenge(
        userAddress,
        topic,
        attemptNumber
      );
    } catch (error) {
      agentLogger.warn(
        { topic, attempt, error: (error as Error).message },
        'Challenge generation attempt failed'
      );

      if (attempt < this.config.retryAttempts) {
        await this.sleep(1000 * (attempt + 1));
        return this.generateChallengeWithRetry(
          userAddress,
          topic,
          attemptNumber,
          attempt + 1
        );
      }

      throw error;
    }
  }

  public async orchestrateAnswerEvaluation(
    answers: Answer[]
  ): Promise<EvaluationResult[]> {
    const startTime = Date.now();

    agentLogger.info(
      { count: answers.length },
      'Orchestrating answer evaluation'
    );

    try {
      const evaluations = await pMap(
        answers,
        async (answer) => {
          return await this.evaluateAnswerWithRetry(answer, 0);
        },
        {
          concurrency: this.config.maxConcurrency,
        }
      ) as EvaluationResult[];

      const duration = Date.now() - startTime;

      agentLogger.info(
        { count: evaluations.length, durationMs: duration },
        'Answer evaluation orchestration completed'
      );

      return evaluations;
    } catch (error) {
      agentLogger.error({ error }, 'Answer evaluation orchestration failed');
      throw error;
    }
  }

  private async evaluateAnswerWithRetry(
    answer: Answer,
    attempt: number = 0
  ): Promise<EvaluationResult> {
    try {
      return await this.specialistAgent.evaluateAnswer(answer);
    } catch (error) {
      agentLogger.warn(
        { challengeId: answer.challengeId, attempt, error: (error as Error).message },
        'Answer evaluation attempt failed'
      );

      if (attempt < this.config.retryAttempts) {
        await this.sleep(1000 * (attempt + 1));
        return this.evaluateAnswerWithRetry(answer, attempt + 1);
      }

      throw error;
    }
  }

  public async orchestrateFullWorkflow(
    userAddress: string,
    topics: string[],
    answers: Answer[],
    attemptNumber: number = 1
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    agentLogger.info(
      { userAddress, topics, answerCount: answers.length },
      'Orchestrating full workflow'
    );

    try {
      const challenges = await this.orchestrateChallengeGeneration(
        userAddress,
        topics,
        attemptNumber
      );

      const evaluations = await this.orchestrateAnswerEvaluation(answers);

      const successful = evaluations.filter((e) => e.passed).length;
      const failed = evaluations.filter((e) => !e.passed).length;

      const duration = Date.now() - startTime;

      const result: OrchestrationResult = {
        challenges,
        evaluations,
        successful,
        failed,
        durationMs: duration,
      };

      agentLogger.info(
        { successful, failed, durationMs: duration },
        'Full workflow orchestration completed'
      );

      return result;
    } catch (error) {
      agentLogger.error({ error }, 'Full workflow orchestration failed');
      throw error;
    }
  }

  public async orchestrateParallelEvaluations(
    answers: Answer[],
    maxConcurrency?: number
  ): Promise<EvaluationResult[]> {
    const startTime = Date.now();

    agentLogger.info(
      { count: answers.length, maxConcurrency: maxConcurrency || this.config.maxConcurrency },
      'Orchestrating parallel evaluations'
    );

    try {
      const evaluations = await pMap(
        answers,
        async (answer) => {
          return await this.specialistAgent.evaluateAnswer(answer);
        },
        {
          concurrency: maxConcurrency || this.config.maxConcurrency,
        }
      ) as EvaluationResult[];

      const duration = Date.now() - startTime;

      agentLogger.info(
        { count: evaluations.length, durationMs: duration },
        'Parallel evaluations orchestration completed'
      );

      return evaluations;
    } catch (error) {
      agentLogger.error({ error }, 'Parallel evaluations orchestration failed');
      throw error;
    }
  }

  public getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    agentLogger.info({ config: this.config }, 'SwarmOrchestrator config updated');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
