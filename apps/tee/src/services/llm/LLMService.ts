import { LLMProvider, Challenge } from './types';
import { EigenAIProvider } from './EigenAIProvider';
import { GroqProvider } from './GroqProvider';
import { logger } from '../../utils/logger';

export class LLMService {
  private primary: LLMProvider;
  private fallback: LLMProvider;
  private circuitOpen: boolean = false;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly COOLDOWN_PERIOD = 60000; // 60s

  constructor(eigenKey: string, groqKey: string) {
    this.primary = new EigenAIProvider(eigenKey);
    this.fallback = new GroqProvider(groqKey);
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    // Check Circuit Breaker
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailureTime > this.COOLDOWN_PERIOD) {
        logger.info('Circuit Breaker HALF_OPEN: Retrying primary...');
        // Allow one request through to test
      } else {
        logger.warn('Circuit Breaker OPEN: Using fallback...');
        return this.fallback.generateChallenge(userAddress, topic, seed);
      }
    }

    try {
      const result = await this.primary.generateChallenge(userAddress, topic, seed);
      
      // Success: Reset circuit breaker
      if (this.circuitOpen) {
        logger.info('Circuit Breaker CLOSED: Primary recovered');
        this.circuitOpen = false;
        this.failureCount = 0;
      }
      return result;

    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      logger.error({ error: (error as Error).message, failures: this.failureCount }, 'Primary provider failed');

      if (this.failureCount >= this.FAILURE_THRESHOLD) {
        this.circuitOpen = true;
        logger.warn('Circuit Breaker TRIPPED: Switching to fallback');
      }

      // Try fallback immediately
      return this.fallback.generateChallenge(userAddress, topic, seed);
    }
  }
}
