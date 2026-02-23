/**
 * TEE Service Client
 *
 * Axios-based HTTP client for communicating with TEE (Trusted Execution Environment) service.
 * Provides typed API methods for all TEE endpoints with error handling and logging.
 *
 * Key Features:
 * - Pre-configured axios instance with base URL and headers
 * - Request/response interceptors for error handling
 * - Comprehensive error logging for debugging
 * - Type-safe API methods organized by resource
 * - 30-second timeout for all requests
 *
 * Dependencies:
 * - axios: HTTP client library
 *
 * @module apps/web/lib/teeClient
 */

import axios from 'axios'

const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

/**
 * Axios instance pre-configured for TEE service communication.
 * Includes base URL, JSON headers, and 30-second timeout.
 */
export const teeClient = axios.create({
  baseURL: TEE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

/**
 * Request interceptor - logs all outgoing requests and passes them through.
 * Can be extended to add authentication tokens or request IDs.
 */
teeClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor - logs errors and handles different error scenarios.
 * Categorizes errors into: response errors, network errors, and request errors.
 */
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

/**
 * Type-safe API client organized by resource.
 * Provides methods for session, challenge, contract, and health endpoints.
 *
 * @example
 * ```typescript
 * // Create a session
 * const session = await teeApi.session.create('0x123...', 'Solidity');
 *
 * // Generate a challenge
 * const challenge = await teeApi.challenge.generate('0x123...', 'React');
 *
 * // Check TEE health
 * const health = await teeApi.health.check();
 * ```
 */
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
