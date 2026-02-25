import { LLMService } from '../../services/llm/LLMService';
import { logger } from '../../utils/logger';
import { GoldenPath } from '../types/delegation.types';
import { RoadmapResponse } from '../../services/llm/types';

export class ResearchAgent {
  constructor(private llmService: LLMService) {}

  async generateGoldenPath(topic: string, depth: 'lite' | 'deep' = 'lite'): Promise<GoldenPath> {
    logger.info({ topic, depth, module: 'ResearchAgent' }, 'Starting Golden Path generation');

    const prompt = depth === 'deep'
      ? this.getDeepPrompt(topic)
      : this.getLitePrompt(topic);

    try {
      const response = await this.llmService.generateRoadmap('0x0', topic, Date.now());

      const goldenPath: GoldenPath = {
        topic,
        theory: response.title || topic,
        objectives: this.extractObjectives(response),
        prerequisites: this.extractPrerequisites(response)
      };

      logger.info({ topic, module: 'ResearchAgent', objectives: goldenPath.objectives.length }, 'Golden Path generated');
      return goldenPath;
    } catch (error) {
      logger.error({ error: (error as Error).message, topic, module: 'ResearchAgent' }, 'Golden Path generation failed');
      throw error;
    }
  }

  private getLitePrompt(topic: string): string {
    return `Generate a comprehensive learning path for "${topic}" in Lite Mode.

Output JSON structure:
{
  "title": "Learning Path Title",
  "modules": [
    {
      "order": 1,
      "title": "Module Title",
      "context": "Explanation of concepts",
      "docs": [{"title": "Reference", "url": "https://..."}],
      "challenge": "What to build",
      "verificationCriteria": ["Check 1", "Check 2"],
      "groundTruth": "Example code",
      "starterCode": "// Starter code"
    }
  ]
}

Generate 5-7 modules. Output valid JSON only.`;
  }

  private getDeepPrompt(topic: string): string {
    return `Generate a rigorous deep-dive learning path for "${topic}" with advanced theory.

Output JSON structure:
{
  "title": "Advanced Learning Path",
  "theory": "Deep theoretical foundation and key concepts",
  "modules": [
    {
      "order": 1,
      "title": "Advanced Module",
      "context": "Detailed explanation with edge cases",
      "docs": [{"title": "Reference", "url": "https://..."}],
      "challenge": "Complex implementation task",
      "verificationCriteria": ["Advanced check 1", "Check 2"],
      "groundTruth": "Production-ready code",
      "starterCode": "// Advanced starter"
    }
  ]
}

Generate 7 modules for deep exploration. Output valid JSON only.`;
  }

  private extractObjectives(response: any): string[] {
    if (!response.modules || !Array.isArray(response.modules)) {
      return [];
    }
    return response.modules.map((m: any) => m.context || m.title || '');
  }

  private extractPrerequisites(response: any): string[] {
    const prerequisites: string[] = [];
    if (response.modules && Array.isArray(response.modules)) {
      response.modules.forEach((m: any) => {
        if (m.docs && Array.isArray(m.docs)) {
          m.docs.forEach((doc: any) => {
            if (doc.url && !prerequisites.includes(doc.url)) {
              prerequisites.push(doc.url);
            }
          });
        }
      });
    }
    return prerequisites;
  }
}
