import { LLMProvider, Challenge } from './types';
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
  private readonly COOLDOWN_PERIOD = 60000; // 60s

  constructor(
    cerebrasKey: string,
    groqKey: string,
    braveKey: string,
    hyperbolicKey: string,
    eigenKey: string
  ) {
    // Initialize providers in order of preference
    // Note: Cerebras is primary, others are fallbacks
    // We can add CerebrasProvider here if available, currently using EigenAIProvider as primary based on existing code structure,
    // but typically Cerebras would be its own provider. 
    // Assuming EigenAIProvider wraps Cerebras or is the primary intended provider.
    // If CerebrasProvider exists, we should use it. Let's stick to the existing pattern but expand.
    
    // For now, let's treat them as a list of providers to try in order.
    if (cerebrasKey) {
        // Assuming there is a CerebrasProvider or we use EigenAIProvider as a placeholder for it if configured that way.
        // The original code used EigenAIProvider with eigenKey.
        // Let's keep EigenAIProvider as one option.
    }

    // Let's restructure to support the list
    if (cerebrasKey) this.providers.push(new EigenAIProvider(cerebrasKey));
    if (groqKey) this.providers.push(new GroqProvider(groqKey));
    if (braveKey) this.providers.push(new BraveProvider(braveKey));
    if (hyperbolicKey) this.providers.push(new HyperbolicProvider(hyperbolicKey));
    if (eigenKey) this.providers.push(new EigenAIProvider(eigenKey));
    
    // Initialize circuit breaker state for each provider
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
      
      // Check Circuit Breaker
      if (this.circuitOpen[i]) {
        if (Date.now() - this.lastFailureTimes[i] > this.COOLDOWN_PERIOD) {
          logger.info({ provider: provider.name }, 'Circuit Breaker HALF_OPEN: Retrying provider...');
          // Allow one request through
        } else {
          logger.warn({ provider: provider.name }, 'Circuit Breaker OPEN: Skipping provider...');
          continue;
        }
      }

      try {
        const result = await provider.generateChallenge(userAddress, topic, seed);
        
        // Success: Reset circuit breaker for this provider
        if (this.circuitOpen[i]) {
          logger.info({ provider: provider.name }, 'Circuit Breaker CLOSED: Provider recovered');
          this.circuitOpen[i] = false;
          this.failureCounts[i] = 0;
        }
        
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
