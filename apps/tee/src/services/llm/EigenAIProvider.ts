
import axios from 'axios';
import { LLMProvider, RoadmapResponse, Challenge } from './types';
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

  async generateChallenge(userAddress: string, topic: string, seed: number): Promise<Challenge> {
    const prompt = `Generate a rigorous technical challenge about "${topic}" with exactly 7 modules.

OUTPUT FORMAT (FILL THIS TEMPLATE EXACTLY):
{
  "modules": [
    {
      "id":1,
      "difficulty": "easy|medium|hard",
      "weight": 10,
      "questions": [
        {
          "id": "q1",
          "prompt": "SPECIFIC_QUESTION_PROMPT",
          "expectedPoints": 10,
          "expectedKeywords": ["KEYWORD1", "KEYWORD2"]
        }
      ]
    },
    ... (repeat for 7 modules total, ensure total weight = 100)
  ]
}

MANDATORY RULES:
- Replace ALL placeholders above with actual content
- DO NOT add any text before or after the JSON
- DO NOT use markdown code blocks (\`\`\`)
- DO NOT add explanations or comments
- Start output immediately with opening brace {
- End output immediately with closing brace }
- Total weight of all modules must equal 100
- Output ONLY the completed JSON object

NOW: Fill template above and output ONLY the completed JSON.`;
    
    try {
      logger.info({ provider: this.name, user: userAddress, topic, seed }, 'Requesting challenge generation');

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
              content: 'You are a technical interviewer. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS. NO INTRODUCTORY TEXT. START IMMEDIATELY WITH { AND END WITH }. ANY TEXT BEFORE OR AFTER THE JSON WILL BE CONSIDERED AN ERROR.'
            },
            { role: 'user', content: prompt }
          ],
          model: 'gpt-oss-120b-f16',
          max_tokens: 4000,
          seed: seed,
          temperature: 0,
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

      // Validate HTTP status code
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      // Check for error in response
      if (response.data.error) {
        throw new Error(`API error: ${response.data.error}`);
      }

      // Check if choices array exists and is not empty
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('API returned empty choices array');
      }

      const content = response.data.choices[0].message.content;

      // Log FULL response for debugging
      logger.info({
        provider: this.name,
        fullResponse: content,
        responseLength: content?.length,
      }, 'EigenAI API FULL RESPONSE (DEBUG)');

      // Check if content is valid
      if (!content || typeof content !== 'string') {
        throw new Error('API returned invalid or empty content');
      }

      // Clean up EigenAI channel format and markdown if present FIRST
      let jsonContent = content
        .replace(/.*<\|end\|>/s, '') // Remove EVERYTHING from start to <|end|> (including reasoning)
        .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
        .trim();

      // NOW check if cleaned content starts with error messages (plain text)
      if (jsonContent.startsWith('Welcome') || jsonContent.startsWith('Warning') || jsonContent.startsWith('Error') || jsonContent.startsWith('We need')) {
        throw new Error(`API returned non-JSON response: ${jsonContent.substring(0, 100)}`);
      }

      // Validate JSON format before parsing
      if (!jsonContent.startsWith('{') && !jsonContent.startsWith('[')) {
        throw new Error(`Invalid JSON format. Content starts with: ${jsonContent.substring(0, 50)}`);
      }

      let challenge;
      try {
        challenge = JSON.parse(jsonContent);
      } catch (parseError) {
        logger.error({
          error: (parseError as Error).message,
          content: jsonContent.substring(0, 500),
          originalContent: content.substring(0, 500)
        }, 'Failed to parse JSON response');
        throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
      }
      
      // Basic validation
      if (!challenge.modules || challenge.modules.length !== 7) {
        throw new Error('Invalid challenge structure: Modules count mismatch');
      }

      return {
        id: `challenge-${seed}-eigen`,
        topic,
        difficulty: 'medium',
        modules: challenge.modules
      };
    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'Challenge generation failed');
      throw error;
    }
  }

  async generateRoadmap(userAddress: string, topic: string, seed: number): Promise<RoadmapResponse> {
    const prompt = `Generate a rigorous learning roadmap for "${topic}" with 5-10 micro-chunked modules for progressive mastery.

OUTPUT FORMAT (FILL THIS TEMPLATE EXACTLY):
{
  "title": "YOUR_TITLE_HERE",
  "modules": [
    {
      "order": 1,
      "title": "YOUR_MODULE_1_TITLE",
      "context": "EXPLANATION_OF_CONCEPT",
      "docs": [
        { "title": "DOC_TITLE", "url": "HTTPS_URL" }
      ],
      "challenge": "SPECIFIC_INSTRUCTION",
      "verificationCriteria": [
        "CRITERION_1",
        "CRITERION_2",
        "CRITERION_3"
      ],
      "groundTruth": "HTML_CODE",
      "starterCode": "CODE"
    },
    ... (repeat for 7 modules total)
  ]
}

MANDATORY RULES:
- Replace ALL placeholders above with actual content
- DO NOT add any text before or after the JSON
- DO NOT use markdown code blocks (\`\`\`)
- DO NOT add explanations or comments
- Start output immediately with the opening brace {
- End output immediately with the closing brace }
- Output ONLY the JSON object above with filled values

NOW: Fill the template above and output ONLY the completed JSON.`;
    
    try {
      logger.info({ provider: this.name, user: userAddress, topic, seed }, 'Requesting roadmap generation');

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
              content: 'You are a Brutal Tech Mentor & Project Architect. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS. NO INTRODUCTORY TEXT. START IMMEDIATELY WITH { AND END WITH }. ANY TEXT BEFORE OR AFTER THE JSON WILL BE CONSIDERED AN ERROR.'
            },
            { role: 'user', content: prompt }
          ],
          model: 'gpt-oss-120b-f16',
          max_tokens: 4000,
          seed: seed,
          temperature: 0,
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

      // Validate HTTP status code
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      // Check for error in response
      if (response.data.error) {
        throw new Error(`API error: ${response.data.error}`);
      }

      // Check if choices array exists and is not empty
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('API returned empty choices array');
      }

      const content = response.data.choices[0].message.content;

      // Log FULL response for debugging
      logger.info({
        provider: this.name,
        fullResponse: content,
        responseLength: content?.length,
      }, 'EigenAI API FULL RESPONSE (DEBUG)');

      // Check if content is valid
      if (!content || typeof content !== 'string') {
        throw new Error('API returned invalid or empty content');
      }

      // Clean up EigenAI channel format and markdown if present FIRST
      let jsonContent = content
        .replace(/.*?<\|end\|>/s, '') // Remove EVERYTHING from start to <|end|> (including reasoning)
        .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
        .trim();

      // NOW check if cleaned content starts with error messages (plain text)
      if (jsonContent.startsWith('Welcome') || jsonContent.startsWith('Warning') || jsonContent.startsWith('Error') || jsonContent.startsWith('We need')) {
        throw new Error(`API returned non-JSON response: ${jsonContent.substring(0, 100)}`);
      }

      // Validate JSON format before parsing
      if (!jsonContent.startsWith('{') && !jsonContent.startsWith('[')) {
        throw new Error(`Invalid JSON format. Content starts with: ${jsonContent.substring(0, 50)}`);
      }

      let roadmap;
      try {
        roadmap = JSON.parse(jsonContent);
      } catch (parseError) {
        logger.error({
          error: (parseError as Error).message,
          content: jsonContent.substring(0, 500),
          originalContent: content.substring(0, 500)
        }, 'Failed to parse JSON response');
        throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
      }
      
      // Basic validation
      if (!roadmap.modules || roadmap.modules.length < 3 || roadmap.modules.length > 15) {
        throw new Error('Invalid roadmap structure: Modules count must be between 3-15');
      }

      return {
        title: roadmap.title,
        modules: roadmap.modules
      };
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
              content: 'You are a JSON API. YOUR OUTPUT MUST BE VALID JSON ONLY. NO MARKDOWN. NO EXPLANATIONS. NO INTRODUCTORY TEXT. START IMMEDIATELY WITH { AND END WITH }. ANY TEXT BEFORE OR AFTER THE JSON WILL BE CONSIDERED AN ERROR.'
            },
            { role: 'user', content: prompt }
          ],
          model: 'gpt-oss-120b-f16',
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

      // Validate HTTP status code
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      // Check for error in response
      if (response.data.error) {
        throw new Error(`API error: ${response.data.error}`);
      }

      // Check if choices array exists and is not empty
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('API returned empty choices array');
      }

      const content = response.data.choices[0].message.content;

      // Log FULL response for debugging
      logger.info({
        provider: this.name,
        fullResponse: content,
        responseLength: content?.length,
      }, 'EigenAI API FULL RESPONSE (DEBUG)');

      // Check if content is valid
      if (!content || typeof content !== 'string') {
        throw new Error('API returned invalid or empty content');
      }

      // Clean up EigenAI channel format and markdown if present
      let jsonContent = content
        .replace(/.*?<\|end\|>/s, '') // Remove EVERYTHING from start to <|end|> (including reasoning)
        .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
        .trim();

      // Check if cleaned content starts with error messages (plain text)
      if (jsonContent.startsWith('Welcome') || jsonContent.startsWith('Warning') || jsonContent.startsWith('Error') || jsonContent.startsWith('We need')) {
        throw new Error(`API returned non-JSON response: ${jsonContent.substring(0, 100)}`);
      }

      // Validate JSON format before parsing
      if (!jsonContent.startsWith('{') && !jsonContent.startsWith('[')) {
        throw new Error(`Invalid JSON format. Content starts with: ${jsonContent.substring(0, 50)}`);
      }

      try {
        return JSON.parse(jsonContent);
      } catch (parseError) {
        logger.error({
          error: (parseError as Error).message,
          content: jsonContent.substring(0, 500),
          originalContent: content.substring(0, 500)
        }, 'Failed to parse JSON response');
        throw new Error(`Invalid JSON response: ${(parseError as Error).message}`);
      }
    } catch (error) {
      logger.error({ error: (error as Error).message, provider: this.name }, 'JSON generation failed');
      throw error;
    }
  }
}
