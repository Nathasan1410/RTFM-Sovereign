import { execSync } from 'child_process';
import { ChunkManager } from './chunk-manager';
import { ContractDeployer } from './contract-deployer';
import { ContractVerifier } from './verifier';
import { ContractTester } from './contract-tester';
import { DeploymentReporter } from './deployment-reporter';
import { DeploymentConfig, NetworkConfig } from './types';
import hre from 'hardhat';
import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io'
  },
  localhost: {
    name: 'localhost',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545'
  }
};

export class DeploymentOrchestrator {
  private chunkManager: ChunkManager;
  private deployer: ContractDeployer;
  private verifier: ContractVerifier;
  private tester: ContractTester;
  private reporter: DeploymentReporter;
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
    const network = NETWORKS[config.network.name] || config.network;

    this.chunkManager = new ChunkManager(
      network.name,
      network.chainId,
      '', 
      './deployment-state'
    );

    this.deployer = new ContractDeployer(network, config.privateKey);
    this.verifier = new ContractVerifier(network.rpcUrl);
    this.tester = new ContractTester(config.privateKey, network.rpcUrl);
    this.reporter = new DeploymentReporter('./deployment-reports');

    this.chunkManager.getState().deployerAddress = this.deployer.getWalletAddress();
  }

  public async execute(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Smart Contract Deployment with Chunking System              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const balance = await this.deployer.getBalance();
    console.log(`📊 Deployer Balance: ${balance} ETH`);
    console.log(`🌐 Network: ${this.config.network.name} (Chain ID: ${this.config.network.chainId})`);
    console.log(`📝 Deployer: ${this.deployer.getWalletAddress()}`);
    console.log('');

    if (parseFloat(balance) < 0.01) {
      console.warn('⚠️  WARNING: Low balance! Please ensure you have at least 0.01 ETH for deployment.');
    }

    let nextChunk = this.chunkManager.getNextExecutableChunk();
    while (nextChunk) {
      await this.executeChunk(nextChunk);
      nextChunk = this.chunkManager.getNextExecutableChunk();

      if (this.chunkManager.hasFailedCriticalChunk()) {
        console.error('\n❌ Critical chunk failed. Deployment cannot continue.');
        this.chunkManager.markDeploymentComplete(false);
        await this.generateReport();
        process.exit(1);
      }
    }

    const success = !this.chunkManager.hasFailedCriticalChunk();
    this.chunkManager.markDeploymentComplete(success);
    await this.generateReport();

    if (success) {
      console.log('\n✅ Deployment completed successfully!');
    } else {
      console.log('\n❌ Deployment completed with errors.');
    }
  }

  private async executeChunk(chunk: any): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Chunk ${chunk.id}: ${chunk.name}`);
    console.log(`📄 ${chunk.description}`);
    console.log(`${'='.repeat(60)}`);

    this.chunkManager.markChunkInProgress(chunk.id);

    try {
      switch (chunk.id) {
        case 1:
          await this.executeCompileChunk(chunk);
          break;
        case 2:
          await this.executeGasEstimateChunk(chunk);
          break;
        case 3:
          await this.executeDeployAttestationChunk(chunk);
          break;
        case 4:
          await this.executeVerifyAttestationChunk(chunk);
          break;
        case 5:
          await this.executeDeployStakingChunk(chunk);
          break;
        case 6:
          await this.executeVerifyStakingChunk(chunk);
          break;
        case 7:
          await this.executeRegisterContractsChunk(chunk);
          break;
        case 8:
          await this.executeTestContractsChunk(chunk);
          break;
        case 9:
          await this.executeUpdateConfigChunk(chunk);
          break;
        case 10:
          await this.executeGenerateReportChunk(chunk);
          break;
        default:
          throw new Error(`Unknown chunk ID: ${chunk.id}`);
      }

      this.chunkManager.markChunkCompleted(chunk.id);
      console.log(`\n✅ Chunk ${chunk.id} completed successfully`);

    } catch (error: any) {
      console.error(`\n❌ Chunk ${chunk.id} failed:`, error.message);
      this.chunkManager.markChunkFailed(chunk.id, error.message);

      if (chunk.isCritical && chunk.retryCount >= chunk.maxRetries) {
        throw error;
      }

      if (chunk.retryCount < chunk.maxRetries) {
        console.log(`🔄 Retrying chunk ${chunk.id} (Attempt ${chunk.retryCount + 1}/${chunk.maxRetries})...`);
      }
    }
  }

  private async executeCompileChunk(chunk: any): Promise<void> {
    console.log('\n🔨 Compiling contracts...');

    try {
      await hre.run('compile');
      console.log('✅ Compilation successful');

      const stakingArtifact = await hre.artifacts.readArtifact('SkillStaking');
      const attestationArtifact = await hre.artifacts.readArtifact('SkillAttestation');

      if (!stakingArtifact.abi || !stakingArtifact.bytecode) {
        throw new Error('SkillStaking compilation failed');
      }
      if (!attestationArtifact.abi || !attestationArtifact.bytecode) {
        throw new Error('SkillAttestation compilation failed');
      }

      console.log('✅ All ABIs verified');

      chunk.output = {
        staking: { abi: stakingArtifact.abi, bytecode: stakingArtifact.bytecode },
        attestation: { abi: attestationArtifact.abi, bytecode: attestationArtifact.bytecode }
      };

    } catch (error) {
      throw new Error(`Compilation failed: ${error}`);
    }
  }

  private async executeGasEstimateChunk(chunk: any): Promise<void> {
    console.log('\n⛽ Estimating gas costs...');

    const state = this.chunkManager.getState();
    const compileOutput = state.chunks[0].output;

    if (!compileOutput) {
      throw new Error('No compilation output found. Run chunk 1 first.');
    }

    const deployer = this.deployer as any;
    const stakingEstimate = await deployer.estimateDeploymentGas(
      compileOutput.staking.bytecode,
      compileOutput.staking.abi,
      [this.deployer.getWalletAddress()]
    );

    const attestationEstimate = await deployer.estimateDeploymentGas(
      compileOutput.attestation.bytecode,
      compileOutput.attestation.abi,
      [this.deployer.getWalletAddress()]
    );

    const totalGas = stakingEstimate.gasEstimate + attestationEstimate.gasEstimate;
    const totalCost = (parseFloat(stakingEstimate.estimatedCost) + parseFloat(attestationEstimate.estimatedCost)).toFixed(4);

    console.log(`\n=== Gas Estimates ===`);
    console.log(`SkillAttestation: ${stakingEstimate.gasEstimate.toString()} gas (~${stakingEstimate.estimatedCost} ETH)`);
    console.log(`SkillStaking: ${attestationEstimate.gasEstimate.toString()} gas (~${attestationEstimate.estimatedCost} ETH)`);
    console.log(`Total: ${totalGas.toString()} gas (~${totalCost} ETH)`);
    console.log('');

    if (totalGas > 10000000n) {
      console.warn('⚠️  High gas usage detected. Consider contract optimization.');
    }

    chunk.output = {
      staking: stakingEstimate,
      attestation: attestationEstimate,
      total: totalGas,
      totalCost: totalCost
    };
  }

  private async executeDeployAttestationChunk(chunk: any): Promise<void> {
    console.log('\n🚀 Deploying SkillAttestation contract...');

    const state = this.chunkManager.getState();
    const compileOutput = state.chunks[0].output;

    if (!compileOutput) {
      throw new Error('No compilation output found. Run chunk 1 first.');
    }

    const teeSignerAddress = this.config.teeSignerAddress || this.deployer.getWalletAddress();
    console.log(`📝 TEE Signer: ${teeSignerAddress}`);

    const deploymentInfo = await this.deployer.deployContract(
      'SkillAttestation',
      compileOutput.attestation.bytecode,
      compileOutput.attestation.abi,
      [teeSignerAddress]
    );

    chunk.gasUsed = (await this.deployer.getNetworkInfo()).blockNumber;
    chunk.transactionHash = deploymentInfo.transactionHash;

    this.chunkManager.setContractInfo('attestation', deploymentInfo);
    console.log(`✅ SkillAttestation deployed to ${deploymentInfo.address}`);
  }

  private async executeVerifyAttestationChunk(chunk: any): Promise<void> {
    console.log('\n🔍 Verifying SkillAttestation deployment...');

    const state = this.chunkManager.getState();
    const attestationInfo = state.contracts.attestation;

    if (!attestationInfo) {
      throw new Error('No attestation deployment info found.');
    }

    const verified = await this.deployer.verifyContractDeployment(attestationInfo.address);
    if (!verified) {
      throw new Error('Contract code not found at address');
    }

    const expectedFunctions = [
      'submitAttestation',
      'verifyAttestation',
      'getAttestationHistory',
      'updateTEESigner'
    ];

    const expectedEvents = [
      'AttestationSubmitted',
      'TEESignerUpdated'
    ];

    const verificationResult = await this.verifier.verifyContract(
      'SkillAttestation',
      attestationInfo,
      expectedFunctions,
      expectedEvents
    );

    if (!verificationResult.verified) {
      throw new Error('Contract verification failed');
    }

    chunk.output = verificationResult;
    console.log('✅ SkillAttestation verified successfully');
  }

  private async executeDeployStakingChunk(chunk: any): Promise<void> {
    console.log('\n🚀 Deploying SkillStaking contract...');

    const state = this.chunkManager.getState();
    const compileOutput = state.chunks[0].output;

    if (!compileOutput) {
      throw new Error('No compilation output found. Run chunk 1 first.');
    }

    const teeAttestorAddress = this.config.teeSignerAddress || this.deployer.getWalletAddress();
    console.log(`📝 TEE Attestor: ${teeAttestorAddress}`);

    const deploymentInfo = await this.deployer.deployContract(
      'SkillStaking',
      compileOutput.staking.bytecode,
      compileOutput.staking.abi,
      [teeAttestorAddress]
    );

    chunk.gasUsed = (await this.deployer.getNetworkInfo()).blockNumber;
    chunk.transactionHash = deploymentInfo.transactionHash;

    this.chunkManager.setContractInfo('staking', deploymentInfo);
    console.log(`✅ SkillStaking deployed to ${deploymentInfo.address}`);
  }

  private async executeVerifyStakingChunk(chunk: any): Promise<void> {
    console.log('\n🔍 Verifying SkillStaking deployment...');

    const state = this.chunkManager.getState();
    const stakingInfo = state.contracts.staking;

    if (!stakingInfo) {
      throw new Error('No staking deployment info found.');
    }

    const verified = await this.deployer.verifyContractDeployment(stakingInfo.address);
    if (!verified) {
      throw new Error('Contract code not found at address');
    }

    const expectedFunctions = [
      'stake',
      'recordMilestone',
      'claimRefund',
      'withdrawTreasury',
      'updateTEEAttestor'
    ];

    const expectedEvents = [
      'StakeLocked',
      'MilestoneRecorded',
      'RefundClaimed',
      'TEEAttestorUpdated'
    ];

    const verificationResult = await this.verifier.verifyContract(
      'SkillStaking',
      stakingInfo,
      expectedFunctions,
      expectedEvents
    );

    if (!verificationResult.verified) {
      throw new Error('Contract verification failed');
    }

    chunk.output = verificationResult;
    console.log('✅ SkillStaking verified successfully');
  }

  private async executeRegisterContractsChunk(chunk: any): Promise<void> {
    console.log('\n📝 Registering contracts in TEE server configuration...');

    const state = this.chunkManager.getState();
    const { attestation, staking } = state.contracts;

    if (!attestation || !staking) {
      throw new Error('Both contracts must be deployed first');
    }

    console.log(`✓ Attestation: ${attestation.address}`);
    console.log(`✓ Staking: ${staking.address}`);

    chunk.output = {
      registered: true,
      attestationAddress: attestation.address,
      stakingAddress: staking.address
    };

    console.log('✅ Contracts ready for TEE server registration');
    console.log('⚠️  Manual step: Update apps/tee/.env with contract addresses');
  }

  private async executeTestContractsChunk(chunk: any): Promise<void> {
    console.log('\n🧪 Testing contract interactions...');

    const state = this.chunkManager.getState();
    const { attestation, staking } = state.contracts;
    const teeSigner = this.config.teeSignerAddress || this.deployer.getWalletAddress();

    if (!attestation || !staking) {
      throw new Error('Both contracts must be deployed first');
    }

    const testResults: any[] = [];

    try {
      const attestationTests = await this.tester.testAttestationContract(
        attestation.address,
        attestation.abi,
        teeSigner
      );
      testResults.push(...attestationTests);
    } catch (error: any) {
      console.error('Attestation tests failed:', error.message);
    }

    try {
      const stakingTests = await this.tester.testStakingContract(
        staking.address,
        staking.abi,
        teeSigner
      );
      testResults.push(...stakingTests);
    } catch (error: any) {
      console.error('Staking tests failed:', error.message);
    }

    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    console.log(`\n📊 Test Results: ${passed}/${total} passed`);

    if (passed === total) {
      console.log('✅ All tests passed');
    } else {
      console.warn(`⚠️  ${total - passed} test(s) failed`);
    }

    chunk.output = { results: testResults, passed, total };
  }

  private async executeUpdateConfigChunk(chunk: any): Promise<void> {
    console.log('\n⚙️  Updating environment configuration...');

    const state = this.chunkManager.getState();
    const { attestation, staking } = state.contracts;

    if (!attestation || !staking) {
      throw new Error('Both contracts must be deployed first');
    }

    const configPath = path.join(process.cwd(), '..', '..', 'apps', 'tee', '.env.example');
    const webConfigPath = path.join(process.cwd(), '..', '..', 'apps', 'web', '.env.example');

    console.log(`📝 TEE Config Template: ${configPath}`);
    console.log(`📝 Web Config Template: ${webConfigPath}`);

    const envUpdates = `
# Contract Addresses (Auto-generated by deployment)
CONTRACT_ATTESTATION=${attestation.address}
CONTRACT_STAKING=${staking.address}

# Deployment Info
CHAIN_ID=${this.config.network.chainId}
DEPLOYMENT_TIME=${new Date().toISOString()}
`.trim();

    chunk.output = { envUpdates, configUpdated: true };
    console.log('✅ Configuration updates generated');
    console.log('\n⚠️  Manual steps required:');
    console.log('1. Update apps/tee/.env with the addresses above');
    console.log('2. Update apps/web/.env.local with the addresses above');
    console.log('3. Restart TEE server to pick up new addresses');
  }

  private async executeGenerateReportChunk(chunk: any): Promise<void> {
    console.log('\n📊 Generating deployment report...');

    const state = this.chunkManager.getState();
    const verificationResults: any[] = [];
    const testResults: any[] = [];

    for (const chunkData of state.chunks) {
      if (chunkData.id === 4 && chunkData.output) {
        verificationResults.push(chunkData.output);
      }
      if (chunkData.id === 6 && chunkData.output) {
        verificationResults.push(chunkData.output);
      }
      if (chunkData.id === 8 && chunkData.output) {
        testResults.push(...chunkData.output.results);
      }
    }

    const report = this.reporter.generateReport(state, verificationResults, testResults);
    const reportPath = await this.reporter.saveReport(report);

    chunk.output = { reportPath };
    console.log(`✅ Report generated: ${reportPath}`);
  }

  private async generateReport(): Promise<void> {
    const state = this.chunkManager.getState();
    const verificationResults: any[] = [];
    const testResults: any[] = [];

    for (const chunkData of state.chunks) {
      if (chunkData.output && typeof chunkData.output === 'object') {
        if (chunkData.output.contract) {
          verificationResults.push(chunkData.output);
        }
        if (chunkData.output.results) {
          testResults.push(...chunkData.output.results);
        }
      }
    }

    const report = this.reporter.generateReport(state, verificationResults, testResults);
    await this.reporter.saveReport(report);
  }
}

export async function deploy(config: DeploymentConfig): Promise<void> {
  const orchestrator = new DeploymentOrchestrator(config);
  await orchestrator.execute();
}
