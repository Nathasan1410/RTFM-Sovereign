export interface RoadmapResponse {
  title: string;
  modules: RoadmapModule[];
}

export interface RoadmapModule {
  order: number;
  title: string;
  context: string;
  docs: Doc[];
  challenge: string;
  verificationCriteria: string[];
  groundTruth: string;
  starterCode: string;
}

export interface Doc {
  title: string;
  url: string;
}

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
  expectedKeywords?: string[];
}

export interface LLMProvider {
  generateChallenge(userAddress: string, topic: string, seed?: number): Promise<Challenge>;
  generateRoadmap(userAddress: string, topic: string, seed?: number): Promise<RoadmapResponse>;
  generateJson(prompt: string): Promise<any>;
  name: string;
  isHealthy(): Promise<boolean>;
}
