import { renderHook, act, waitFor } from '@testing-library/react'
import axios from 'axios'
import { useSubmitCode } from '@/hooks/useSubmitCode'
import { mockJudge } from '@/lib/demoMode'

jest.mock('axios')
jest.mock('@/lib/demoMode', () => ({
  isDemoMode: jest.fn(() => false),
  mockJudge: jest.fn()
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('useSubmitCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSubmitCode())
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should submit code and return feedback in production mode', async () => {
    const mockFeedback = {
      success: true,
      score: 85,
      totalScore: 100,
      rubric: [
        {
          criteria: 'Functionality',
          maxPoints: 100,
          achievedPoints: 90,
          feedback: 'Excellent implementation'
        }
      ],
      feedback: 'Good work overall',
      ipfsHash: 'QmTestHash123'
    }

    mockedAxios.post.mockResolvedValueOnce({ data: mockFeedback })

    const { result } = renderHook(() => useSubmitCode())

    let response
    await act(async () => {
      response = await result.current.submitCode('test-session', 'const x = 1;', 'typescript', 1)
    })

    expect(response).toEqual(mockFeedback)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/challenge/submit'),
      expect.objectContaining({
        sessionId: 'test-session',
        code: 'const x = 1;',
        language: 'typescript'
      }),
      expect.any(Object)
    )
  })

  it('should use mock judge in demo mode', async () => {
    const mockResult = {
      passed: true,
      score: 85,
      breakdown: {
        functionality: 90,
        code_quality: 80,
        best_practices: 85,
        innovation: 85
      },
      feedback: {
        strengths: ['Good structure'],
        improvements: ['Add types']
      },
      tx_hash: 'QmMockHash'
    }

    const { isDemoMode } = require('@/lib/demoMode')
    isDemoMode.mockReturnValueOnce(true)
    ;(mockJudge as jest.Mock).mockResolvedValueOnce(mockResult)

    const { result } = renderHook(() => useSubmitCode())

    let response
    await act(async () => {
      response = await result.current.submitCode('test-session', 'const x = 1;', 'typescript', 1)
    })

    expect(mockJudge).toHaveBeenCalledWith('const x = 1;', 1)
    expect(response.success).toBe(true)
    expect(response.score).toBe(85)
  })

  it('should handle code submission error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Invalid code'))

    const { result } = renderHook(() => useSubmitCode())

    try {
      await act(async () => {
        await result.current.submitCode('test-session', 'invalid', 'typescript', 1)
      })
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  it('should submit answer successfully', async () => {
    const mockAnswerResponse = {
      success: true,
      score: 90
    }

    mockedAxios.post.mockResolvedValueOnce({ data: mockAnswerResponse })

    const { result } = renderHook(() => useSubmitCode())

    let response
    await act(async () => {
      response = await result.current.submitAnswer('test-session', 'q1', 'My answer')
    })

    expect(response).toEqual(mockAnswerResponse)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/challenge/answer'),
      expect.objectContaining({
        sessionId: 'test-session',
        questionId: 'q1',
        answer: 'My answer'
      }),
      expect.any(Object)
    )
  })

  it('should handle answer submission error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSubmitCode())

    try {
      await act(async () => {
        await result.current.submitAnswer('test-session', 'q1', 'My answer')
      })
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  it('should set isSubmitting to false after successful submission', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true, score: 85 }
    })

    const { result } = renderHook(() => useSubmitCode())

    expect(result.current.isSubmitting).toBe(false)

    await act(async () => {
      await result.current.submitCode('test-session', 'const x = 1;', 'typescript')
    })

    expect(result.current.isSubmitting).toBe(false)
  })
})
