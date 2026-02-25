import { logger } from '../utils/logger';
import { SessionState, MilestoneScore, CodeFile } from '../agents/types/delegation.types';

interface UserHistory {
  userAddress: string;
  certificates: Certificate[];
  submissions: CodeSubmission[];
  scores: number[];
  completedModules: string[];
  totalScore: number;
  averageScore: number;
  lastActivity: Date;
  createdAt: Date;
}

interface Certificate {
  tokenId: string;
  title: string;
  completedAt: number;
  ipfsHash?: string;
}

interface CodeSubmission {
  sessionId: string;
  milestoneId: number;
  code: string;
  codeHash: string;
  timestamp: number;
  feedback?: string;
  score?: number;
  ipfsHash?: string;
}

export class HistoryTracker {
  private history: Map<string, UserHistory> = new Map();

  recordSubmission(
    userAddress: string,
    sessionId: string,
    milestoneId: number,
    code: string,
    codeHash: string
  ): void {
    logger.info({ 
      userAddress, 
      sessionId, 
      milestoneId 
    }, 'HistoryTracker: Recording submission');

    let history = this.getUserHistory(userAddress);

    const submission: CodeSubmission = {
      sessionId,
      milestoneId,
      code,
      codeHash,
      timestamp: Date.now()
    };

    history.submissions.push(submission);
    history.lastActivity = new Date();

    this.history.set(userAddress.toLowerCase(), history);
  }

  recordScore(
    userAddress: string,
    sessionId: string,
    milestoneId: number,
    score: number,
    feedback: string
  ): void {
    logger.info({
      userAddress,
      sessionId,
      milestoneId,
      score
    }, 'HistoryTracker: Recording score');

    let history = this.getUserHistory(userAddress);

    const submission = history.submissions.find(
      s => s.sessionId === sessionId && s.milestoneId === milestoneId
    );

    if (submission) {
      submission.score = score;
      submission.feedback = feedback;
    }

    history.scores.push(score);
    history.totalScore += score;
    history.averageScore = history.totalScore / history.scores.length;

    this.history.set(userAddress.toLowerCase(), history);
  }

  /**
   * Record checkpoint with IPFS hash
   */
  recordCheckpoint(
    userAddress: string,
    sessionId: string,
    milestoneId: number,
    ipfsHash: string,
    score: number
  ): void {
    logger.info({ 
      userAddress, 
      sessionId, 
      milestoneId,
      ipfsHash 
    }, 'HistoryTracker: Recording checkpoint with IPFS hash');

    let history = this.getUserHistory(userAddress);

    const submission = history.submissions.find(
      s => s.sessionId === sessionId && s.milestoneId === milestoneId
    );

    if (submission) {
      submission.ipfsHash = ipfsHash;
      submission.score = score;
    }

    history.lastActivity = new Date();

    this.history.set(userAddress.toLowerCase(), history);
  }

  recordCertificate(
    userAddress: string,
    tokenId: string,
    title: string,
    completedAt: number,
    ipfsHash?: string
  ): void {
    logger.info({ 
      userAddress, 
      tokenId, 
      title 
    }, 'HistoryTracker: Recording certificate');

    let history = this.getUserHistory(userAddress);

    const certificate: Certificate = {
      tokenId,
      title,
      completedAt,
      ipfsHash
    };

    history.certificates.push(certificate);
    history.completedModules.push(title);
    history.lastActivity = new Date();

    this.history.set(userAddress.toLowerCase(), history);
  }

  recordCodeFile(
    userAddress: string,
    sessionId: string,
    filePath: string,
    content: string
  ): void {
    logger.info({ 
      userAddress, 
      sessionId, 
      filePath 
    }, 'HistoryTracker: Recording code file');

    let history = this.getUserHistory(userAddress);

    history.submissions.forEach(sub => {
      if (sub.sessionId === sessionId) {
        sub.code += `\n\n// ${filePath}\n${content}`;
      }
    });

    this.history.set(userAddress.toLowerCase(), history);
  }

  getUserHistory(userAddress: string): UserHistory {
    const normalizedAddress = userAddress.toLowerCase();
    
    if (!this.history.has(normalizedAddress)) {
      const newHistory: UserHistory = {
        userAddress,
        certificates: [],
        submissions: [],
        scores: [],
        completedModules: [],
        totalScore: 0,
        averageScore: 0,
        lastActivity: new Date(),
        createdAt: new Date()
      };
      this.history.set(normalizedAddress, newHistory);
      return newHistory;
    }

    return this.history.get(normalizedAddress)!;
  }

  getUserCertificates(userAddress: string): Certificate[] {
    return this.getUserHistory(userAddress).certificates;
  }

  getUserSubmissions(userAddress: string): CodeSubmission[] {
    return this.getUserHistory(userAddress).submissions;
  }

  getUserScores(userAddress: string): number[] {
    return this.getUserHistory(userAddress).scores;
  }

  getUserAverageScore(userAddress: string): number {
    return this.getUserHistory(userAddress).averageScore;
  }

  getAllUsers(): UserHistory[] {
    return Array.from(this.history.values()).sort((a, b) => 
      b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  getTopPerformers(limit: number = 10): UserHistory[] {
    return this.getAllUsers()
      .filter(h => h.averageScore > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, limit);
  }

  getRecentActivity(limit: number = 20): UserHistory[] {
    return this.getAllUsers().slice(0, limit);
  }

  exportToCSV(): string {
    const users = this.getAllUsers();
    
    const headers = [
      'User Address',
      'Certificates Count',
      'Submissions Count',
      'Total Score',
      'Average Score',
      'Completed Modules',
      'Last Activity'
    ];

    const rows = users.map(user => [
      user.userAddress,
      user.certificates.length,
      user.submissions.length,
      user.totalScore.toFixed(2),
      user.averageScore.toFixed(2),
      user.completedModules.join('; '),
      user.lastActivity.toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  exportToJSON(): string {
    const users = this.getAllUsers();
    return JSON.stringify(users, null, 2);
  }

  getUserSessionHistory(userAddress: string, sessionId: string): CodeSubmission[] {
    return this.getUserSubmissions(userAddress).filter(
      sub => sub.sessionId === sessionId
    );
  }

  cleanupOldHistory(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let cleanedCount = 0;

    for (const [address, history] of this.history.entries()) {
      const activeSubmissions = history.submissions.filter(
        sub => new Date(sub.timestamp) > cutoffDate
      );

      if (activeSubmissions.length === 0 && history.certificates.length === 0) {
        this.history.delete(address);
        cleanedCount++;
      } else {
        history.submissions = activeSubmissions;
        this.history.set(address, history);
      }
    }

    logger.info({ 
      cleanedCount, 
      remainingUsers: this.history.size 
    }, 'HistoryTracker: Old history cleaned');
  }

  getStatistics(): {
    totalUsers: number;
    totalSubmissions: number;
    totalCertificates: number;
    averageScore: number;
    topScore: number;
  } {
    const users = this.getAllUsers();
    
    if (users.length === 0) {
      return {
        totalUsers: 0,
        totalSubmissions: 0,
        totalCertificates: 0,
        averageScore: 0,
        topScore: 0
      };
    }

    const allScores = users.flatMap(u => u.scores);
    const topScore = Math.max(...allScores, 0);
    const averageScore = allScores.length > 0 
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
      : 0;

    return {
      totalUsers: users.length,
      totalSubmissions: users.reduce((sum, u) => sum + u.submissions.length, 0),
      totalCertificates: users.reduce((sum, u) => sum + u.certificates.length, 0),
      averageScore,
      topScore
    };
  }
}
