import { renderHook, act, waitFor } from '@testing-library/react'
import axios from 'axios'
import { useSession } from '@/hooks/useSession'

jest.mock('axios')
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890'
  })
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('useSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSession())
    expect(result.current.session).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should create session successfully', async () => {
    const mockSessionId = 'test-session-uuid'
    const mockResponse = {
      sessionId: mockSessionId,
      userAddress: '0x1234567890123456789012345678901234567890'
    }

    mockedAxios.post.mockResolvedValueOnce({ data: mockResponse })

    const { result } = renderHook(() => useSession())

    await act(async () => {
      const createdSession = await result.current.createSession('react-card')
      expect(createdSession).not.toBeNull()
      expect(createdSession?.sessionId).toBe(mockSessionId)
      expect(createdSession?.topic).toBe('react-card')
      expect(createdSession?.status).toBe('created')
    })

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/session/create'),
      expect.objectContaining({
        userAddress: '0x1234567890123456789012345678901234567890',
        goldenPath: 'react-card'
      }),
      expect.any(Object)
    )
  })

  it('should handle session creation error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSession())

    await expect(
      act(async () => {
        await result.current.createSession('react-card')
      })
    ).rejects.toThrow('Network error')

    expect(result.current.error).toBe('Network error')
    expect(result.current.session).toBeNull()
  })

  it('should fetch session successfully', async () => {
    const mockSession = {
      sessionId: 'test-session',
      userAddress: '0x1234567890123456789012345678901234567890',
      topic: 'react-card',
      status: 'in_progress' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      milestones: []
    }

    mockedAxios.get.mockResolvedValueOnce({ data: mockSession })

    const { result } = renderHook(() => useSession())

    await act(async () => {
      await result.current.fetchSession('test-session')
    })

    expect(result.current.session).toEqual(mockSession)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/session/test-session')
    )
  })

  it('should update milestone score successfully', async () => {
    const mockUpdatedSession = {
      sessionId: 'test-session',
      userAddress: '0x1234567890123456789012345678901234567890',
      topic: 'react-card',
      status: 'in_progress' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      milestones: []
    }

    mockedAxios.post.mockResolvedValueOnce({ data: mockUpdatedSession })

    const { result } = renderHook(() => useSession())

    await act(async () => {
      await result.current.updateMilestoneScore('test-session', 1, 85)
    })

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/test/add-milestone-scores'),
      expect.objectContaining({
        sessionId: 'test-session',
        scores: [{ milestoneId: 1, score: 85 }]
      }),
      expect.any(Object)
    )
  })

  it('should auto-fetch session when sessionId is provided', async () => {
    const mockSession = {
      sessionId: 'auto-fetch-session',
      userAddress: '0x1234567890123456789012345678901234567890',
      topic: 'react-card',
      status: 'created' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      milestones: []
    }

    mockedAxios.get.mockResolvedValueOnce({ data: mockSession })

    renderHook(() => useSession('auto-fetch-session'))

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/session/auto-fetch-session')
      )
    })
  })
})
