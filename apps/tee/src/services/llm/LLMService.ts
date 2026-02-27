import { LLMProvider, Challenge, RoadmapResponse } from './types';
import { EigenAIProvider } from './EigenAIProvider';
import { GroqProvider } from './GroqProvider';
import { SerperService, SerperSearchResult } from '../search/SerperService';
import { logger } from '../../utils/logger';

export class LLMService {
  private providers: LLMProvider[] = [];
  private serperService: SerperService | null = null;
  private circuitOpen: boolean[] = [];
  private failureCounts: number[] = [];
  private lastFailureTimes: number[] = [];
  private readonly FAILURE_THRESHOLD = 5;
  private readonly COOLDOWN_PERIOD = 60000;

  constructor(
    cerebrasKey: string,
    groqKey: string,
    braveKey: string,
    hyperbolicKey: string,
    eigenKey: string,
    eigenPrivateKey: string = '',
    serperApiKey: string = ''
  ) {
    // EigenAI FIRST (primary provider with grant)
    if (eigenPrivateKey) {
        this.providers.push(new EigenAIProvider(eigenPrivateKey));
    }

    // Fallback providers (Brave/Hyperbolic removed - using Serper for web search)
    if (groqKey) this.providers.push(new GroqProvider(groqKey));

    // Web search service (replaces Brave search functionality)
    if (serperApiKey) {
      this.serperService = new SerperService(serperApiKey);
      logger.info('Serper web search service initialized');
    }

    this.providers.forEach(() => {
      this.circuitOpen.push(false);
      this.failureCounts.push(0);
      this.lastFailureTimes.push(0);
    });

    if (this.providers.length === 0) {
      logger.warn('No LLM providers configured! Service will fail.');
    }
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      if (this.circuitOpen[i]) {
        if (Date.now() - this.lastFailureTimes[i] > this.COOLDOWN_PERIOD) {
          logger.info({ provider: provider.name }, 'Circuit Breaker HALF_OPEN: Retrying provider...');
        } else {
          logger.warn({ provider: provider.name }, 'Circuit Breaker OPEN: Skipping provider...');
          continue;
        }
      }

      try {
        const result = await provider.generateChallenge(userAddress, topic, seed);
        
        if (this.circuitOpen[i]) {
          logger.info({ provider: provider.name }, 'Circuit Breaker CLOSED: Provider recovered');
          this.circuitOpen[i] = false;
          this.failureCounts[i] = 0;
        }
        
        logger.info({ provider: provider.name }, '✅ Provider SUCCESS - using this response');
        return result;

      } catch (error) {
        this.failureCounts[i]++;
        this.lastFailureTimes[i] = Date.now();
        lastError = error as Error;
        
        logger.error({ 
          error: (error as Error).message, 
          provider: provider.name,
          failures: this.failureCounts[i] 
        }, 'Provider failed');

        if (this.failureCounts[i] >= this.FAILURE_THRESHOLD) {
          this.circuitOpen[i] = true;
          logger.warn({ provider: provider.name }, 'Circuit Breaker TRIPPED: Switching to next provider');
        }
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  async generateRoadmap(userAddress: string, topic: string, seed: number): Promise<RoadmapResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      if (this.circuitOpen[i]) {
        if (Date.now() - this.lastFailureTimes[i] > this.COOLDOWN_PERIOD) {
          logger.info({ provider: provider.name }, 'Circuit Breaker HALF_OPEN: Retrying provider...');
        } else {
          logger.warn({ provider: provider.name }, 'Circuit Breaker OPEN: Skipping provider...');
          continue;
        }
      }

      try {
        const result = await provider.generateRoadmap(userAddress, topic, seed);
        
        if (this.circuitOpen[i]) {
          logger.info({ provider: provider.name }, 'Circuit Breaker CLOSED: Provider recovered');
          this.circuitOpen[i] = false;
          this.failureCounts[i] = 0;
        }
        
        logger.info({ provider: provider.name }, '✅ Provider SUCCESS - using this response');
        return result;

      } catch (error) {
        this.failureCounts[i]++;
        this.lastFailureTimes[i] = Date.now();
        lastError = error as Error;
        
        logger.error({ 
          error: (error as Error).message, 
          provider: provider.name,
          failures: this.failureCounts[i] 
        }, 'Provider failed');

        if (this.failureCounts[i] >= this.FAILURE_THRESHOLD) {
          this.circuitOpen[i] = true;
          logger.warn({ provider: provider.name }, 'Circuit Breaker TRIPPED: Switching to next provider');
        }
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate JSON response from LLM
   * Generic method for structured JSON output
   * 
   * @param prompt - The prompt to send to the LLM
   * @returns Parsed JSON response
   */
  async generateJson(prompt: string): Promise<any> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];

      if (this.circuitOpen[i]) {
        if (Date.now() - this.lastFailureTimes[i] > this.COOLDOWN_PERIOD) {
          logger.info({ provider: provider.name }, 'Circuit Breaker HALF_OPEN: Retrying provider...');
        } else {
          logger.warn({ provider: provider.name }, 'Circuit Breaker OPEN: Skipping provider...');
          continue;
        }
      }

      try {
        const result = await provider.generateJson(prompt);

        if (this.circuitOpen[i]) {
          logger.info({ provider: provider.name }, 'Circuit Breaker CLOSED: Provider recovered');
          this.circuitOpen[i] = false;
          this.failureCounts[i] = 0;
        }

        logger.info({ provider: provider.name }, '✅ Provider SUCCESS - using this response');
        return result;

      } catch (error) {
        this.failureCounts[i]++;
        this.lastFailureTimes[i] = Date.now();
        lastError = error as Error;

        logger.error({
          error: (error as Error).message,
          provider: provider.name,
          failures: this.failureCounts[i]
        }, 'Provider failed');

        if (this.failureCounts[i] >= this.FAILURE_THRESHOLD) {
          this.circuitOpen[i] = true;
          logger.warn({ provider: provider.name }, 'Circuit Breaker TRIPPED: Switching to next provider');
        }
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Web Search: Search for documentation and references
   * Used by AI agents to look up latest docs, APIs, and best practices
   * 
   * @param topic - Topic to search documentation for
   * @param site - Optional site filter (e.g., 'react.dev', 'mdn')
   * @returns Formatted search results for LLM context
   */
  async searchDocumentation(topic: string, site?: string): Promise<string> {
    if (!this.serperService) {
      logger.warn('Serper service not initialized - returning empty results');
      return 'Web search not configured. Using internal knowledge only.';
    }

    try {
      const results = await this.serperService.searchDocs(topic, site);
      
      if (results.length === 0) {
        return `No documentation found for "${topic}".`;
      }

      const formatted = this.serperService.formatResultsForLLM(results);
      logger.info({ topic, resultsCount: results.length }, 'Documentation search completed');
      
      return `Found ${results.length} relevant documentation sources for "${topic}":\n\n${formatted}`;

    } catch (error) {
      logger.error({ error: (error as Error).message, topic }, 'Documentation search failed');
      return `Search failed for "${topic}". Using internal knowledge.`;
    }
  }

  /**
   * Web Search: General Google search
   * 
   * @param query - Search query
   * @param numResults - Number of results (default: 10)
   * @returns Formatted search results
   */
  async webSearch(query: string, numResults: number = 10): Promise<string> {
    if (!this.serperService) {
      logger.warn('Serper service not initialized');
      return 'Web search not configured.';
    }

    try {
      const results = await this.serperService.search(query, numResults);
      const formatted = this.serperService.formatResultsForLLM(results.organic);
      
      logger.info({ query, resultsCount: results.organic.length }, 'Web search completed');
      return formatted;

    } catch (error) {
      logger.error({ error: (error as Error).message, query }, 'Web search failed');
      return 'Search failed. Using internal knowledge.';
    }
  }

  /**
   * Web Search: Get quick answer
   * 
   * @param query - Search query
   * @returns Quick answer from knowledge graph or first result
   */
  async getQuickAnswer(query: string): Promise<string | null> {
    if (!this.serperService) {
      return null;
    }

    try {
      const answer = await this.serperService.getQuickAnswer(query);
      logger.info({ query, hasAnswer: !!answer }, 'Quick answer retrieved');
      return answer;

    } catch (error) {
      logger.error({ error: (error as Error).message, query }, 'Quick answer failed');
      return null;
    }
  }

  /**
   * Check if web search is available
   */
  hasWebSearch(): boolean {
    return this.serperService !== null;
  }
}
