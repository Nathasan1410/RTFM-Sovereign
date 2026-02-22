
import axios from 'axios';
import { LLMProvider, RoadmapResponse } from './types';
import { logger } from '../../utils/logger';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export class EigenAIProvider implements LLMProvider {
  name = 'EigenAI';
  private endpoint = 'https://determinal-api.eigenarcade.com/api/chat/completions';
  private grantEndpoint = 'https://determinal-api.eigenarcade.com/message';
  private privateKey: `0x${string}`;
  private walletAddress: string;

  constructor(privateKey: string) {
    this.privateKey = privateKey as `0x${string}`;
    const account = privateKeyToAccount(this.privateKey);
    this.walletAddress = account.address;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if we have a grant
      const response = await axios.get(`https://determinal-api.eigenarcade.com/checkGrant?address=${this.walletAddress}`);
      return response.data.hasGrant && response.data.tokenCount > 0;
    } catch {
      return false;
    }
  }

  private async getGrantMessage(): Promise<string> {
    const response = await axios.get(`${this.grantEndpoint}?address=${this.walletAddress}`);
    return response.data.message;
  }

  private async signMessage(message: string): Promise<string> {
    const account = privateKeyToAccount(this.privateKey);
    return await account.signMessage({ message });
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<RoadmapResponse> {
    const prompt = `Generate a rigorous learning roadmap for "${topic}" with exactly 7 modules.
    Structure: { 
      "title": "Project Title",
      "modules": [ 
        { 
          "order": 1,
          "title": "Step Title",
          "context": "Explanation of the concept and why it's essential...",
          "docs": [
            { "title": "MDN Reference", "url": "https://developer.mozilla.org/..." }
          ],
          "challenge": "Specific instruction on what to build...",
          "verificationCriteria": [
            "Check for div with class 'card'",
            "Check width is fixed or max-width",
            "Check padding is applied"
          ],
          "groundTruth": "<div class='card'>...</div>",
          "starterCode": "<!-- Write your code here -->"
        }
      ]
    }
    Generate 5-7 micro-steps. Output valid JSON only.`;
    
    try {
      logger.info({ provider: this.name, user: userAddress, topic, seed }, 'Requesting generation');

      // 1. Get Grant Message
      const grantMessage = await this.getGrantMessage();
      
      // 2. Sign Grant Message
      const grantSignature = await this.signMessage(grantMessage);

      // 3. Make API Call
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            { role: 'system', content: 'You are a Brutal Tech Mentor & Project Architect. Output valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          model: 'gpt-oss-120b-f16',
          max_tokens: 4000,
          seed: seed,
          grantMessage,
          grantSignature,
          walletAddress: this.walletAddress
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Clean up markdown if present
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const roadmap = JSON.parse(jsonContent);
      
      // Basic validation
      if (!roadmap.modules || roadmap.modules.length !== 7) {
        throw new Error('Invalid roadmap structure: Modules count mismatch');
      }

      return {
        title: roadmap.title,
        modules: roadmap.modules
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Generation failed');
      throw error;
    }
  }
}
