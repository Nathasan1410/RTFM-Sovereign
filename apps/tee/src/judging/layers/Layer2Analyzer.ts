import { Layer2ResultSchema, RubricSchema, CodeSubmission, Layer1Result } from '../schemas';

export interface EigenAIClient {
  analyze(code: string, prompt: string, seed: number): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }>;
}

export class MockEigenAIClient implements EigenAIClient {
  
  public async analyze(code: string, prompt: string, seed: number): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    await this.simulateLatency(seed);

    const characteristics = this.analyzeCodeCharacteristics(code, seed);
    const baseScore = this.calculateDeterministicScore(characteristics, seed);
    const feedback = this.generateFeedback(characteristics, baseScore);
    const suggestions = this.generateSuggestions(characteristics);

    return {
      score: baseScore,
      feedback,
      suggestions
    };
  }

  private async simulateLatency(seed: number): Promise<void> {
    const delay = (seed % 500) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private analyzeCodeCharacteristics(code: string, seed: number): {
    hasComments: boolean;
    hasErrorHandling: boolean;
    hasTypes: boolean;
    hasTests: boolean;
    complexity: number;
    usesModernPatterns: boolean;
    hasSecurity: boolean;
    lineCount: number;
    hasExports: boolean;
    hasImports: boolean;
  } {
    return {
      hasComments: /\/\/|\/\*/.test(code),
      hasErrorHandling: /try\s*\{|catch\s*\(|throw\s+/.test(code),
      hasTypes: /:\s*(string|number|boolean|interface|type|enum)/.test(code),
      hasTests: /test|describe|it\(|expect\(/.test(code),
      complexity: this.calculateComplexity(code, seed),
      usesModernPatterns: /=>|const|let|async|await|\.map\(|\.filter\(/.test(code),
      hasSecurity: /validate|sanitize|escape|verify/.test(code),
      lineCount: code.split('\n').length,
      hasExports: /export\s+(default|const|function|class|interface|type)/.test(code),
      hasImports: /import\s+/.test(code)
    };
  }

  private calculateComplexity(code: string, seed: number): number {
    const ifCount = (code.match(/\bif\s*\(/g) || []).length;
    const forCount = (code.match(/\b(for|while)\s*\(/g) || []).length;
    const functionCount = (code.match(/function|\w+\s*\(|=>/g) || []).length;
    const nestedBrackets = (code.match(/\{[\s\S]*\{/g) || []).length;
    
    return Math.min(100, (ifCount * 5) + (forCount * 5) + (functionCount * 3) + (nestedBrackets * 10));
  }

  private calculateDeterministicScore(characteristics: any, seed: number): number {
    let score = 55;
    
    if (characteristics.hasComments) score += 5;
    if (characteristics.hasErrorHandling) score += 12;
    if (characteristics.hasTypes) score += 10;
    if (characteristics.hasTests) score += 10;
    if (characteristics.usesModernPatterns) score += 8;
    if (characteristics.hasSecurity) score += 8;
    if (characteristics.hasExports) score += 3;
    if (characteristics.hasImports) score += 2;
    
    const complexityPenalty = Math.min(15, Math.floor(characteristics.complexity / 15));
    score -= complexityPenalty;
    
    const lengthBonus = Math.min(8, Math.floor(characteristics.lineCount / 60));
    score += lengthBonus;
    
    const seedVariation = (seed % 15) - 7;
    score += seedVariation;
    
    return Math.max(0, Math.min(100, Math.floor(score)));
  }

  private generateFeedback(characteristics: any, score: number): string {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (characteristics.hasComments) strengths.push('well-commented code');
    if (characteristics.hasErrorHandling) strengths.push('proper error handling');
    if (characteristics.hasTypes) strengths.push('strong typing');
    if (characteristics.hasTests) strengths.push('test coverage');
    if (characteristics.usesModernPatterns) strengths.push('modern ES6+ patterns');
    if (characteristics.hasSecurity) strengths.push('security considerations');
    
    if (!characteristics.hasComments) weaknesses.push('missing code comments');
    if (!characteristics.hasErrorHandling) weaknesses.push('lack of error handling');
    if (!characteristics.hasTypes) weaknesses.push('missing type annotations');
    if (!characteristics.hasTests) weaknesses.push('no tests');
    if (characteristics.complexity > 30) weaknesses.push('high complexity');
    
    let feedback = `Overall Score: ${score}/100. `;
    
    if (score >= 80) {
      feedback += 'Excellent implementation! ';
    } else if (score >= 60) {
      feedback += 'Good implementation with room for improvement. ';
    } else if (score >= 40) {
      feedback += 'Implementation needs significant improvements. ';
    } else {
      feedback += 'Major issues detected. ';
    }
    
    if (strengths.length > 0) {
      feedback += `Strengths: ${strengths.join(', ')}. `;
    }
    
    if (weaknesses.length > 0) {
      feedback += `Areas to improve: ${weaknesses.join(', ')}.`;
    }
    
    return feedback;
  }

  private generateSuggestions(characteristics: any): string[] {
    const suggestions: string[] = [];
    
    if (!characteristics.hasComments) {
      suggestions.push('Add comprehensive code comments to explain complex logic');
    }
    if (!characteristics.hasErrorHandling) {
      suggestions.push('Implement try-catch blocks for error handling');
    }
    if (!characteristics.hasTypes) {
      suggestions.push('Add TypeScript type annotations for better type safety');
    }
    if (!characteristics.hasTests) {
      suggestions.push('Write unit tests to verify functionality');
    }
    if (!characteristics.hasSecurity) {
      suggestions.push('Add input validation and sanitization');
    }
    if (characteristics.complexity > 30) {
      suggestions.push('Consider refactoring complex functions into smaller, more manageable pieces');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Great work! Consider adding more edge case handling');
    }
    
    return suggestions;
  }
}

export class Layer2Analyzer {
  private eigenaiClient: EigenAIClient;
  
  constructor(eigenaiClient?: EigenAIClient) {
    this.eigenaiClient = eigenaiClient || new MockEigenAIClient();
  }
  
  public async analyze(
    submission: CodeSubmission,
    rubric: z.infer<typeof RubricSchema>,
    layer1Result: Layer1Result,
    seed: number
  ): Promise<z.infer<typeof Layer2ResultSchema>> {
    const combinedCode = submission.code_files
      .map(f => `// File: ${f.file_path}\n${f.content}`)
      .join('\n\n');
    
    const prompts = {
      functionality: `Evaluate the functionality of this code. Does it implement the required features correctly? Score 0-100.`,
      quality: `Evaluate code quality: readability, maintainability, organization. Score 0-100.`,
      bestPractices: `Evaluate adherence to coding best practices and conventions. Score 0-100.`,
      innovation: `Evaluate creativity, unique solutions, and innovative approaches. Score 0-100.`
    };
    
    const [funcResult, qualityResult, practicesResult, innovationResult] = await Promise.all([
      this.eigenaiClient.analyze(combinedCode, prompts.functionality, seed),
      this.eigenaiClient.analyze(combinedCode, prompts.quality, seed + 1),
      this.eigenaiClient.analyze(combinedCode, prompts.bestPractices, seed + 2),
      this.eigenaiClient.analyze(combinedCode, prompts.innovation, seed + 3)
    ]);
    
    const functionalityScore = this.adjustForLayer1(funcResult.score, layer1Result);
    const qualityScore = qualityResult.score;
    const bestPracticesScore = practicesResult.score;
    const innovationScore = innovationResult.score;
    
    const weightedScore = this.calculateWeightedScore(
      functionalityScore,
      qualityScore,
      bestPracticesScore,
      innovationScore,
      rubric
    );
    
    const feedback = this.combineFeedback([
      funcResult.feedback,
      qualityResult.feedback,
      practicesResult.feedback,
      innovationResult.feedback
    ]);
    
    const suggestions = [
      ...funcResult.suggestions,
      ...qualityResult.suggestions,
      ...practicesResult.suggestions,
      ...innovationResult.suggestions
    ].slice(0, 10);
    
    return Layer2ResultSchema.parse({
      functionality_score: functionalityScore,
      quality_score: qualityScore,
      best_practices_score: bestPracticesScore,
      innovation_score: innovationScore,
      weighted_score: weightedScore,
      feedback,
      suggestions
    });
  }
  
  private adjustForLayer1(score: number, layer1Result: Layer1Result): number {
    let adjusted = score;
    
    if (!layer1Result.passed) {
      adjusted = Math.max(0, score - 30);
    }
    
    if (layer1Result.security_violations.length > 0) {
      adjusted = Math.max(0, adjusted - (layer1Result.security_violations.length * 15));
    }
    
    if (layer1Result.syntax_errors.length > 0) {
      adjusted = Math.max(0, adjusted - (layer1Result.syntax_errors.length * 10));
    }
    
    return adjusted;
  }
  
  private calculateWeightedScore(
    functionality: number,
    quality: number,
    bestPractices: number,
    innovation: number,
    rubric: z.infer<typeof RubricSchema>
  ): number {
    const weighted = 
      (functionality * rubric.functionality_weight) +
      (quality * rubric.quality_weight) +
      (bestPractices * rubric.best_practices_weight) +
      (innovation * rubric.innovation_weight);
    
    return Math.round(weighted);
  }
  
  private combineFeedback(feedbacks: string[]): string {
    return feedbacks.join(' ');
  }
}

import * as z from 'zod';
