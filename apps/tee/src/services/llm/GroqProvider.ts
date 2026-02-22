import axios from 'axios';
import { LLMProvider, Challenge } from './types';
import { logger } from '../../utils/logger';

export class GroqProvider implements LLMProvider {
  name = 'Groq';
  private endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey: string;
  private lastRequestTime: number = 0;
  private tokens: number = 20; // 20 RPM
  private refillRate: number = 1 / 3000; // 1 token per 3s (20 per min)
  private maxTokens: number = 20;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Token Bucket implementation
  private async consumeToken(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    // Refill tokens
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRequestTime = now;

    if (this.tokens < 1) {
      // Not enough tokens, wait (simple delay for now, queueing better for heavy load)
      const waitTime = (1 - this.tokens) / this.refillRate;
      logger.warn({ waitTime }, 'Groq rate limit reached, waiting...');
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.consumeToken(); // Retry
    }

    this.tokens -= 1;
  }

  async isHealthy(): Promise<boolean> {
    return true; // Assume healthy unless failed repeatedly
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    await this.consumeToken();
    
    const prompt = `Generate a rigorous technical challenge about "${topic}" with exactly 7 modules.
    Structure: { "modules": [ { "id": 1, "difficulty": "easy", "weight": 10, "questions": [ { "id": "q1", "prompt": "...", "expectedPoints": 10, "expectedKeywords": ["keyword1", "keyword2"] } ] } ... ] }
    Total weight must sum to 100. Output valid JSON only.`;

    try {
      logger.info({ provider: this.name, user: userAddress, topic }, 'Requesting fallback generation');

      const response = await axios.post(
        this.endpoint,
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a technical interviewer. Output valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7, // Higher temp allowed for fallback
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = response.data.choices[0].message.content;
      const challenge = JSON.parse(content);

      if (!challenge.modules || challenge.modules.length !== 7) {
        throw new Error('Invalid challenge structure: Modules count mismatch');
      }

      return {
        id: `challenge-${seed}-fallback`,
        topic,
        difficulty: 'medium', // Fallback difficulty assumption
        modules: challenge.modules
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Fallback generation failed');
      throw error;
    }
  }
}
