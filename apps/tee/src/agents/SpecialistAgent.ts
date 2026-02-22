import { agentLogger } from '../utils/logger';

export interface EvaluationCriteria {
  accuracy: number;
  completeness: number;
  technicalDepth: number;
  clarity: number;
}

export interface EvaluationResult {
  score: number;
  criteria: EvaluationCriteria;
  feedback: string;
  passed: boolean;
  evaluatedAt: string;
}

export interface Answer {
  challengeId: string;
  userAddress: string;
  topic: string;
  question: string;
  answer: string;
  attemptNumber: number;
  timestamp: string;
}

export class SpecialistAgent {
  private readonly SCORE_THRESHOLD = 70;

  constructor() {
    agentLogger.info({ type: 'SpecialistAgent' }, 'SpecialistAgent initialized');
  }

  public async evaluateAnswer(answer: Answer): Promise<EvaluationResult> {
    agentLogger.info(
      { challengeId: answer.challengeId, userAddress: answer.userAddress },
      'Evaluating answer'
    );

    const evaluation = this.computeEvaluation(answer);
    const score = this.calculateFinalScore(evaluation);

    const result: EvaluationResult = {
      score,
      criteria: evaluation,
      feedback: this.generateFeedback(evaluation, score),
      passed: score >= this.SCORE_THRESHOLD,
      evaluatedAt: new Date().toISOString(),
    };

    agentLogger.info(
      { score, passed: result.passed },
      'Answer evaluation completed'
    );

    return result;
  }

  private computeEvaluation(answer: Answer): EvaluationCriteria {
    const answerLower = answer.answer.toLowerCase();
    const answerLength = answer.answer.length;

    let accuracy = 0;
    let completeness = 0;
    let technicalDepth = 0;
    let clarity = 0;

    const technicalKeywords = this.getTopicKeywords(answer.topic);
    const keywordMatches = technicalKeywords.filter(keyword =>
      answerLower.includes(keyword.toLowerCase())
    );

    accuracy = Math.min(100, (keywordMatches.length / Math.max(1, technicalKeywords.length * 0.7)) * 100);

    completeness = Math.min(100, Math.max(30, (answerLength / 500) * 100));
    if (answerLength > 800) completeness = 100;

    const codeBlockRegex = /```[\s\S]*?```/g;
    const hasCode = codeBlockRegex.test(answer.answer);
    if (hasCode) {
      technicalDepth += 30;
    }

    const codeLineRegex = /(\/\/|\/\*|\*\/|function|class|interface|import|export|const|let|var)/g;
    const codeLines = answerLower.match(codeLineRegex);
    if (codeLines && codeLines.length > 5) {
      technicalDepth += 20;
    }

    const technicalTerms = ['implementation', 'security', 'optimization', 'pattern', 'architecture'];
    const technicalTermMatches = technicalTerms.filter(term =>
      answerLower.includes(term)
    );
    technicalDepth += Math.min(30, technicalTermMatches.length * 10);

    technicalDepth = Math.min(100, technicalDepth + 20);

    const sentenceRegex = /[.!?]+\s+/g;
    const sentences = answer.answer.split(sentenceRegex).filter(s => s.trim().length > 0);
    clarity = Math.min(100, sentences.length * 10);

    const avgWordLength = this.calculateAverageWordLength(answer.answer);
    if (avgWordLength >= 4 && avgWordLength <= 7) {
      clarity += 10;
    }

    clarity = Math.min(100, clarity);

    return {
      accuracy,
      completeness,
      technicalDepth,
      clarity,
    };
  }

  private getTopicKeywords(topic: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'solidity': ['contract', 'function', 'modifier', 'mapping', 'event', 'address', 'uint', 'memory', 'storage', 'payable'],
      'ethersjs': ['provider', 'signer', 'contract', 'wallet', 'jsonrpc', 'provider', 'parseether', 'formatether', 'abicodec'],
      'react': ['component', 'state', 'useeffect', 'usestate', 'props', 'jsx', 'hook', 'render', 'virtualdom', 'reconciliation'],
      'web3': ['blockchain', 'decentralized', 'smart contract', 'wallet', 'metamask', 'provider', 'network', 'rpc', 'eth'],
      'hardhat': ['task', 'test', 'deploy', 'network', 'hre', 'ethers', 'compile', 'mocha', 'chai', 'fixture'],
      'foundry': ['forge', 'test', 'deploy', 'cheatcode', 'vm', 'console', 'assert', 'assume', 'prank', 'warp'],
      'smart-contracts': ['function', 'state', 'event', 'modifier', 'gas', 'block', 'transaction', 'address', 'mapping'],
      'defi': ['liquidity', 'swap', 'pool', 'token', 'dex', 'amm', 'oracle', 'yield', 'farming', 'lending'],
      'nft': ['tokenid', 'metadata', 'erc721', 'erc1155', 'royalty', 'marketplace', 'mint', 'transfer', 'approve'],
      'dao': ['proposal', 'voting', 'governance', 'token', 'quorum', 'timelock', 'delegate', 'execute', 'vote'],
      'cryptography': ['hash', 'signature', 'encryption', 'privatekey', 'publickey', 'ecdsa', 'keccak', 'merkle', 'proof'],
      'merkle-trees': ['merkleproof', 'root', 'leaf', 'hash', 'tree', 'verify', 'path', 'index', 'branch'],
      'zero-knowledge': ['proof', 'circuit', 'snark', 'stark', 'verifier', 'prover', 'witness', 'commitment', 'opening'],
      'eip-712': ['typeddata', 'domain', 'types', 'value', 'sign', 'verify', 'message', 'signature', 'replay'],
      'reentrancy': ['reentrancy', 'call', 'transfer', 'send', 'checks-effects-interactions', 'mutex', 'nonreentrant'],
      'gas-optimization': ['gas', 'optimization', 'storage', 'memory', 'calldata', 'pack', 'unchecked', 'loop', 'sstore'],
      'security': ['security', 'vulnerability', 'exploit', 'audit', 'bug', 'hacks', 'safemath', 'accesscontrol', 'overflow'],
      'testing': ['test', 'assert', 'expect', 'mock', 'stub', 'coverage', 'snapshot', 'revert', 'unit', 'integration'],
    };

    return keywordMap[topic.toLowerCase()] || [];
  }

  private calculateAverageWordLength(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;

    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
  }

  private calculateFinalScore(criteria: EvaluationCriteria): number {
    const weights = {
      accuracy: 0.3,
      completeness: 0.25,
      technicalDepth: 0.25,
      clarity: 0.2,
    };

    const score =
      criteria.accuracy * weights.accuracy +
      criteria.completeness * weights.completeness +
      criteria.technicalDepth * weights.technicalDepth +
      criteria.clarity * weights.clarity;

    return Math.round(score);
  }

  private generateFeedback(criteria: EvaluationCriteria, score: number): string {
    const feedback: string[] = [];

    if (criteria.accuracy >= 80) {
      feedback.push('Excellent coverage of key technical concepts.');
    } else if (criteria.accuracy >= 60) {
      feedback.push('Good understanding, but some key concepts were missing.');
    } else {
      feedback.push('More coverage of technical concepts needed.');
    }

    if (criteria.completeness >= 80) {
      feedback.push('Comprehensive and thorough explanation.');
    } else if (criteria.completeness >= 60) {
      feedback.push('Reasonable depth, could be more detailed.');
    } else {
      feedback.push('Explanation lacks depth and detail.');
    }

    if (criteria.technicalDepth >= 80) {
      feedback.push('Strong technical knowledge demonstrated.');
    } else if (criteria.technicalDepth >= 60) {
      feedback.push('Good technical understanding shown.');
    } else {
      feedback.push('More technical depth and examples needed.');
    }

    if (criteria.clarity >= 80) {
      feedback.push('Clear and well-structured response.');
    } else if (criteria.clarity >= 60) {
      feedback.push('Mostly clear, but could be better structured.');
    } else {
      feedback.push('Response could be clearer and more organized.');
    }

    if (score >= this.SCORE_THRESHOLD) {
      feedback.push('Overall: Pass - Meets the required standard.');
    } else {
      feedback.push('Overall: Fail - Below the required threshold.');
    }

    return feedback.join(' ');
  }

  public getScoreThreshold(): number {
    return this.SCORE_THRESHOLD;
  }

  public async evaluateMultipleAnswers(answers: Answer[]): Promise<EvaluationResult[]> {
    agentLogger.info({ count: answers.length }, 'Evaluating multiple answers');

    const results = await Promise.all(
      answers.map((answer) => this.evaluateAnswer(answer))
    );

    agentLogger.info({ count: results.length }, 'Multiple answers evaluated');

    return results;
  }
}
