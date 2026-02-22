import { keccak256, toUtf8Bytes } from 'ethers';
import { agentLogger } from '../utils/logger';
import { LLMService } from '../services/llm/LLMService';
import { Challenge as LLMChallenge, RoadmapResponse } from '../services/llm/types';

export interface Challenge extends LLMChallenge {
  challengeId: string;
  attemptNumber: number;
  seed: string;
  createdAt: string;
  deadline: string;
}

export class ArchitectAgent {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    agentLogger.info({ type: 'ArchitectAgent' }, 'ArchitectAgent initialized with LLM Service');
  }

  public async generateChallenge(
    userAddress: string,
    topic: string,
    attemptNumber: number = 1
  ): Promise<Challenge> {
    agentLogger.info({ userAddress, topic, attemptNumber }, 'Generating AI challenge');

    // 1. Compute Deterministic Seed
    // seed = keccak256(user + topic + attempt)
    const seedString = `${userAddress}:${topic}:${attemptNumber}`;
    const seedHash = keccak256(toUtf8Bytes(seedString));
    // AI providers need integer seed. Take first 8 chars (32 bits)
    const seedInt = parseInt(seedHash.substring(2, 10), 16); 

    // 2. Call LLM Service (EigenAI -> Groq Fallback)
    const llmChallenge = await this.llmService.generateChallenge(userAddress, topic, seedInt);

    // 3. Enrich with Metadata
    const challenge: Challenge = {
      ...llmChallenge,
      challengeId: seedHash.substring(0, 16), // Use hash as ID
      attemptNumber,
      seed: seedHash,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h deadline
    };

    agentLogger.info({ challengeId: challenge.challengeId, provider: 'LLMService' }, 'Challenge generated');

    return challenge;
  }

  public async generateRoadmap(
    userAddress: string,
    topic: string,
    attemptNumber: number = 1
  ): Promise<RoadmapResponse> {
    agentLogger.info({ userAddress, topic, attemptNumber }, 'Generating AI roadmap');

    // 1. Compute Deterministic Seed
    const seedString = `${userAddress}:${topic}:${attemptNumber}`;
    const seedHash = keccak256(toUtf8Bytes(seedString));
    const seedInt = parseInt(seedHash.substring(2, 10), 16);

    // 2. Call LLM Service (EigenAI -> Groq Fallback)
    const roadmap = await this.llmService.generateRoadmap(userAddress, topic, seedInt);

    agentLogger.info({ userAddress, topic, provider: 'LLMService' }, 'Roadmap generated');

    return roadmap;
  }
}
