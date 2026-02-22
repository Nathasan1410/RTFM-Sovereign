import { RubricSchema, JudgingResult, CodeSubmission } from '../schemas';

export interface RubricConfig {
  functionality_weight?: number;
  quality_weight?: number;
  best_practices_weight?: number;
  innovation_weight?: number;
}

export interface RubricCriteria {
  name: string;
  weight: number;
  description: string;
  checklist: string[];
}

export class RubricSystem {
  
  public static readonly DEFAULT_RUBRIC: z.infer<typeof RubricSchema> = {
    functionality_weight: 0.4,
    quality_weight: 0.3,
    best_practices_weight: 0.2,
    innovation_weight: 0.1
  };
  
  public static readonly STRICT_RUBRIC: z.infer<typeof RubricSchema> = {
    functionality_weight: 0.5,
    quality_weight: 0.3,
    best_practices_weight: 0.15,
    innovation_weight: 0.05
  };
  
  public static readonly CREATIVE_RUBRIC: z.infer<typeof RubricSchema> = {
    functionality_weight: 0.3,
    quality_weight: 0.25,
    best_practices_weight: 0.25,
    innovation_weight: 0.2
  };
  
  public static createRubric(config: RubricConfig): z.infer<typeof RubricSchema> {
    return RubricSchema.parse({
      functionality_weight: config.functionality_weight ?? 0.4,
      quality_weight: config.quality_weight ?? 0.3,
      best_practices_weight: config.best_practices_weight ?? 0.2,
      innovation_weight: config.innovation_weight ?? 0.1
    });
  }
  
  public static validateRubric(rubric: z.infer<typeof RubricSchema>): boolean {
    const total = 
      rubric.functionality_weight +
      rubric.quality_weight +
      rubric.best_practices_weight +
      rubric.innovation_weight;
    
    return Math.abs(total - 1.0) < 0.01;
  }
  
  public static getCriteria(rubric: z.infer<typeof RubricSchema>): RubricCriteria[] {
    return [
      {
        name: 'Functionality',
        weight: rubric.functionality_weight,
        description: 'Does the code implement the required features correctly?',
        checklist: [
          'All required features are implemented',
          'Edge cases are handled',
          'User requirements are met',
          'Integration points work correctly'
        ]
      },
      {
        name: 'Code Quality',
        weight: rubric.quality_weight,
        description: 'Is the code readable, maintainable, and well-organized?',
        checklist: [
          'Code is clean and readable',
          'Variable and function names are descriptive',
          'Code is properly structured',
          'Comments explain complex logic'
        ]
      },
      {
        name: 'Best Practices',
        weight: rubric.best_practices_weight,
        description: 'Does the code follow industry best practices and conventions?',
        checklist: [
          'Follows language conventions',
          'Uses appropriate design patterns',
          'Proper error handling',
          'Security best practices'
        ]
      },
      {
        name: 'Innovation',
        weight: rubric.innovation_weight,
        description: 'Does the solution show creativity and unique approaches?',
        checklist: [
          'Creative problem solving',
          'Unique implementation',
          'Optimized approach',
          'Novel features'
        ]
      }
    ];
  }
  
  public static calculatePassingThreshold(rubric: z.infer<typeof RubricSchema>): number {
    const minScore = 60;
    const maxScore = 85;
    
    if (rubric.innovation_weight > 0.15) {
      return minScore;
    }
    
    if (rubric.functionality_weight > 0.45) {
      return maxScore;
    }
    
    return 70;
  }
  
  public static generateRubricReport(
    result: JudgingResult,
    rubric: z.infer<typeof RubricSchema>
  ): string {
    const threshold = this.calculatePassingThreshold(rubric);
    const passed = result.overall_score >= threshold;
    
    let report = `=== RUBRIC EVALUATION REPORT ===\n\n`;
    report += `Overall Score: ${result.overall_score}/100\n`;
    report += `Status: ${passed ? 'PASSED' : 'FAILED'} (Threshold: ${threshold})\n\n`;
    
    report += `=== DETAILED SCORES ===\n`;
    report += `Functionality: ${result.layer2_result.functionality_score}/100 (Weight: ${rubric.functionality_weight * 100}%)\n`;
    report += `Quality: ${result.layer2_result.quality_score}/100 (Weight: ${rubric.quality_weight * 100}%)\n`;
    report += `Best Practices: ${result.layer2_result.best_practices_score}/100 (Weight: ${rubric.best_practices_weight * 100}%)\n`;
    report += `Innovation: ${result.layer2_result.innovation_score}/100 (Weight: ${rubric.innovation_weight * 100}%)\n\n`;
    
    report += `=== FEEDBACK ===\n`;
    report += `${result.layer2_result.feedback}\n\n`;
    
    if (result.layer2_result.suggestions.length > 0) {
      report += `=== SUGGESTIONS ===\n`;
      result.layer2_result.suggestions.forEach((s, i) => {
        report += `${i + 1}. ${s}\n`;
      });
    }
    
    return report;
  }
  
  public static adaptRubricForDifficulty(
    baseRubric: z.infer<typeof RubricSchema>,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): z.infer<typeof RubricSchema> {
    const adapted = { ...baseRubric };
    
    switch (difficulty) {
      case 'beginner':
        adapted.functionality_weight = 0.5;
        adapted.quality_weight = 0.3;
        adapted.best_practices_weight = 0.2;
        adapted.innovation_weight = 0.0;
        break;
      case 'intermediate':
        adapted.functionality_weight = 0.4;
        adapted.quality_weight = 0.3;
        adapted.best_practices_weight = 0.2;
        adapted.innovation_weight = 0.1;
        break;
      case 'advanced':
        adapted.functionality_weight = 0.35;
        adapted.quality_weight = 0.25;
        adapted.best_practices_weight = 0.2;
        adapted.innovation_weight = 0.2;
        break;
    }
    
    return adapted;
  }
}

import * as z from 'zod';
