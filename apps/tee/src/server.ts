import express from 'express';
import { TEEIdentity } from './crypto/signer';
import { logger, healthLogger, agentLogger } from './utils/logger';
import { ArchitectAgent } from './agents/ArchitectAgent';
import { SpecialistAgent, Answer } from './agents/SpecialistAgent';
import { CerebrasService } from './services/CerebrasService';
import { SwarmOrchestrator } from './orchestrator/SwarmOrchestrator';
import { GradingService, ExpectedAnswer } from './services/GradingService';
import { SignService } from './crypto/sign';
import { ethers } from 'ethers';

const app = express();
const port = process.env.PORT || 3000;

// Initialize Services (Dependency Injection)
const teeIdentity = new TEEIdentity();
const signService = new SignService(teeIdentity);
const gradingService = new GradingService();
const architectAgent = new ArchitectAgent();
const specialistAgent = new SpecialistAgent();
const cerebrasService = new CerebrasService(process.env.CEREBRAS_API_KEY || '');
const orchestrator = new SwarmOrchestrator(architectAgent, specialistAgent, cerebrasService);

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

    const challenge = await architectAgent.generateChallenge(userAddress, topic, 1);
    
    // Sanitize: Remove expectedKeywords before sending to client
    const sanitizedChallenge = {
        ...challenge,
        modules: challenge.modules.map(m => ({
            ...m,
            questions: m.questions.map(q => {
                // @ts-ignore
                const { expectedKeywords, ...rest } = q; 
                return rest;
            })
        }))
    };

    res.json(sanitizedChallenge);
  } catch (error) {
    agentLogger.error({ error: (error as Error).message }, 'Challenge generation failed');
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

