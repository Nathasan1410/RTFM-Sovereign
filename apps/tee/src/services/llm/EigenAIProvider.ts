import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { LLMProvider, Challenge, RoadmapResponse } from './types';

export class EigenAIProvider implements LLMProvider {
  public readonly name = 'EigenAI';
  private endpoint: string;
  private walletAddress: string;
  private wallet: ethers.Wallet;

  constructor(private eigenPrivateKey: string) {
    this.endpoint = process.env.EIGENAI_API_URL || 'https://determinal-api.eigenarcade.com/api/chat/completions';
    
    // Create wallet instance from private key for signing
    this.wallet = new ethers.Wallet(eigenPrivateKey);
    this.walletAddress = this.wallet.address;
  }

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    try {
      logger.info({ provider: this.name }, 'Requesting challenge generation');

      // 1. Get Grant Message
      const grantMessage = await this.getGrantMessage();

      // 2. Sign Grant Message
      const grantSignature = await this.signMessage(grantMessage);

      // 3. Make API Call
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a JSON API. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS.'
            },
            { role: 'user', content: `Generate a coding challenge for: ${topic}` }
          ],
          model: 'qwen3-32b-128k-bf16',
          max_tokens: 4000,
          temperature: 0.1,
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
      
      // Extract and parse JSON
      const parsed = this.extractAndParseJSON(content);
      
      logger.info({ provider: this.name }, '✅ Challenge generated successfully');
      
      return parsed as Challenge;

    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Challenge generation failed');
      throw error;
    }
  }

  async generateRoadmap(userAddress: string, topic: string, seed: number): Promise<RoadmapResponse> {
    try {
      logger.info({ provider: this.name }, 'Requesting roadmap generation');

      // 1. Get Grant Message
      const grantMessage = await this.getGrantMessage();

      // 2. Sign Grant Message
      const grantSignature = await this.signMessage(grantMessage);

      // 3. Make API Call
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a JSON API. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS.'
            },
            { role: 'user', content: `Generate a learning roadmap for: ${topic}` }
          ],
          model: 'qwen3-32b-128k-bf16',
          max_tokens: 8000,
          temperature: 0.1,
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
      
      // Extract and parse JSON
      const parsed = this.extractAndParseJSON(content);
      
      logger.info({ provider: this.name }, '✅ Roadmap generated successfully');
      
      return parsed as RoadmapResponse;

    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Roadmap generation failed');
      throw error;
    }
  }

  async generateJson(prompt: string): Promise<any> {
    try {
      logger.info({ provider: this.name }, 'Requesting JSON generation');

      // 1. Get Grant Message
      const grantMessage = await this.getGrantMessage();

      // 2. Sign Grant Message
      const grantSignature = await this.signMessage(grantMessage);

      // 3. Make API Call
      const response = await axios.post(
        this.endpoint,
        {
          messages: [
            {
              role: 'system',
              content: 'You are a JSON API. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS. NO INTRODUCTORY TEXT. START IMMEDIATELY WITH { AND END WITH }.'
            },
            { role: 'user', content: prompt }
          ],
          model: 'qwen3-32b-128k-bf16', // Qwen is MUCH better at structured JSON than GPT-OSS!
          max_tokens: 8000,
          temperature: 0.1,
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

      // Log FULL response for debugging
      logger.info({
        provider: this.name,
        responseLength: content?.length,
      }, 'EigenAI API response received');

      // Check if content is valid
      if (!content || typeof content !== 'string') {
        throw new Error('API returned invalid or empty content');
      }

      // ============================================
      // ROBUST JSON EXTRACTION (NOT AGGRESSIVE CLEANING!)
      // ============================================
      
      const jsonContent = this.extractAndParseJSON(content);
      
      logger.info('JSON extracted and parsed successfully');
      
      return jsonContent;

    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'JSON generation failed');
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to get grant message
      await this.getGrantMessage();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Robust JSON extraction that handles various AI output formats
   */
  private extractAndParseJSON(raw: string): any {
    let jsonContent = raw;
    
    // Step 1: Remove channel tags if present
    const endMarker = '<|end|>';
    const endMarkerIndex = jsonContent.lastIndexOf(endMarker);
    if (endMarkerIndex !== -1) {
      jsonContent = jsonContent.substring(endMarkerIndex + endMarker.length);
      logger.info({ endMarkerIndex }, 'Removed channel tags');
    }

    // Step 2: Try to extract JSON from markdown code blocks
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
      logger.info('Extracted JSON from markdown code block');
    }

    // Step 3: Find JSON object boundaries using BRACE COUNTING
    // This handles cases where AI adds text before/after JSON
    const firstBrace = jsonContent.indexOf('{');
    const lastBrace = jsonContent.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let candidate = jsonContent.substring(firstBrace, lastBrace + 1);
      
      // Try parse as-is first (Qwen usually outputs valid JSON)
      try {
        const parsed = JSON.parse(candidate);
        logger.info({ firstBrace, lastBrace }, 'Extracted JSON using brace counting (parse successful)');
        return parsed;
      } catch (initialError) {
        logger.info('Initial parse failed, applying minimal sanitization...');
        
        // Only apply minimal fixes if raw parse fails
        candidate = this.minimalSanitize(candidate);
        
        try {
          const parsed = JSON.parse(candidate);
          logger.info({ sanitizedLength: candidate.length }, 'JSON parsed after minimal sanitization');
          return parsed;
        } catch (e) {
          logger.error({
            error: (e as Error).message,
            snippet: candidate.substring(0, 200)
          }, 'JSON parse failed even after sanitization');
          throw new Error(`JSON parse failed: ${(e as Error).message}`);
        }
      }
    }
    
    // Fallback: try parse entire string
    jsonContent = jsonContent.trim();
    logger.info('Using fallback: parsing entire response');
    
    return JSON.parse(jsonContent);
  }

  /**
   * Minimal sanitization - only fix specific known issues
   */
  private minimalSanitize(json: string): string {
    // 1. Remove trailing commas before } or ]
    json = json.replace(/,(?=\s*[}\]])/g, '');
    
    // 2. Fix unquoted step IDs ONLY in previous_steps arrays
    json = json.replace(/("previous_steps"\s*:\s*\[)([^\]]+)\]/g, (match, prefix, content) => {
      const fixedContent = content.replace(/(\d+)_(\d+)/g, '"$1_$2"');
      return prefix + fixedContent + ']';
    });
    
    // 3. Remove control characters
    json = json.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
    
    // 4. Fix smart quotes
    json = json
      .replace(/"/g, '"')
      .replace(/"/g, '"');
    
    // 5. Fix unicode hyphens
    json = json
      .replace(/ÔÇæ/g, '-')
      .replace(/ÔÇö/g, '-')
      .replace(/ÔÇô/g, '-');
    
    return json;
  }

  private async getGrantMessage(): Promise<string> {
    // Generate a proper grant message with timestamp for replay protection
    const timestamp = Math.floor(Date.now() / 1000);
    return `I request access to EigenAI API for wallet ${this.walletAddress} at timestamp ${timestamp}`;
  }

  private async signMessage(message: string): Promise<string> {
    // Sign the message using ethers wallet (proper EIP-191 personal sign)
    const signature = await this.wallet.signMessage(message);
    return signature;
  }
}
