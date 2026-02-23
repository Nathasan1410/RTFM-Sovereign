import request from 'supertest'
import express from 'express'

jest.mock('../../services/eigen-ai', () => ({
  analyzeCode: jest.fn().mockResolvedValue({
    quality: 85,
    functionality: 90,
    bestPractices: 80,
    innovation: 85,
    feedback: ['Good structure', 'Clean code']
  })
}))

jest.mock('../../services/ipfs', () => ({
  uploadToIPFS: jest.fn().mockResolvedValue({ ipfsHash: 'QmTestHash123' })
}))

const app = express()
app.use(express.json())

app.post('/session/create', (req, res) => {
  const { userAddress, goldenPath } = req.body
  if (!userAddress || !goldenPath) {
    return res.status(400).json({ error: 'Missing userAddress or goldenPath' })
  }
  res.json({
    sessionId: `session-${Date.now()}`,
    userAddress,
    topic: goldenPath,
    status: 'created',
    createdAt: new Date().toISOString(),
    milestones: []
  })
})

app.post('/challenge/generate', (req, res) => {
  const { userAddress, topic } = req.body
  if (!userAddress || !topic) {
    return res.status(400).json({ error: 'Missing userAddress or topic' })
  }
  res.json({
    topic,
    userAddress,
    modules: [
      {
        id: 1,
        title: 'Introduction',
        questions: [
          {
            id: 1,
            question: 'What is React?',
            expectedKeywords: ['React', 'JavaScript', 'library'],
            expectedPoints: 10
          }
        ]
      }
    ]
  })
})

app.post('/verify-code', (req, res) => {
  const { userAddress, sessionId, milestoneId, codeFiles } = req.body
  if (!userAddress || !sessionId || !milestoneId || !Array.isArray(codeFiles)) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  res.json({
    success: true,
    result: {
      session_id: sessionId,
      milestone_id: milestoneId,
      passed: true,
      overall_score: 85,
      layer1_result: {
        passed: true,
        syntax_errors: [],
        structural_issues: [],
        security_violations: [],
        file_count: codeFiles.length,
        line_count: 10,
        ast_hash: 'abc123'
      },
      layer2_result: {
        functionality_score: 90,
        quality_score: 80,
        best_practices_score: 85,
        innovation_score: 85,
        weighted_score: 85,
        feedback: 'Good work overall',
        suggestions: ['Add more comments']
      },
      rubric_used: {
        functionality_weight: 0.4,
        quality_weight: 0.3,
        best_practices_weight: 0.2,
        innovation_weight: 0.1
      },
      times: {
        layer1_ms: 50,
        layer2_ms: 150,
        total_ms: 200
      }
    },
    report: 'Overall Score: 85/100\nPASSED',
    cache_stats: { hits: 0, misses: 1, hit_rate: 0 }
  })
})

app.post('/attest', (req, res) => {
  const { userAddress, topic, challengeId, answers } = req.body
  if (!userAddress || !topic || !challengeId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  res.json({
    success: true,
    score: 85,
    passed: true,
    attestation: {
      signature: '0xMockSignature123',
      nonce: '1',
      deadline: Math.floor(Date.now() / 1000) + 3600,
      attestationHash: '0xAttestationHash123'
    },
    signer: '0xMockSignerAddress'
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

describe('Happy Path Integration Test', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890'

  it('should complete full learning flow', async () => {
    let sessionId = ''

    await request(app)
      .get('/health')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('healthy')
      })

    const sessionRes = await request(app)
      .post('/session/create')
      .send({
        userAddress: mockUserAddress,
        goldenPath: 'react-card'
      })

    expect(sessionRes.status).toBe(200)
    expect(sessionRes.body.sessionId).toBeDefined()
    expect(sessionRes.body.topic).toBe('react-card')
    expect(sessionRes.body.status).toBe('created')
    sessionId = sessionRes.body.sessionId

    const challengeRes = await request(app)
      .post('/challenge/generate')
      .send({
        userAddress: mockUserAddress,
        topic: 'react-card'
      })

    expect(challengeRes.status).toBe(200)
    expect(challengeRes.body.topic).toBe('react-card')
    expect(challengeRes.body.modules).toBeDefined()
    expect(challengeRes.body.modules.length).toBeGreaterThan(0)

    for (let milestoneId = 1; milestoneId <= 5; milestoneId++) {
      const verifyRes = await request(app)
        .post('/verify-code')
        .send({
          userAddress: mockUserAddress,
          sessionId,
          milestoneId,
          codeFiles: [
            {
              file_path: `milestone${milestoneId}.tsx`,
              content: `// Milestone ${milestoneId} solution\nexport const Component = () => { return <div>Hello</div> }`,
              language: 'typescript'
            }
          ]
        })

      expect(verifyRes.status).toBe(200)
      expect(verifyRes.body.success).toBe(true)
      expect(verifyRes.body.result.passed).toBe(true)
      expect(verifyRes.body.result.overall_score).toBeGreaterThanOrEqual(70)
      expect(verifyRes.body.result.layer1_result.passed).toBe(true)
      expect(verifyRes.body.result.layer2_result.weighted_score).toBeGreaterThan(0)
    }

    const attestRes = await request(app)
      .post('/attest')
      .send({
        userAddress: mockUserAddress,
        topic: 'react-card',
        challengeId: 'challenge-1',
        answers: ['React is a JavaScript library for building user interfaces']
      })

    expect(attestRes.status).toBe(200)
    expect(attestRes.body.success).toBe(true)
    expect(attestRes.body.score).toBeGreaterThan(0)
    expect(attestRes.body.passed).toBe(true)
    expect(attestRes.body.attestation.signature).toBeDefined()
    expect(attestRes.body.attestation.nonce).toBeDefined()
  })

  it('should handle missing required fields gracefully', async () => {
    const res = await request(app)
      .post('/session/create')
      .send({
        userAddress: mockUserAddress
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('should handle invalid session ID', async () => {
    const res = await request(app)
      .post('/verify-code')
      .send({
        userAddress: mockUserAddress,
        sessionId: 'invalid-session-id',
        milestoneId: 1,
        codeFiles: []
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should handle attestation with no answers', async () => {
    const res = await request(app)
      .post('/attest')
      .send({
        userAddress: mockUserAddress,
        topic: 'react-card',
        challengeId: 'challenge-1',
        answers: []
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should handle malformed JSON in request body', async () => {
    const res = await request(app)
      .post('/session/create')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')

    expect(res.status).toBe(400)
  })

  it('should generate challenge for different topics', async () => {
    const topics = ['react-card', 'solidity-contracts', 'typescript-basics']

    for (const topic of topics) {
      const res = await request(app)
        .post('/challenge/generate')
        .send({
          userAddress: mockUserAddress,
          topic
        })

      expect(res.status).toBe(200)
      expect(res.body.topic).toBe(topic)
      expect(res.body.modules).toBeDefined()
    }
  })

  it('should verify multiple code files in single submission', async () => {
    const res = await request(app)
      .post('/verify-code')
      .send({
        userAddress: mockUserAddress,
        sessionId: 'test-session',
        milestoneId: 1,
        codeFiles: [
          {
            file_path: 'index.tsx',
            content: 'export default () => null',
            language: 'typescript'
          },
          {
            file_path: 'utils.ts',
            content: 'export const add = (a: number, b: number) => a + b',
            language: 'typescript'
          },
          {
            file_path: 'types.ts',
            content: 'export interface User { id: string; name: string }',
            language: 'typescript'
          }
        ]
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.result.layer1_result.file_count).toBe(3)
  })
})
