import 'dotenv/config';
import express from 'express';
import { TEEIdentity } from './crypto/signer';
import { logger, healthLogger, agentLogger } from './utils/logger';
import { ArchitectAgent } from './agents/ArchitectAgent';
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
  useMockEigenAI: true
});
const projectManagerAgent = new ProjectManagerAgent(swarmAgent, judgingEngine);

// Initialize Contract Integration (Chunk 4)
let contractIntegration: any = null;
let eip712Signer: any = null;
let ipfsService: any = null;

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
      ipfsService
    );
    
    agentLogger.info({ 
      signer: eip712Signer.getSignerAddress(),
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

// ... (health check endpoints remain same) ...

// TEE Identity Endpoint
app.get('/identity', (req, res) => {
  const { quote, publicKey } = teeIdentity.getAttestationQuote();
  res.json({
    publicKey,
    address: teeIdentity.getAddress(),
    contract: process.env.CONTRACT_ADDRESS,
    attestation: {
      report: quote,
      signature: 'MOCK_SIGNATURE_FROM_INTEL_SERVICE'
    },
    version: '1',
    status: 'active'
  });
});

/**
 * GENERATE CHALLENGE ENDPOINT (Chunk 12)
 * Generates deterministic AI challenge based on user + topic.
 */
app.post('/challenge/generate', async (req, res) => {
  try {
    const { userAddress, topic } = req.body;
    if (!userAddress || !topic) return res.status(400).json({ error: 'Missing userAddress or topic' });

    const roadmap = await architectAgent.generateRoadmap(userAddress, topic, 1);

    res.json(roadmap);
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Roadmap generation failed');
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

app.get('/health/contract', (req, res) => {
  res.json({
    status: contractIntegration ? 'connected' : 'disconnected',
    signer: eip712Signer ? eip712Signer.getSignerAddress() : 'not_configured',
    ipfs: ipfsService ? 'configured' : 'not_configured',
    attestationContract: process.env.CONTRACT_ATTESTATION,
    stakingContract: process.env.CONTRACT_STAKING
  });
});

app.post('/contract/record-milestone', async (req, res) => {
  try {
    const { sessionId, milestoneId } = req.body;
    
    if (!sessionId || !milestoneId) {
      return res.status(400).json({ error: 'Missing sessionId or milestoneId' });
    }
    
    agentLogger.info({ sessionId, milestoneId }, 'Recording milestone on-chain');
    
    const result = await projectManagerAgent.recordMilestoneOnChain(sessionId, milestoneId);
    
    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        message: 'Milestone recorded on-chain'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Milestone recording failed');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

app.post('/contract/submit-attestation', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    agentLogger.info({ sessionId }, 'Submitting final attestation');
    
    const result = await projectManagerAgent.submitFinalAttestation(sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        ipfsHash: result.ipfsHash,
        finalScore: result.finalScore,
        message: 'Attestation submitted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Attestation submission failed');
    res.status(500).json({ 
      error: (error as Error).message 
    });
  }
});

app.post('/contract/claim-refund', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    agentLogger.info({ sessionId }, 'Claiming refund');
    
    const result = await projectManagerAgent.claimRefundForUser(sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        refundAmount: result.refundAmount,
        finalScore: result.finalScore,
        message: 'Refund claimed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Refund claim failed');
    res.status(500).json({ 
      error: (error as Error).message 
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
    
    const sessionId = await projectManagerAgent.createSession(userAddress, goldenPath);
    
    res.json({
      success: true,
      sessionId,
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
    
    const session = projectManagerAgent.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    agentLogger.info({ sessionId, scoresCount: scores.length }, 'Adding test milestone scores');
    
    // Add mock milestone scores to session
    scores.forEach((scoreData: any) => {
      session.verification.milestone_scores.push({
        milestone_id: scoreData.milestone_id,
        score: scoreData.score,
        feedback: scoreData.feedback || 'Test feedback',
        submission_hash: '0x' + '0'.repeat(64),
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

app.listen(port, () => {
  console.log(`TEE Service running on port ${port}`);
  
  if (process.env.MNEMONIC) {
    console.log('🔒 Mode: PRODUCTION (EigenCompute KMS)');
  } else {
    console.log('⚠️ Mode: SIMULATION (Local/Unsafe Key)');
  }
  
  console.log(`TEE Public Key: ${teeIdentity.getAttestationQuote().publicKey}`);
  console.log(`TEE Address: ${teeIdentity.getAddress()}`);
});

