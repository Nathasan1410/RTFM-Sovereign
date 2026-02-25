import { DeploymentChunk, DeploymentState, ChunkStatus } from './types';
import fs from 'fs';
import path from 'path';

export class ChunkManager {
  private state: DeploymentState;
  private stateFilePath: string;

  constructor(network: string, chainId: number, deployerAddress: string, stateDir: string = './deployment-state') {
    this.stateFilePath = path.join(stateDir, `${network}.json`);
    this.state = this.loadState() || this.createInitialState(network, chainId, deployerAddress);
  }

  private createInitialState(network: string, chainId: number, deployerAddress: string): DeploymentState {
    return {
      chunks: this.createChunks(),
      currentChunk: 0,
      network,
      chainId,
      deployerAddress,
      contracts: {},
      startTime: Date.now(),
      success: false
    };
  }

  private createChunks(): DeploymentChunk[] {
    return [
      {
        id: 1,
        name: 'Compile Contracts',
        description: 'Compile Solidity contracts using Hardhat/Foundry',
        dependencies: [],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: true
      },
      {
        id: 2,
        name: 'Estimate Gas',
        description: 'Estimate gas costs for contract deployments',
        dependencies: [1],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: false
      },
      {
        id: 3,
        name: 'Deploy Attestation Contract',
        description: 'Deploy SkillAttestation contract to blockchain',
        dependencies: [1, 2],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: true
      },
      {
        id: 4,
        name: 'Verify Attestation Deployment',
        description: 'Verify Attestation contract deployment',
        dependencies: [3],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: true
      },
      {
        id: 5,
        name: 'Deploy Staking Contract',
        description: 'Deploy SkillStaking contract to blockchain',
        dependencies: [1, 2, 4],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: true
      },
      {
        id: 6,
        name: 'Verify Staking Deployment',
        description: 'Verify Staking contract deployment',
        dependencies: [5],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: true
      },
      {
        id: 7,
        name: 'Register Contracts in TEE Server',
        description: 'Update TEE server configuration with new contract addresses',
        dependencies: [4, 6],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: false
      },
      {
        id: 8,
        name: 'Test Contract Interactions',
        description: 'Execute contract functions with test data',
        dependencies: [4, 6],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: false
      },
      {
        id: 9,
        name: 'Update Environment Configuration',
        description: 'Update .env and config files with new addresses',
        dependencies: [7],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 3,
        isCritical: false
      },
      {
        id: 10,
        name: 'Generate Deployment Report',
        description: 'Generate comprehensive deployment report',
        dependencies: [8, 9],
        status: 'pending',
        startTime: 0,
        retryCount: 0,
        maxRetries: 1,
        isCritical: false
      }
    ];
  }

  public getState(): DeploymentState {
    return this.state;
  }

  public updateChunk(chunkId: number, updates: Partial<DeploymentChunk>): void {
    const chunk = this.state.chunks.find(c => c.id === chunkId);
    if (chunk) {
      Object.assign(chunk, updates);
      this.saveState();
    }
  }

  public markChunkInProgress(chunkId: number): void {
    this.updateChunk(chunkId, {
      status: 'in_progress',
      startTime: Date.now()
    });
  }

  public markChunkCompleted(chunkId: number, output?: any, gasUsed?: number, txHash?: string): void {
    const chunk = this.state.chunks.find(c => c.id === chunkId);
    if (chunk) {
      const endTime = Date.now();
      this.updateChunk(chunkId, {
        status: 'completed',
        endTime,
        duration: endTime - chunk.startTime,
        output,
        gasUsed,
        transactionHash: txHash
      });
    }
  }

  public markChunkFailed(chunkId: number, error: string): void {
    const chunk = this.state.chunks.find(c => c.id === chunkId);
    if (chunk) {
      const endTime = Date.now();
      this.updateChunk(chunkId, {
        status: 'failed',
        endTime,
        duration: endTime - chunk.startTime,
        error,
        retryCount: chunk.retryCount + 1
      });
    }
  }

  public markChunkSkipped(chunkId: number, reason: string): void {
    const chunk = this.state.chunks.find(c => c.id === chunkId);
    if (chunk) {
      const endTime = Date.now();
      this.updateChunk(chunkId, {
        status: 'skipped',
        endTime,
        duration: endTime - chunk.startTime,
        output: { reason }
      });
    }
  }

  public canExecuteChunk(chunkId: number): boolean {
    const chunk = this.state.chunks.find(c => c.id === chunkId);
    if (!chunk) return false;

    if (chunk.status === 'completed' || chunk.status === 'skipped') {
      return false;
    }

    if (chunk.status === 'failed' && chunk.retryCount >= chunk.maxRetries) {
      return false;
    }

    for (const depId of chunk.dependencies) {
      const depChunk = this.state.chunks.find(c => c.id === depId);
      if (!depChunk || depChunk.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  public getNextExecutableChunk(): DeploymentChunk | null {
    for (const chunk of this.state.chunks) {
      if (this.canExecuteChunk(chunk.id)) {
        return chunk;
      }
    }
    return null;
  }

  public hasFailedCriticalChunk(): boolean {
    return this.state.chunks.some(
      chunk => chunk.isCritical && chunk.status === 'failed' && chunk.retryCount >= chunk.maxRetries
    );
  }

  public setContractInfo(contractType: 'attestation' | 'staking', info: any): void {
    this.state.contracts[contractType] = info;
    this.saveState();
  }

  public markDeploymentComplete(success: boolean): void {
    this.state.endTime = Date.now();
    this.state.totalDuration = this.state.endTime - this.state.startTime;
    this.state.success = success;
    this.saveState();
  }

  private saveState(): void {
    const stateDir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  private loadState(): DeploymentState | null {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        return JSON.parse(data) as DeploymentState;
      }
    } catch (error) {
      console.warn('Failed to load deployment state:', error);
    }
    return null;
  }

  public resetState(): void {
    if (fs.existsSync(this.stateFilePath)) {
      fs.unlinkSync(this.stateFilePath);
    }
    this.state = this.createInitialState(
      this.state.network,
      this.state.chainId,
      this.state.deployerAddress
    );
  }

  public getSummary(): string {
    const completed = this.state.chunks.filter(c => c.status === 'completed').length;
    const failed = this.state.chunks.filter(c => c.status === 'failed').length;
    const skipped = this.state.chunks.filter(c => c.status === 'skipped').length;
    const total = this.state.chunks.length;

    return `
Deployment Summary:
- Network: ${this.state.network} (Chain ID: ${this.state.chainId})
- Deployer: ${this.state.deployerAddress}
- Progress: ${completed}/${total} chunks completed
- Failed: ${failed} chunks
- Skipped: ${skipped} chunks
- Duration: ${this.state.totalDuration ? `${(this.state.totalDuration / 1000).toFixed(2)}s` : 'In progress'}
`.trim();
  }
}
