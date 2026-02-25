import Cerebras from '@cerebras/cerebras_cloud_sdk';
import Groq from 'groq-sdk';
import axios from 'axios';
import { ethers } from 'ethers';

type AIProvider = 'cerebras' | 'groq' | 'eigenai';

interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  privateKey?: string; // For EigenAI
}

// EigenAI is the primary provider (EigenLayer hackathon)
const getAIConfig = (apiKeyOverrides?: { 
  groq?: string | undefined; 
  cerebras?: string | undefined;
  eigenPrivateKey?: string | undefined;
}): AIConfig => {
  // EigenAI is primary - check first
  if (apiKeyOverrides?.eigenPrivateKey) {
    return { provider: 'eigenai', privateKey: apiKeyOverrides.eigenPrivateKey };
  }
  if (process.env.EIGENAI_PRIVATE_KEY) {
    return { provider: 'eigenai', privateKey: process.env.EIGENAI_PRIVATE_KEY };
  }

  // Fallback to Groq if available
  if (apiKeyOverrides?.groq) {
    return { provider: 'groq', apiKey: apiKeyOverrides.groq };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }

  // Fallback to Cerebras
  if (apiKeyOverrides?.cerebras) {
    return { provider: 'cerebras', apiKey: apiKeyOverrides.cerebras };
  }
  if (process.env.CEREBRAS_API_KEY) {
    return { provider: 'cerebras', apiKey: process.env.CEREBRAS_API_KEY };
  }

  throw new Error('No AI API Key found. Please set EIGENAI_PRIVATE_KEY in Settings or .env.local');
};

export const getAIClient = (apiKeyOverrides?: { 
  groq?: string | undefined; 
  cerebras?: string | undefined;
  eigenPrivateKey?: string | undefined;
}) => {
  const config = getAIConfig(apiKeyOverrides);

  if (config.provider === 'eigenai') {
    return {
      client: new EigenAIClient(config.privateKey!),
      provider: 'eigenai',
      defaultModel: 'gpt-oss-120b-f16',
      fastModel: 'gpt-oss-120b-f16'
    };
  } else if (config.provider === 'groq') {
    return {
      client: new Groq({ apiKey: config.apiKey }),
      provider: 'groq',
      defaultModel: 'llama-3.3-70b-versatile',
      fastModel: 'llama-3.1-8b-instant'
    };
  } else {
    return {
      client: new Cerebras({ apiKey: config.apiKey! }),
      provider: 'cerebras',
      defaultModel: 'llama3.1-8b',
      fastModel: 'llama3.1-8b'
    };
  }
};

/**
 * EigenAI Client - Uses wallet-based authentication with EigenArcade
 */
class EigenAIClient {
  private endpoint = 'https://determinal-api.eigenarcade.com/api/chat/completions';
  private grantEndpoint = 'https://determinal-api.eigenarcade.com/message';
  private wallet: ethers.Wallet;
  private walletAddress: string;
  public completions: any;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.walletAddress = this.wallet.address;
    
    // Bind completions to this instance
    const self = this;
    this.completions = {
      create: async (params: {
        messages: Array<{ role: string; content: string }>;
        model?: string;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
      }) => {
        try {
          // Get grant message
          const grantMessage = await self.getGrantMessage();
          
          // Sign grant message
          const grantSignature = await self.signMessage(grantMessage);

          // Make API call
          const response = await axios.post(
            self.endpoint,
            {
              messages: params.messages,
              model: params.model || 'gpt-oss-120b-f16',
              max_tokens: params.max_tokens || 4000,
              temperature: params.temperature ?? 0.1,
              grantMessage,
              grantSignature,
              walletAddress: self.walletAddress, // Use walletAddress not address
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 60000
            }
          );

          // Parse response - EigenAI returns text that needs JSON extraction
          let content = response.data.choices?.[0]?.message?.content || '';
          
          // Extract JSON from response (EigenAI may include markdown)
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            content = jsonMatch[0];
          }

          return {
            choices: [{
              message: { content }
            }]
          };
        } catch (error) {
          console.error('EigenAI API Error:', error);
          throw error;
        }
      }
    };
  }

  private async getGrantMessage(): Promise<string> {
    const response = await axios.get(`${this.grantEndpoint}?address=${this.walletAddress}`);
    return response.data.message;
  }

  private async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }
}
