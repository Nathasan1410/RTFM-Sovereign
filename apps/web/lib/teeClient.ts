import axios from 'axios'

const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

export const teeClient = axios.create({
  baseURL: TEE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

teeClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

teeClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response) {
      console.error('TEE API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      })
    } else if (error.request) {
      console.error('TEE API No Response:', error.request)
    } else {
      console.error('TEE API Request Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export const teeApi = {
  session: {
    create: (userAddress: string, goldenPath: string) =>
      teeClient.post('/session/create', { userAddress, goldenPath }),
    
    get: (sessionId: string) =>
      teeClient.get(`/session/${sessionId}`)
  },

  challenge: {
    generate: (userAddress: string, topic: string) =>
      teeClient.post('/challenge/generate', { userAddress, topic }),
    
    submit: (sessionId: string, code: string, language: string) =>
      teeClient.post('/challenge/submit', { sessionId, code, language }),
    
    answer: (sessionId: string, questionId: string, answer: string) =>
      teeClient.post('/challenge/answer', { sessionId, questionId, answer })
  },

  contract: {
    recordMilestone: (sessionId: string, milestoneId: number) =>
      teeClient.post('/contract/record-milestone', { sessionId, milestoneId }),
    
    submitAttestation: (sessionId: string) =>
      teeClient.post('/contract/submit-attestation', { sessionId }),
    
    claimRefund: (sessionId: string) =>
      teeClient.post('/contract/claim-refund', { sessionId })
  },

  test: {
    addMilestoneScores: (sessionId: string, scores: Array<{ milestoneId: number; score: number }>) =>
      teeClient.post('/test/add-milestone-scores', { sessionId, scores })
  },

  health: {
    check: () => teeClient.get('/health'),
    checkContract: () => teeClient.get('/health/contract')
  }
}

export default teeApi
