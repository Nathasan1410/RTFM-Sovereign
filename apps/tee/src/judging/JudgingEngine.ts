import { z } from 'zod';
import { 
  CodeSubmission, 
  JudgingRequest, 
  JudgingResult, 
  RubricSchema 
} from './schemas';

export { JudgingRequest } from './schemas';
import { Layer1Analyzer } from './layers/Layer1Analyzer';
import { Layer2Analyzer, MockEigenAIClient } from './layers/Layer2Analyzer';
import { CacheManager } from './cache/CacheManager';
import { RubricSystem } from './rubric/RubricSystem';

export interface JudgingEngineOptions {
  enableCache?: boolean;
  enableRedis?: boolean;
  redisUrl?: string;
  maxMemoryCacheEntries?: number;
  defaultRubric?: z.infer<typeof RubricSchema>;
  useMockEigenAI?: boolean;
}

export class JudgingEngine {
  private layer1Analyzer: Layer1Analyzer;
  private layer2Analyzer: Layer2Analyzer;
  private cacheManager: CacheManager;
  private defaultRubric: z.infer<typeof RubricSchema>;
  
  constructor(options: JudgingEngineOptions = {}) {
    this.layer1Analyzer = new Layer1Analyzer();
    
    const eigenaiClient = options.useMockEigenAI !== false 
      ? new MockEigenAIClient()
      : undefined;
    this.layer2Analyzer = new Layer2Analyzer(eigenaiClient);
    
    this.cacheManager = new CacheManager({
      enabled: options.enableCache !== false,
      enableRedis: options.enableRedis !== false,
      redisUrl: options.redisUrl,
      maxMemoryEntries: options.maxMemoryCacheEntries
    });
    
    this.defaultRubric = options.defaultRubric || RubricSystem.DEFAULT_RUBRIC;
  }
  
  public async judge(request: JudgingRequest): Promise<JudgingResult> {
    const { submission, rubric, seed } = request;
    const actualRubric = rubric || this.defaultRubric;
    
    const cachedResult = await this.cacheManager.get(submission, actualRubric);
    if (cachedResult) {
      console.log(`[CACHE HIT] Using cached result for session ${submission.session_id}`);
      return cachedResult;
    }
    
    console.log(`[JUDGING] Starting evaluation for session ${submission.session_id}, milestone ${submission.milestone_id}`);
    
    const layer1Result = await this.layer1Analyzer.analyze(submission);
    console.log(`[LAYER 1] Structural analysis complete: ${layer1Result.passed ? 'PASSED' : 'FAILED'}`);
    
    const layer2Result = await this.layer2Analyzer.analyze(
      submission,
      actualRubric,
      layer1Result,
      seed || Date.now()
    );
    console.log(`[LAYER 2] Semantic review complete: ${layer2Result.weighted_score}/100`);
    
    const threshold = RubricSystem.calculatePassingThreshold(actualRubric);
    const passed = layer1Result.passed && layer2Result.weighted_score >= threshold;
    
    const result: JudgingResult = {
      session_id: submission.session_id,
      milestone_id: submission.milestone_id,
      passed,
      overall_score: layer2Result.weighted_score,
      layer1_result: layer1Result,
      layer2_result: layer2Result,
      rubric_used: actualRubric,
      timestamp: new Date().toISOString(),
      cached: false
    };
    
    await this.cacheManager.set(submission, actualRubric, result);
    
    console.log(`[JUDGING] Complete: ${passed ? 'PASSED' : 'FAILED'} (${result.overall_score}/100)`);
    
    return result;
  }
  
  public async judgeBatch(requests: JudgingRequest[]): Promise<JudgingResult[]> {
    const results: JudgingResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.judge(request);
        results.push(result);
      } catch (error) {
        console.error(`[ERROR] Failed to judge request for session ${request.submission.session_id}:`, error);
      }
    }
    
    return results;
  }
  
  public async invalidateCache(submission: CodeSubmission, rubric?: z.infer<typeof RubricSchema>): Promise<void> {
    const actualRubric = rubric || this.defaultRubric;
    await this.cacheManager.invalidate(submission, actualRubric);
  }
  
  public async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }
  
  public getCacheStats() {
    return this.cacheManager.getStats();
  }
  
  public setDefaultRubric(rubric: z.infer<typeof RubricSchema>): void {
    if (!RubricSystem.validateRubric(rubric)) {
      throw new Error('Invalid rubric: weights must sum to 1.0');
    }
    this.defaultRubric = rubric;
  }
  
  public generateReport(result: JudgingResult): string {
    return RubricSystem.generateRubricReport(result, result.rubric_used);
  }
}
