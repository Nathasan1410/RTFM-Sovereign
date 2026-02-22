export interface Challenge {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  modules: Module[];
}

export interface Module {
  id: number;
  difficulty: 'easy' | 'medium' | 'hard';
  weight: number;
  questions: Question[];
}

export interface Question {
  id: string;
  prompt: string;
  expectedPoints: number;
  expectedKeywords?: string[]; // For grading
}

export interface LLMProvider {
  generateChallenge(userAddress: string, topic: string, seed?: number): Promise<Challenge>;
  name: string;
  isHealthy(): Promise<boolean>;
}
