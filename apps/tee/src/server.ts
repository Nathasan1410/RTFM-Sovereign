/**
 * TEE Service Server
 *
 * Express-based HTTP server for Trusted Execution Environment service.
 * Acts as the entry point for all TEE operations including session management,
 * challenge generation, code grading, and attestation signing.
 *
 * Key Responsibilities:
 * - REST API endpoints for session management (/session/*)
 * - Challenge generation via AI agents (/challenge/generate)
 * - Answer grading and attestation signing (/attest)
 * - Health check endpoint (/health)
 * - CORS and middleware configuration
 * - Service initialization and dependency injection
 *
 * Dependencies:
 * - Express.js: Web framework
 * - TEEIdentity: Cryptographic identity management
 * - ArchitectAgent: Golden path generation
 * - SpecialistAgent: Code analysis and feedback
 * - LLMService: AI inference (Cerebras, Groq, Brave, Hyperbolic)
 * - JudgingEngine: Multi-layer code analysis and grading
 * - ContractIntegration: Smart contract interaction
 * - IPFSService: Decentralized storage
 *
 * @module apps/tee/src/server
 */

import 'dotenv/config';
import express from 'express';
import { TEEIdentity } from './crypto/signer';
import { logger, healthLogger, agentLogger } from './utils/logger';
import { ArchitectAgent } from './agents/architect/ArchitectAgent';
import { SpecialistAgent, Answer } from './agents/SpecialistAgent';
import { LLMService } from './services/llm/LLMService';
import { SwarmOrchestrator } from './orchestrator/SwarmOrchestrator';
import { GradingService, ExpectedAnswer } from './services/GradingService';
import { SignService } from './crypto/sign';
import { ethers } from 'ethers';
import { JudgingEngine } from './judging/JudgingEngine';
import { v4 as uuidv4 } from 'uuid';
import { ProjectManagerAgent } from './agents/manager/ProjectManagerAgent';
import { SwarmAgent } from './agents/swarm/SwarmAgent';
import { createContractIntegration, createEIP712Signer, ContractConfig } from './contracts';
import { createIPFSService, IPFSCredentials } from './services/ipfs';
import { ContractVerifier } from './verification/ContractVerifier';
import { AICodeJudge, CodeSubmission } from './verification/AICodeJudge';
import { HistoryTracker } from './verification/HistoryTracker';
import { TEESigner, createTEESigner } from './services/TEESigner';
import { OnChainCheckpoint, OnChainCheckpointRecord } from './agents/types/delegation.types';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Services (Dependency Injection)
const teeIdentity = new TEEIdentity();
const signService = new SignService(teeIdentity);
const gradingService = new GradingService();
const llmService = new LLMService(
  process.env.CEREBRAS_API_KEY || '',
  process.env.GROQ_API_KEY || '',
  process.env.BRAVE_API_KEY || '',
  process.env.HYPERBOLIC_API_KEY || '',
  process.env.EIGENAI_API_KEY || '',
  process.env.WALLET_PRIVATE_KEY || ''
);
const architectAgent = new ArchitectAgent(llmService);
const specialistAgent = new SpecialistAgent();
const swarmAgent = new SwarmAgent(llmService);
const orchestrator = new SwarmOrchestrator(architectAgent, specialistAgent);
const judgingEngine = new JudgingEngine({
  enableCache: true,
  enableRedis: process.env.REDIS_URL ? true : false,
  redisUrl: process.env.REDIS_URL,
  useMockEigenAI: false
});
const projectManagerAgent = new ProjectManagerAgent(llmService);
const contractVerifier = new ContractVerifier(process.env.TEE_PRIVATE_KEY || '');
const aiCodeJudge = new AICodeJudge(llmService);
const historyTracker = new HistoryTracker();

// Initialize Contract Integration (Chunk 4)
let contractIntegration: any = null;
let eip712Signer: any = null;
let ipfsService: any = null;
let teeSigner: TEESigner | null = null;
let attestationContract: any = null;

async function initializeContractIntegration() {
  if (process.env.TEE_PRIVATE_KEY && process.env.CONTRACT_ATTESTATION && process.env.CONTRACT_STAKING) {
    const contractConfig: ContractConfig = {
      attestationAddress: process.env.CONTRACT_ATTESTATION || '',
      stakingAddress: process.env.CONTRACT_STAKING || '',
      rpcUrl: process.env.RPC_URL || 'https://1rpc.io/sepolia',
      privateKey: process.env.TEE_PRIVATE_KEY || ''
    };

    contractIntegration = await createContractIntegration(contractConfig);
    eip712Signer = await createEIP712Signer(
      process.env.TEE_PRIVATE_KEY || '',
      process.env.CONTRACT_ATTESTATION || ''
    );

    // Initialize TEESigner for on-chain checkpoint signing
    const chainId = parseInt(process.env.CHAIN_ID || '11155111');
    teeSigner = createTEESigner({
      privateKey: process.env.TEE_PRIVATE_KEY || '',
      chainId,
      contractAddress: process.env.CONTRACT_ATTESTATION || ''
    });

    // Initialize attestation contract for on-chain operations
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://1rpc.io/sepolia');
    const wallet = new ethers.Wallet(process.env.TEE_PRIVATE_KEY || '', provider);

    // Import contract ABI
    const RTFMAttestationABI = require('./contracts/abis/RTFMAttestation.json');
    attestationContract = new ethers.Contract(
      process.env.CONTRACT_ATTESTATION || '',
      RTFMAttestationABI.abi,
      wallet
    );

    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
      const ipfsCredentials: IPFSCredentials = {
        apiKey: process.env.PINATA_API_KEY || '',
        secretApiKey: process.env.PINATA_SECRET_API_KEY || '',
        jwt: process.env.PINATA_JWT
      };
      ipfsService = await createIPFSService(ipfsCredentials);
    }

    projectManagerAgent.initializeContractIntegration(
      contractIntegration,
      eip712Signer,
      ipfsService,
      teeSigner,
      attestationContract,
      provider
    );

    agentLogger.info({
      signer: eip712Signer.getSignerAddress(),
      teeSigner: teeSigner.getPublicKey(),
      attestation: process.env.CONTRACT_ATTESTATION,
      staking: process.env.CONTRACT_STAKING
    }, 'Contract integration initialized');
  } else {
    agentLogger.warn('Contract integration not fully configured - blockchain features disabled');
  }
}

initializeContractIntegration().catch(error => {
  agentLogger.error({ error }, 'Failed to initialize contract integration');
});

app.use(express.json());

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

/**
 * HEALTH CHECK ENDPOINT
 *
 * Returns TEE service health status including:
 * - Overall operational status
 * - SGX enclave status
 * - Quote generation availability
 * - Contract integration status
 * - ContractVerifier connection status
 */
app.get('/health', async (req, res) => {
  try {
    const teeStatus = {
      initialized: !!teeIdentity,
      attestationEnabled: process.env.SGX_ENABLED === 'true',
      useMockTee: process.env.USE_MOCK_TEE === 'true',
      quoteGenerationAvailable: false,
      measurement: null as string | null,
      address: teeIdentity?.getAddress() || null
    };

    // Try to generate a quote to verify SGX is working
    if (teeIdentity) {
      try {
        const quote = await teeIdentity.getAttestationQuote();
        teeStatus.quoteGenerationAvailable = true;
        teeStatus.measurement = quote.measurement;
      } catch (error) {
        agentLogger.warn({ error: (error as Error).message }, 'SGX quote generation failed');
      }
    }

    // Test ContractVerifier connection
    let contractVerifierStatus: any = {
      enabled: !!process.env.TEE_PRIVATE_KEY,
      connected: false,
      config: null,
      contracts: null
    };

    if (contractVerifier) {
      try {
        const connectionTest = await contractVerifier.testConnection();
        contractVerifierStatus = {
          enabled: true,
          connected: connectionTest.success,
          config: {
            network: connectionTest.network.name,
            chainId: connectionTest.network.chainId,
            rpcUrl: connectionTest.network.rpcUrl
          },
          contracts: {
            attestation: {
              address: connectionTest.contracts.attestation.address,
              connected: connectionTest.contracts.attestation.connected,
              error: connectionTest.contracts.attestation.error
            },
            staking: {
              address: connectionTest.contracts.staking.address,
              connected: connectionTest.contracts.staking.connected,
              error: connectionTest.contracts.staking.error
            }
          }
        };
        agentLogger.info({
          attestation: contractVerifierStatus.contracts.attestation.connected,
          staking: contractVerifierStatus.contracts.staking.connected
        }, 'ContractVerifier health check completed');
      } catch (error) {
        contractVerifierStatus.error = (error as Error).message;
        agentLogger.error({ error: (error as Error).message }, 'ContractVerifier health check failed');
      }
    }

    res.json({
      status: 'operational',
      uptime: process.uptime(),
      timestamp: Date.now(),
      tee: teeStatus,
      contracts: {
        attestation: process.env.CONTRACT_ATTESTATION || null,
        staking: process.env.CONTRACT_STAKING || null,
        connected: !!contractIntegration
      },
      contractVerifier: contractVerifierStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message
    });
  }
});

/**
 * TEE IDENTITY ENDPOINT
 *
 * Returns TEE identity information including:
 * - Public key for signature verification
 * - TEE address
 * - Attestation quote (SGX quote)
 */
app.get('/identity', async (req, res) => {
  try {
    const { quote, publicKey, measurement } = await teeIdentity.getAttestationQuote();
    res.json({
      publicKey,
      address: teeIdentity.getAddress(),
      contract: process.env.CONTRACT_ADDRESS,
      attestation: {
        report: quote,
        measurement: measurement,
        signature: 'MOCK_SIGNATURE_FROM_INTEL_SERVICE'
      },
      version: '1',
      status: 'active'
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Identity endpoint failed');
    res.status(500).json({
      error: 'Failed to get TEE identity',
      message: (error as Error).message
    });
  }
});

/**
 * GENERATE CHALLENGE ENDPOINT (Chunk 12)
 * Generates deterministic AI challenge based on user + topic.
 */
app.post('/challenge/generate', async (req, res) => {
  try {
    console.log('[DEBUG] Received payload:', JSON.stringify(req.body, null, 2));
    
    const { userAddress, topic, deep, mode } = req.body;
    
    if (!topic) {
      console.log('[DEBUG] Validation failed: Missing topic');
      return res.status(400).json({ error: 'Missing topic', received: req.body });
    }
    
    if (!userAddress) {
      console.log('[DEBUG] Validation failed: Missing userAddress');
      return res.status(400).json({ error: 'Missing userAddress', received: req.body });
    }

    console.log('[DEBUG] Request params:', { userAddress, topic, deep, mode });
    const roadmap = await architectAgent.generateRoadmap(userAddress, topic, 1);

    console.log('[DEBUG] Roadmap generated successfully');
    res.json(roadmap);
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Roadmap generation failed');
    console.log('[DEBUG] Generation error:', (error as Error).message);
    res.status(500).json({ error: 'Generation failed' });
  }
});

/**
 * ATTESTATION ENDPOINT (Chunk 11)
 * Validates, grades, and signs user submission.
 */
app.post('/attest', async (req, res) => {
  try {
    const { userAddress, topic, challengeId, answers } = req.body;

    // 1. Validate Request
    if (!userAddress || !topic || !challengeId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!ethers.isAddress(userAddress)) {
       throw new Error("INVALID_ADDRESS");
    }

    agentLogger.info({ userAddress, topic, challengeId }, 'Processing attestation request');

    // 2. Re-generate Challenge (Deterministic)
    // This fetches the "truth" from AI including expected keywords
    const challenge = await architectAgent.generateChallenge(userAddress, topic, 1);
    
    // 3. Extract Grading Rubric
    const expectedAnswers: ExpectedAnswer[] = [];
    challenge.modules.forEach(m => {
        m.questions.forEach(q => {
            expectedAnswers.push({
                keywords: q.expectedKeywords || [],
                weight: q.expectedPoints || (m.weight / m.questions.length)
            });
        });
    });

    // 4. Grade Submission
    const score = gradingService.gradeSubmission(answers, expectedAnswers);
    const passed = gradingService.isPassing(score);

    agentLogger.info({ userAddress, score, passed }, 'Grading complete');

    // 5. Get Nonce & Set Deadline
    const nonce = signService.getNextNonce(userAddress);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // 6. Sign Attestation
    const signedAttestation = await signService.signAttestation({
      user: userAddress,
      topic,
      score,
      nonce,
      deadline
    });

    // 7. Return Response
    res.json({
      success: true,
      score,
      passed,
      attestation: {
        signature: signedAttestation.signature,
        nonce: nonce.toString(), // BigInt to string
        deadline,
        attestationHash: signedAttestation.attestationHash
      },
      signer: teeIdentity.getAddress()
    });

  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Attestation failed');
    // Sanitize error - ensure no env vars leak
    res.status(400).json({ 
      error: (error as Error).message.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED]') 
    });
  }
});

/**
 * VERIFY CODE ENDPOINT (Chunk 2)
 * Two-layer AI judging: AST structural analysis + EigenAI semantic review
 */
app.post('/verify-code', async (req, res) => {
  try {
    const { userAddress, sessionId, milestoneId, codeFiles, rubric, seed } = req.body;

    if (!userAddress || !sessionId || !milestoneId || !Array.isArray(codeFiles)) {
      return res.status(400).json({ error: 'Missing required fields: userAddress, sessionId, milestoneId, codeFiles' });
    }

    if (!ethers.isAddress(userAddress)) {
      throw new Error('INVALID_ADDRESS');
    }

    agentLogger.info({ userAddress, sessionId, milestoneId }, 'Processing code verification');

    const submission = {
      user_address: userAddress,
      session_id: sessionId,
      milestone_id: milestoneId,
      code_files: codeFiles.map((file: any) => ({
        file_path: file.file_path,
        content: file.content,
        language: file.language || 'typescript'
      }))
    };

    const result = await judgingEngine.judge({
      submission,
      rubric,
      seed: seed || Date.now()
    });

    const report = judgingEngine.generateReport(result);

    res.json({
      success: true,
      result,
      report,
      cache_stats: judgingEngine.getCacheStats()
    });

  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Code verification failed');
    res.status(400).json({ 
      error: (error as Error).message 
    });
  }
});

/**
 * DYNAMIC ROADMAP GENERATION ENDPOINT
 * Generates context-aware, topic-specific learning paths
 * Not template-based - uses AI to analyze topic and generate custom milestones
 */
app.post('/roadmap/generate-dynamic', async (req, res) => {
  try {
    const { topic, userAddress, mode = 'lite' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Missing required field: topic' });
    }

    agentLogger.info({ topic, userAddress, mode }, 'Generating dynamic roadmap');

    const goldenPath = await architectAgent.generateDynamicGoldenPath(topic, mode);

    res.json({
      success: true,
      project_id: goldenPath.project_id,
      project_title: goldenPath.project_title,
      tech_stack: goldenPath.tech_stack,
      milestones: goldenPath.milestones,
      total_steps: goldenPath.milestones.reduce((sum, m) => sum + m.micro_steps.length, 0),
      estimated_duration_hours: Math.round(goldenPath.estimated_duration / 60)
    });

  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Dynamic roadmap generation failed');
    res.status(500).json({
      error: (error as Error).message
    });
  }
});

app.get('/health/contract', (req, res) => {
  const contractStatus = contractIntegration ? {
    connected: true,
    teeAddress: contractIntegration.getSignerAddress(),
    stakingContract: process.env.CONTRACT_STAKING,
    attestationContract: process.env.CONTRACT_ATTESTATION
  } : {
    connected: false,
    reason: 'Contract integration not initialized'
  };

  res.json({
    status: contractStatus.connected ? 'operational' : 'disconnected',
    contract: contractStatus,
    tee: {
      initialized: !!eip712Signer,
      signerAddress: eip712Signer ? eip712Signer.getSignerAddress() : 'not_configured'
    },
    ipfs: {
      initialized: !!ipfsService,
      status: ipfsService ? 'configured' : 'not_configured'
    }
  });
});

app.post('/contract/record-milestone', async (req, res) => {
  try {
    const { sessionId, milestoneId } = req.body;

    // Validate request body
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    }

    if (milestoneId === undefined || milestoneId === null) {
      return res.status(400).json({
        error: 'Missing milestoneId',
        code: 'MISSING_MILESTONE_ID'
      });
    }

    const milestoneIdNum = parseInt(milestoneId);
    if (isNaN(milestoneIdNum) || milestoneIdNum < 1 || milestoneIdNum > 5) {
      return res.status(400).json({
        error: 'Invalid milestoneId (must be 1-5)',
        code: 'INVALID_MILESTONE_ID'
      });
    }

    agentLogger.info({
      sessionId,
      milestoneId: milestoneIdNum
    }, 'Server: Recording milestone on-chain');

    const result = await projectManagerAgent.recordMilestoneOnChain(
      sessionId,
      milestoneIdNum
    );

    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        milestoneId: milestoneIdNum,
        message: 'Milestone recorded on-chain',
        timestamp: Date.now()
      });
    } else {
      const statusCode = result.error?.includes('network') || result.error?.includes('gas')
        ? 503  // Service Unavailable
        : 400; // Bad Request

      res.status(statusCode).json({
        success: false,
        error: result.error,
        code: result.code || 'MILESTONE_RECORDING_FAILED'
      });
    }
  } catch (error) {
    agentLogger.error({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, 'Server: Milestone recording failed');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.post('/contract/submit-attestation', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Validate request body
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    }

    agentLogger.info({ sessionId }, 'Server: Submitting final attestation');

    const result = await projectManagerAgent.submitFinalAttestation(sessionId);

    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        ipfsHash: result.ipfsHash,
        finalScore: result.finalScore,
        message: 'Attestation submitted successfully',
        timestamp: Date.now()
      });
    } else {
      const statusCode = result.error?.includes('network') || result.error?.includes('gas')
        ? 503  // Service Unavailable
        : 400; // Bad Request

      res.status(statusCode).json({
        success: false,
        error: result.error,
        code: result.code || 'ATTESTATION_SUBMISSION_FAILED'
      });
    }
  } catch (error) {
    agentLogger.error({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, 'Server: Attestation submission failed');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.post('/contract/claim-refund', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Validate request body
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid sessionId',
        code: 'INVALID_SESSION_ID'
      });
    }

    agentLogger.info({ sessionId }, 'Server: Claiming refund');

    const result = await projectManagerAgent.claimRefundForUser(sessionId);

    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        refundAmount: result.refundAmount,
        finalScore: result.finalScore,
        message: 'Refund claimed successfully',
        timestamp: Date.now()
      });
    } else {
      const statusCode = result.error?.includes('network') || result.error?.includes('gas')
        ? 503  // Service Unavailable
        : 400; // Bad Request

      res.status(statusCode).json({
        success: false,
        error: result.error,
        code: result.code || 'REFUND_CLAIM_FAILED'
      });
    }
  } catch (error) {
    agentLogger.error({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, 'Server: Refund claim failed');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * SESSION MANAGEMENT ENDPOINT (Chunk 4)
 * Creates a new project session with golden path milestones
 */
app.post('/session/create', async (req, res) => {
  try {
    const { userAddress, goldenPath } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'Missing userAddress' });
    }
    
    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }
    
    if (!goldenPath || !Array.isArray(goldenPath.milestones)) {
      return res.status(400).json({ error: 'Missing or invalid goldenPath' });
    }
    
    agentLogger.info({ userAddress, milestonesCount: goldenPath.milestones.length }, 'Creating session');
    
    const session = projectManagerAgent.createSession(userAddress);
    
    session.project.golden_path = goldenPath;
    projectManagerAgent.updateSession(session.session_id, session);
    
    res.json({
      success: true,
      sessionId: session.session_id,
      userAddress,
      message: 'Session created successfully'
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Session creation failed');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

/**
 * TEST HELPERS ENDPOINT (Chunk 4)
 * Simulates milestone verification for testing IPFS integration
 */
app.post('/test/add-milestone-scores', async (req, res) => {
  try {
    const { sessionId, scores } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    if (!Array.isArray(scores)) {
      return res.status(400).json({ error: 'Missing or invalid scores array' });
    }

    const session = projectManagerAgent.getSessionState(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    agentLogger.info({ sessionId, scoresCount: scores.length }, 'Adding test milestone scores');

    // Add mock milestone scores to session
    scores.forEach((scoreData: any, index: number) => {
      session.verification.milestone_scores.push({
        milestone_id: scoreData.milestone_id,
        score: scoreData.score,
        feedback: scoreData.feedback || 'Test feedback',
        submission_hash: '0x' + '0'.repeat(64),
        ipfs_hash: `QmTest${scoreData.milestone_id}Hash${Math.random().toString(36).substring(7)}`,
        timestamp: Math.floor(Date.now() / 1000)
      });
    });
    
    res.json({
      success: true,
      sessionId,
      message: `Added ${scores.length} milestone scores`,
      scores: session.verification.milestone_scores
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Failed to add milestone scores');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

/**
 * SESSION MANAGEMENT ENDPOINTS (3-Agent System)
 */

app.post('/session/execute', async (req, res) => {
  try {
    const { sessionId, topic, depth } = req.body;
    
    if (!sessionId || !topic) {
      return res.status(400).json({ error: 'Missing sessionId or topic' });
    }
    
    const session = projectManagerAgent.getSessionState(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const result = await projectManagerAgent.executeMilestone(sessionId, topic, depth);
    
    res.json({
      success: true,
      session_id: sessionId,
      result
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Milestone execution failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * VERIFICATION ENDPOINTS
 */

app.post('/verify/certificate', async (req, res) => {
  try {
    const { userAddress, tokenId } = req.body;
    
    if (!userAddress || !tokenId) {
      return res.status(400).json({ error: 'Missing userAddress or tokenId' });
    }
    
    const certificate = await contractVerifier.verifyCertificate(userAddress, tokenId);
    
    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Certificate verification failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/verify/history/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    const history = historyTracker.getUserHistory(userAddress);
    
    res.json({
      success: true,
      history: {
        ...history,
        submissions: history.submissions.map(sub => ({
          ...sub,
          code: sub.code.substring(0, 500) + (sub.code.length > 500 ? '...' : '')
        }))
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'History fetch failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/verify/certificates/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    const certificates = await contractVerifier.getUserCertificates(userAddress);
    
    res.json({
      success: true,
      certificates
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Certificates fetch failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/judge/code', async (req, res) => {
  try {
    const { userAddress, sessionId, milestoneId, code, criteria, rubric } = req.body;

    if (!userAddress || !sessionId || !code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const submission: CodeSubmission = {
      userAddress,
      sessionId,
      milestoneId,
      code,
      criteria: criteria || [],
      rubric: rubric || {
        completeness: 100,
        code_quality: 80,
        best_practices: 90,
        documentation: 70
      }
    };

    const judgement = await aiCodeJudge.judgeCode(submission);

    const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code)).substring(2);
    historyTracker.recordSubmission(userAddress, sessionId, milestoneId, code, codeHash);
    historyTracker.recordScore(userAddress, sessionId, milestoneId, judgement.score, judgement.feedback);

    res.json({
      success: true,
      judgement
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Code judgment failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/score/record', async (req, res) => {
  try {
    const { userAddress, sessionId, milestoneId, score, codeHash } = req.body;

    if (!userAddress || !sessionId || !milestoneId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkpoint = await projectManagerAgent.recordCheckpoint(
      sessionId,
      milestoneId,
      score,
      codeHash
    );

    res.json({
      success: true,
      checkpoint
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Score recording failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * CHECKPOINT ENDPOINTS (IPFS Integration)
 * Endpoints for managing milestone checkpoints with IPFS code snapshots
 */

/**
 * POST /checkpoint/create
 * Create a checkpoint with IPFS code snapshot upload
 */
app.post('/checkpoint/create', async (req, res) => {
  try {
    const { sessionId, milestoneId, code, codeFiles } = req.body;

    if (!sessionId || !milestoneId) {
      return res.status(400).json({ error: 'Missing sessionId or milestoneId' });
    }

    // Calculate code hash from files or single code string
    let codeHash: string;
    if (codeFiles && Array.isArray(codeFiles)) {
      const allCode = codeFiles.map((f: any) => f.content).join('\n');
      codeHash = ethers.keccak256(ethers.toUtf8Bytes(allCode)).substring(2);
    } else if (code) {
      codeHash = ethers.keccak256(ethers.toUtf8Bytes(code)).substring(2);
    } else {
      return res.status(400).json({ error: 'Missing code or codeFiles' });
    }

    agentLogger.info({
      sessionId,
      milestoneId,
      codeHash
    }, 'Creating checkpoint with IPFS upload');

    // Record checkpoint with IPFS upload
    const checkpoint = await projectManagerAgent.recordCheckpoint(
      sessionId,
      milestoneId,
      0, // Score will be calculated by AI judge
      codeHash
    );

    res.json({
      success: true,
      checkpoint: {
        ...checkpoint,
        ipfsGatewayUrl: checkpoint.ipfsHash 
          ? `https://gateway.pinata.cloud/ipfs/${checkpoint.ipfsHash}`
          : ''
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Checkpoint creation failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/:sessionId/:milestoneId
 * Retrieve checkpoint and snapshot from IPFS
 */
app.get('/checkpoint/:sessionId/:milestoneId', async (req, res) => {
  try {
    const { sessionId, milestoneId } = req.params;
    const milestoneNum = parseInt(milestoneId);

    const session = projectManagerAgent.getSessionState(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const checkpoint = session.verification.milestone_scores.find(
      ms => ms.milestone_id === milestoneNum
    );

    if (!checkpoint || !checkpoint.ipfs_hash) {
      return res.status(404).json({ 
        error: 'Checkpoint not found or no IPFS hash available' 
      });
    }

    if (!ipfsService) {
      return res.status(503).json({ error: 'IPFS service not available' });
    }

    // Retrieve from IPFS
    const snapshot = await ipfsService.getFile(checkpoint.ipfs_hash);

    res.json({
      success: true,
      checkpoint: {
        milestone_id: checkpoint.milestone_id,
        score: checkpoint.score,
        feedback: checkpoint.feedback,
        submission_hash: checkpoint.submission_hash,
        ipfs_hash: checkpoint.ipfs_hash,
        timestamp: checkpoint.timestamp
      },
      snapshot,
      ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${checkpoint.ipfs_hash}`
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Checkpoint retrieval failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/user/:userAddress
 * Retrieve all checkpoints for a user
 */
app.get('/checkpoint/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }

    // Get all sessions for user (in production, query database)
    const allSessions = projectManagerAgent.getAllSessions();
    const userSessions = allSessions.filter(s => s.user_address.toLowerCase() === userAddress.toLowerCase());

    // Collect all checkpoints
    const checkpoints: Array<{
      sessionId: string;
      milestoneId: number;
      score: number;
      feedback: string;
      timestamp: number;
      ipfsHash: string;
      snapshot: any;
      ipfsGatewayUrl: string;
    }> = [];
    
    for (const session of userSessions) {
      for (const score of session.verification.milestone_scores) {
        if (score.ipfs_hash) {
          try {
            let snapshot = null;
            if (ipfsService) {
              snapshot = await ipfsService.getFile(score.ipfs_hash);
            }
            
            checkpoints.push({
              sessionId: session.session_id,
              milestoneId: score.milestone_id,
              score: score.score,
              feedback: score.feedback,
              timestamp: score.timestamp,
              ipfsHash: score.ipfs_hash,
              snapshot,
              ipfsGatewayUrl: ipfsService 
                ? `https://gateway.pinata.cloud/ipfs/${score.ipfs_hash}`
                : ''
            });
          } catch (error) {
            agentLogger.warn({
              sessionId: session.session_id,
              milestoneId: score.milestone_id,
              ipfsHash: score.ipfs_hash,
              error: (error as Error).message
            }, 'Failed to retrieve snapshot from IPFS');
            
            // Still return checkpoint without snapshot
            checkpoints.push({
              sessionId: session.session_id,
              milestoneId: score.milestone_id,
              score: score.score,
              feedback: score.feedback,
              timestamp: score.timestamp,
              ipfsHash: score.ipfs_hash,
              snapshot: null,
              ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${score.ipfs_hash}`
            });
          }
        }
      }
    }

    res.json({
      success: true,
      userAddress,
      totalCheckpoints: checkpoints.length,
      checkpoints
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'User checkpoints retrieval failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/export/:userAddress
 * Export all checkpoints for a user as JSON
 */
app.get('/checkpoint/export/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }

    const history = historyTracker.getUserHistory(userAddress);
    
    const exportData = {
      userAddress,
      exportedAt: new Date().toISOString(),
      totalSubmissions: history.submissions.length,
      submissions: history.submissions.map(sub => ({
        sessionId: sub.sessionId,
        milestoneId: sub.milestoneId,
        codeHash: sub.codeHash,
        timestamp: sub.timestamp,
        score: sub.score,
        feedback: sub.feedback,
        ipfsHash: sub.ipfsHash || ''
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Checkpoint export failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/verify/export/csv', (req, res) => {
  try {
    const csv = historyTracker.exportToCSV();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hrd-report.csv"');
    res.send(csv);
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'CSV export failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/verify/statistics', (req, res) => {
  try {
    const stats = historyTracker.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Statistics fetch failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ON-CHAIN CHECKPOINT ENDPOINTS ====================

/**
 * POST /checkpoint/onchain/record
 * Record a checkpoint on-chain with TEE signature
 */
app.post('/checkpoint/onchain/record', async (req, res) => {
  try {
    const { sessionId, milestoneId, userAddress, codeFiles } = req.body;

    if (!sessionId || !milestoneId || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!teeSigner || !attestationContract) {
      return res.status(503).json({ error: 'On-chain checkpoint service not available' });
    }

    // Validate milestone ID
    const milestoneNum = parseInt(milestoneId);
    if (![3, 5, 7].includes(milestoneNum)) {
      return res.status(400).json({ error: 'Invalid milestone ID. Must be 3, 5, or 7' });
    }

    // Calculate code hash
    let codeHash: string;
    if (codeFiles && Array.isArray(codeFiles)) {
      const allCode = codeFiles.map((f: any) => f.content).join('\n');
      codeHash = ethers.keccak256(ethers.toUtf8Bytes(allCode));
    } else {
      return res.status(400).json({ error: 'Missing codeFiles' });
    }

    // Get session to retrieve IPFS hash
    const session = projectManagerAgent.getSessionState(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const checkpoint = session.verification.milestone_scores.find(
      ms => ms.milestone_id === milestoneNum
    );

    if (!checkpoint || !checkpoint.ipfs_hash) {
      return res.status(404).json({ error: 'Checkpoint not found or no IPFS hash available' });
    }

    // Convert IPFS hash to bytes32
    const ipfsHashBytes = ethers.hexlify(ethers.toUtf8Bytes(checkpoint.ipfs_hash));
    const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

    // Generate TEE signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await teeSigner.signCheckpoint({
      user: userAddress,
      sessionId: sessionIdBytes,
      milestoneId: milestoneNum,
      timestamp,
      ipfsHash: ipfsHashBytes,
      codeHash
    });

    agentLogger.info({
      sessionId,
      milestoneId,
      user: userAddress,
      timestamp
    }, 'Recording on-chain checkpoint');

    // Submit to blockchain
    const tx = await attestationContract.recordCheckpoint(
      userAddress,
      sessionIdBytes,
      milestoneNum,
      timestamp,
      ipfsHashBytes,
      codeHash,
      signature
    );

    const receipt = await tx.wait(2); // Wait for 2 confirmations

    const onChainCheckpoint: OnChainCheckpointRecord = {
      user: userAddress,
      sessionId,
      milestoneId: milestoneNum,
      timestamp,
      ipfsHash: checkpoint.ipfs_hash,
      signature,
      verified: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      confirmations: 2
    };

    agentLogger.info({
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    }, 'On-chain checkpoint recorded successfully');

    res.json({
      success: true,
      checkpoint: onChainCheckpoint,
      ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${checkpoint.ipfs_hash}`
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'On-chain checkpoint recording failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/onchain/:userAddress/:sessionId/:milestoneId
 * Retrieve a single on-chain checkpoint
 */
app.get('/checkpoint/onchain/:userAddress/:sessionId/:milestoneId', async (req, res) => {
  try {
    const { userAddress, sessionId, milestoneId } = req.params;

    if (!attestationContract) {
      return res.status(503).json({ error: 'On-chain checkpoint service not available' });
    }

    const milestoneNum = parseInt(milestoneId);
    const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

    const checkpoint = await attestationContract.getCheckpoint(
      userAddress,
      sessionIdBytes,
      milestoneNum
    );

    if (checkpoint.timestamp === 0n) {
      return res.status(404).json({ error: 'Checkpoint not found on-chain' });
    }

    res.json({
      success: true,
      checkpoint: {
        user: checkpoint.user,
        sessionId: ethers.toUtf8String(checkpoint.sessionId),
        milestoneId: checkpoint.milestoneId,
        timestamp: Number(checkpoint.timestamp),
        ipfsHash: ethers.toUtf8String(checkpoint.ipfsHash),
        signature: checkpoint.signature,
        verified: checkpoint.verified
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'On-chain checkpoint retrieval failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/onchain/user/:userAddress
 * Retrieve all on-chain checkpoints for a user with pagination
 */
app.get('/checkpoint/onchain/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!attestationContract) {
      return res.status(503).json({ error: 'On-chain checkpoint service not available' });
    }

    const checkpoints = await attestationContract.getUserCheckpointsPaginated(
      userAddress,
      offset,
      limit
    );

    res.json({
      success: true,
      checkpoints: checkpoints.map((cp: any) => ({
        user: cp.user,
        sessionId: ethers.toUtf8String(cp.sessionId),
        milestoneId: cp.milestoneId,
        timestamp: Number(cp.timestamp),
        ipfsHash: ethers.toUtf8String(cp.ipfsHash),
        signature: cp.signature,
        verified: cp.verified
      })),
      pagination: {
        offset,
        limit,
        hasMore: checkpoints.length === limit
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'User checkpoints retrieval failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/onchain/session/:sessionId
 * Retrieve all on-chain checkpoints for a session with pagination
 */
app.get('/checkpoint/onchain/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!attestationContract) {
      return res.status(503).json({ error: 'On-chain checkpoint service not available' });
    }

    const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));
    const checkpoints = await attestationContract.getSessionCheckpointsPaginated(
      sessionIdBytes,
      offset,
      limit
    );

    res.json({
      success: true,
      checkpoints: checkpoints.map((cp: any) => ({
        user: cp.user,
        sessionId: ethers.toUtf8String(cp.sessionId),
        milestoneId: cp.milestoneId,
        timestamp: Number(cp.timestamp),
        ipfsHash: ethers.toUtf8String(cp.ipfsHash),
        signature: cp.signature,
        verified: cp.verified
      })),
      pagination: {
        offset,
        limit,
        hasMore: checkpoints.length === limit
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Session checkpoints retrieval failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /checkpoint/onchain/verify/:userAddress/:sessionId/:milestoneId
 * Verify if a checkpoint exists on-chain
 */
app.get('/checkpoint/onchain/verify/:userAddress/:sessionId/:milestoneId', async (req, res) => {
  try {
    const { userAddress, sessionId, milestoneId } = req.params;

    if (!attestationContract) {
      return res.status(503).json({ error: 'On-chain checkpoint service not available' });
    }

    const milestoneNum = parseInt(milestoneId);
    const sessionIdBytes = ethers.hexlify(ethers.toUtf8Bytes(sessionId));

    const exists = await attestationContract.checkpointExists(
      userAddress,
      sessionIdBytes,
      milestoneNum
    );

    res.json({
      success: true,
      verified: exists,
      checkpoint: {
        user: userAddress,
        sessionId,
        milestoneId: milestoneNum
      }
    });
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Checkpoint verification failed');
    res.status(500).json({ error: (error as Error).message });
  }
});

// Listen to contract events (if contract is available)
if (process.env.CONTRACT_ATTESTATION && attestationContract) {
  attestationContract.on('CheckpointCreated', (user: string, sessionId: any, milestoneId: number, timestamp: any, ipfsHash: any) => {
    agentLogger.info({
      event: 'CheckpointCreated',
      user,
      sessionId: ethers.toUtf8String(sessionId),
      milestoneId,
      timestamp: Number(timestamp),
      ipfsHash: ethers.toUtf8String(ipfsHash)
    }, 'On-chain checkpoint event detected');
  });

  attestationContract.on('CheckpointFailed', (user: string, sessionId: any, milestoneId: number, reason: string) => {
    agentLogger.error({
      event: 'CheckpointFailed',
      user,
      sessionId: ethers.toUtf8String(sessionId),
      milestoneId,
      reason
    }, 'On-chain checkpoint failure event detected');
  });
}

// Start server only when run directly (not during tests)
// This allows tests to import { app } without starting the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, async () => {
    console.log(`TEE Service running on port ${port}`);

    if (process.env.MNEMONIC) {
      console.log('🔒 Mode: PRODUCTION (EigenCompute KMS)');
    } else {
      console.log('⚠️ Mode: SIMULATION (Local/Unsafe Key)');
    }

    // Get attestation info asynchronously
    try {
      const attestation = await teeIdentity.getAttestationQuote();
      console.log(`TEE Public Key: ${attestation.publicKey}`);
      console.log(`TEE Measurement: ${attestation.measurement}`);
      console.log(`TEE Address: ${teeIdentity.getAddress()}`);
    } catch (error) {
      console.log(`TEE Address: ${teeIdentity.getAddress()}`);
      console.warn('Could not generate attestation quote at startup');
    }
  });
}

// Export for testing and programmatic use
export { app };
export default app;

