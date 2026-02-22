import { keccak256, toUtf8Bytes } from 'ethers';
import { agentLogger } from '../utils/logger';

export interface DifficultyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  timeMinutes: number;
}

export interface Challenge {
  challengeId: string;
  topic: string;
  difficulty: DifficultyLevel;
  question: string;
  attemptNumber: number;
  seed: string;
  expectedKeywords?: string[];
  createdAt: string;
  deadline: string;
}

export class ArchitectAgent {
  private readonly DIFFICULTY_LEVELS: DifficultyLevel[] = [
    { level: 1, name: 'Beginner', timeMinutes: 15 },
    { level: 2, name: 'Intermediate', timeMinutes: 30 },
    { level: 3, name: 'Advanced', timeMinutes: 45 },
    { level: 4, name: 'Expert', timeMinutes: 60 },
    { level: 5, name: 'Master', timeMinutes: 90 },
  ];

  constructor() {
    agentLogger.info({ type: 'ArchitectAgent' }, 'ArchitectAgent initialized');
  }

  public generateChallengeId(
    userAddress: string,
    topic: string,
    attemptNumber: number
  ): string {
    const seed = this.computeSeed(userAddress, topic, attemptNumber);
    const challengeId = keccak256(
      toUtf8Bytes(`challenge:${userAddress}:${topic}:${attemptNumber}:${seed}`)
    );
    return challengeId.substring(0, 16);
  }

  private computeSeed(
    userAddress: string,
    topic: string,
    attemptNumber: number
  ): string {
    const seedInput = `${userAddress}:${topic}:${attemptNumber}`;
    return keccak256(toUtf8Bytes(seedInput));
  }

  private seededRandom(seed: string, index: number): number {
    const combinedSeed = keccak256(toUtf8Bytes(`${seed}:${index}`));
    const intValue = parseInt(combinedSeed.substring(2, 10), 16);
    return intValue / 4294967296;
  }

  private selectTopic(seed: string, userTopics?: string[]): string {
    const DEFAULT_TOPICS = [
      'solidity', 'ethersjs', 'react', 'web3', 'hardhat',
      'foundry', 'smart-contracts', 'defi', 'nft', 'dao',
      'cryptography', 'merkle-trees', 'zero-knowledge', 'eip-712',
      'reentrancy', 'gas-optimization', 'security', 'testing'
    ];

    const availableTopics = userTopics && userTopics.length > 0 ? userTopics : DEFAULT_TOPICS;
    const index = Math.floor(this.seededRandom(seed, 0) * availableTopics.length);
    return availableTopics[index];
  }

  private selectDifficulty(seed: string, userLevel?: number): DifficultyLevel {
    const baseIndex = userLevel ? Math.max(0, Math.min(4, userLevel - 1)) : 0;
    const variation = Math.floor(this.seededRandom(seed, 1) * 3) - 1;
    const finalIndex = Math.max(0, Math.min(4, baseIndex + variation));
    return this.DIFFICULTY_LEVELS[finalIndex];
  }

  private selectQuestionTemplate(seed: string, topic: string): string {
    const templates = [
      `Explain the core concept of ${topic} and provide a code example.`,
      `What are the security considerations when working with ${topic}?`,
      `Describe a common pitfall with ${topic} and how to avoid it.`,
      `How would you optimize a system that heavily uses ${topic}?`,
      `Compare ${topic} with an alternative approach in a real-world scenario.`,
    ];

    const index = Math.floor(this.seededRandom(seed, 2) * templates.length);
    return templates[index];
  }

  private generateDeadline(difficulty: DifficultyLevel): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + difficulty.timeMinutes);
    return now.toISOString();
  }

  public async generateChallenge(
    userAddress: string,
    topic?: string,
    attemptNumber: number = 1,
    userLevel?: number
  ): Promise<Challenge> {
    agentLogger.info(
      { userAddress, topic, attemptNumber, userLevel },
      'Generating challenge'
    );

    const seed = this.computeSeed(userAddress, topic || 'auto', attemptNumber);
    const selectedTopic = topic || this.selectTopic(seed);
    const difficulty = this.selectDifficulty(seed, userLevel);
    const question = this.selectQuestionTemplate(seed, selectedTopic);
    const challengeId = this.generateChallengeId(userAddress, selectedTopic, attemptNumber);

    const challenge: Challenge = {
      challengeId,
      topic: selectedTopic,
      difficulty,
      question,
      attemptNumber,
      seed,
      createdAt: new Date().toISOString(),
      deadline: this.generateDeadline(difficulty),
    };

    agentLogger.info(
      { challengeId, topic: selectedTopic, difficulty: difficulty.level },
      'Challenge generated'
    );

    return challenge;
  }

  public async generateMultipleChallenges(
    userAddress: string,
    topics: string[],
    attemptNumber: number = 1,
    userLevel?: number
  ): Promise<Challenge[]> {
    agentLogger.info(
      { userAddress, topics, count: topics.length },
      'Generating multiple challenges'
    );

    const challenges = await Promise.all(
      topics.map((topic) =>
        this.generateChallenge(userAddress, topic, attemptNumber, userLevel)
      )
    );

    agentLogger.info(
      { count: challenges.length },
      'Multiple challenges generated'
    );

    return challenges;
  }

  public verifyChallengeReplayability(
    challenge: Challenge,
    userAddress: string,
    topic: string,
    attemptNumber: number
  ): boolean {
    const expectedSeed = this.computeSeed(userAddress, topic, attemptNumber);
    const expectedChallengeId = this.generateChallengeId(userAddress, topic, attemptNumber);

    return (
      challenge.seed === expectedSeed &&
      challenge.challengeId === expectedChallengeId
    );
  }

  public getDifficultyLevels(): DifficultyLevel[] {
    return this.DIFFICULTY_LEVELS;
  }
}
