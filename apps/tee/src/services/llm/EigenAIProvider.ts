import axios from 'axios';
import { LLMProvider, Challenge } from './types';
import { logger } from '../../utils/logger';

export class EigenAIProvider implements LLMProvider {
  name = 'EigenAI';
  private endpoint = process.env.EIGENAI_ENDPOINT || 'https://eigenai-sepolia.eigencloud.xyz/v1/chat/completions';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Quick ping or model list check
      // For now assume healthy if key exists
      return !!this.apiKey;
    } catch {
      return false;
    }
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    const prompt = `Generate a rigorous technical challenge about "${topic}" with exactly 7 modules.
    Structure: { "modules": [ { "id": 1, "difficulty": "easy", "weight": 10, "questions": [ { "id": "q1", "prompt": "...", "expectedPoints": 10, "expectedKeywords": ["keyword1", "keyword2"] } ] } ... ] }
    Total weight must sum to 100. Output valid JSON only.`;
    
    try {
      logger.info({ provider: this.name, user: userAddress, topic, seed }, 'Requesting generation');
      
      const response = await axios.post(
        this.endpoint,
        {
          model: 'gpt-oss-120b-f16', // Placeholder, update if needed
          messages: [
            { role: 'system', content: 'You are a deterministic technical interviewer. Output valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          seed: seed,
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30s timeout per spec
        }
      );

      const content = response.data.choices[0].message.content;
      const challenge = JSON.parse(content);
      
      // Basic validation
      if (!challenge.modules || challenge.modules.length !== 7) {
        throw new Error('Invalid challenge structure: Modules count mismatch');
      }

      return {
        id: `challenge-${seed}`,
        topic,
        difficulty: 'hard',
        modules: challenge.modules
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Generation failed');
      throw error;
    }
  }
}
