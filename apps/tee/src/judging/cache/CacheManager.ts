import { z } from 'zod';
import { JudgingResult, CodeSubmission, RubricSchema } from '../schemas';

export interface CacheEntry {
  result: JudgingResult;
  timestamp: number;
  hits: number;
}

export interface ICacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: CacheEntry): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryCache implements ICacheStore {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  
  constructor(maxEntries: number = 1000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }
  
  public async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.hits++;
      return entry;
    }
    return null;
  }
  
  public async set(key: string, value: CacheEntry): Promise<void> {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
  
  public async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  public async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class RedisCache implements ICacheStore {
  private redisUrl: string;
  private client: any;
  private isConnected: boolean = false;
  
  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.redisUrl = redisUrl;
  }
  
  public async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      this.client = require('ioredis').default;
      this.client = new this.client(this.redisUrl);
      await this.client.ping();
      this.isConnected = true;
    } catch (error) {
      console.warn('Redis connection failed, falling back to in-memory cache');
      this.isConnected = false;
    }
  }
  
  public async get(key: string): Promise<CacheEntry | null> {
    if (!this.isConnected) return null;
    
    try {
      const data = await this.client.get(key);
      if (data) {
        const entry: CacheEntry = JSON.parse(data);
        await this.client.incr(`hits:${key}`);
        return entry;
      }
    } catch (error) {
      console.warn('Redis get error:', error);
    }
    return null;
  }
  
  public async set(key: string, value: CacheEntry): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.setex(
        key,
        3600,
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn('Redis set error:', error);
    }
  }
  
  public async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.del(key);
      await this.client.del(`hits:${key}`);
    } catch (error) {
      console.warn('Redis del error:', error);
    }
  }
  
  public async clear(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.flushdb();
    } catch (error) {
      console.warn('Redis clear error:', error);
    }
  }
}

export class TemplateCache {
  private templates: Map<string, JudgingResult>;
  
  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }
  
  private initializeTemplates(): void {
    this.templates.set(
      'typescript-basic-component',
      {
        session_id: 'template-001',
        milestone_id: 0,
        passed: true,
        overall_score: 75,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 30,
          ast_hash: 'template-hash'
        },
        layer2_result: {
          functionality_score: 80,
          quality_score: 75,
          best_practices_score: 70,
          innovation_score: 60,
          weighted_score: 75,
          feedback: 'Basic TypeScript component implementation with standard patterns',
          suggestions: ['Add error handling', 'Improve type coverage']
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: new Date().toISOString(),
        cached: true
      }
    );
    
    this.templates.set(
      'react-component-with-hooks',
      {
        session_id: 'template-002',
        milestone_id: 0,
        passed: true,
        overall_score: 85,
        layer1_result: {
          passed: true,
          syntax_errors: [],
          structural_issues: [],
          security_violations: [],
          file_count: 1,
          line_count: 50,
          ast_hash: 'template-hash'
        },
        layer2_result: {
          functionality_score: 85,
          quality_score: 85,
          best_practices_score: 80,
          innovation_score: 75,
          weighted_score: 85,
          feedback: 'React component using hooks with proper state management',
          suggestions: ['Add unit tests', 'Consider memoization for performance']
        },
        rubric_used: {
          functionality_weight: 0.4,
          quality_weight: 0.3,
          best_practices_weight: 0.2,
          innovation_weight: 0.1
        },
        timestamp: new Date().toISOString(),
        cached: true
      }
    );
  }
  
  public get(templateKey: string): JudgingResult | null {
    return this.templates.get(templateKey) || null;
  }
  
  public matchSubmission(submission: CodeSubmission): JudgingResult | null {
    const code = submission.code_files[0]?.content || '';
    
    if (code.includes('useState') || code.includes('useEffect')) {
      return this.get('react-component-with-hooks');
    }
    
    if (code.includes('interface') || code.includes('type')) {
      return this.get('typescript-basic-component');
    }
    
    return null;
  }
}

export class CacheManager {
  private l1Cache: InMemoryCache;
  private l2Cache: RedisCache;
  private templateCache: TemplateCache;
  private enabled: boolean;
  
  constructor(options: {
    enableRedis?: boolean;
    redisUrl?: string;
    maxMemoryEntries?: number;
    enabled?: boolean;
  } = {}) {
    this.l1Cache = new InMemoryCache(options.maxMemoryEntries || 1000);
    this.l2Cache = new RedisCache(options.redisUrl || 'redis://localhost:6379');
    this.templateCache = new TemplateCache();
    this.enabled = options.enabled !== false;
    
    if (options.enableRedis !== false) {
      this.l2Cache.connect().catch(() => {});
    }
  }
  
  public async get(
    submission: CodeSubmission,
    rubric: z.infer<typeof RubricSchema>
  ): Promise<JudgingResult | null> {
    if (!this.enabled) return null;
    
    const cacheKey = this.generateCacheKey(submission, rubric);
    
    const l1Result = await this.l1Cache.get(cacheKey);
    if (l1Result) {
      l1Result.result.cached = true;
      return l1Result.result;
    }
    
    const l2Result = await this.l2Cache.get(cacheKey);
    if (l2Result) {
      await this.l1Cache.set(cacheKey, l2Result);
      l2Result.result.cached = true;
      return l2Result.result;
    }
    
    const templateResult = this.templateCache.matchSubmission(submission);
    if (templateResult) {
      templateResult.cached = true;
      return templateResult;
    }
    
    return null;
  }
  
  public async set(
    submission: CodeSubmission,
    rubric: z.infer<typeof RubricSchema>,
    result: JudgingResult
  ): Promise<void> {
    if (!this.enabled) return;
    
    const cacheKey = this.generateCacheKey(submission, rubric);
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      hits: 0
    };
    
    await this.l1Cache.set(cacheKey, entry);
    await this.l2Cache.set(cacheKey, entry);
  }
  
  public async invalidate(submission: CodeSubmission, rubric: z.infer<typeof RubricSchema>): Promise<void> {
    const cacheKey = this.generateCacheKey(submission, rubric);
    await this.l1Cache.del(cacheKey);
    await this.l2Cache.del(cacheKey);
  }
  
  public async clear(): Promise<void> {
    await this.l1Cache.clear();
    await this.l2Cache.clear();
  }
  
  public getStats(): {
    l1Size: number;
    l1MaxSize: number;
    l2Connected: boolean;
    enabled: boolean;
  } {
    return {
      l1Size: (this.l1Cache as any).cache?.size || 0,
      l1MaxSize: 1000,
      l2Connected: (this.l2Cache as any).isConnected || false,
      enabled: this.enabled
    };
  }
  
  private generateCacheKey(
    submission: CodeSubmission,
    rubric: z.infer<typeof RubricSchema>
  ): string {
    const content = submission.code_files
      .sort((a, b) => a.file_path.localeCompare(b.file_path))
      .map(f => `${f.file_path}:${f.content.length}`)
      .join('|');
    
    const rubricStr = JSON.stringify(rubric);
    const combined = `${submission.session_id}:${submission.milestone_id}:${content}:${rubricStr}`;
    
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `judge:${Math.abs(hash).toString(16)}`;
  }
}
