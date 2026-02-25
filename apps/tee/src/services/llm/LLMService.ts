import { LLMProvider, Challenge, RoadmapResponse } from './types';
import { EigenAIProvider } from './EigenAIProvider';
import { GroqProvider } from './GroqProvider';
import { BraveProvider } from './BraveProvider';
import { HyperbolicProvider } from './HyperbolicProvider';
import { logger } from '../../utils/logger';

export class LLMService {
  private providers: LLMProvider[] = [];
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
    eigenPrivateKey: string = ''
  ) {
    if (eigenPrivateKey) {
        this.providers.push(new EigenAIProvider(eigenPrivateKey));
    }
    
    if (groqKey) this.providers.push(new GroqProvider(groqKey));
    if (braveKey) this.providers.push(new BraveProvider(braveKey));
    if (hyperbolicKey) this.providers.push(new HyperbolicProvider(hyperbolicKey));
    
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
}
