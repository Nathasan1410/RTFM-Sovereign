'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAccount } from 'wagmi'

const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:3001'

/**
 * Interface representing a milestone within a learning session
 */
export interface Milestone {
  id: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'pending' | 'active' | 'completed' | 'failed'
}

/**
 * Interface representing a complete learning session
 */
export interface Session {
  sessionId: string
  userAddress: string
  topic: string
  status: 'created' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
  deadline?: string
  milestones: Milestone[]
  currentMilestone?: number
  score?: number
  totalScore?: number
}

/**
 * Custom hook for managing learning sessions with TEE service.
 * Provides methods to create, fetch, and update learning sessions.
 * Automatically fetches session when sessionId is provided.
 * 
 * @param sessionId - Optional session ID to fetch on mount
 * @returns Object containing session data and management methods
 * @returns {Session|null} returns.session - Current session data
 * @returns {boolean} returns.isLoading - Whether an operation is in progress
 * @returns {string|null} returns.error - Error message if any
 * @returns {Function} returns.createSession - Function to create a new session
 * @returns {Function} returns.fetchSession - Function to fetch an existing session
 * @returns {Function} returns.updateMilestoneScore - Function to update milestone scores
 * 
 * @example
 * ```tsx
 * const { session, createSession, isLoading } = useSession()
 * 
 * // Create a new session
 * const newSession = await createSession('Solidity Smart Contracts')
 * 
 * // Update milestone score
 * await updateMilestoneScore(newSession.sessionId, 1, 85)
 * ```
 * 
 * @remarks
 * Requires wallet connection to create sessions. Sessions are persisted on TEE service.
 */
export function useSession(sessionId?: string) {
  const { address } = useAccount()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSession = useCallback(async (goldenPath: string) => {
    if (!address) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post<{ sessionId: string; userAddress: string }>(
        `${TEE_URL}/session/create`,
        {
          userAddress: address,
          goldenPath
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const newSession = {
        sessionId: response.data.sessionId,
        userAddress: response.data.userAddress,
        topic: goldenPath,
        status: 'created' as const,
        createdAt: new Date().toISOString(),
        milestones: []
      }

      setSession(newSession)
      return newSession
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const fetchSession = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.get<Session>(`${TEE_URL}/session/${id}`)
      setSession(response.data)
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch session'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateMilestoneScore = useCallback(async (id: string, milestoneId: number, score: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post<Session>(
        `${TEE_URL}/test/add-milestone-scores`,
        {
          sessionId: id,
          scores: [{ milestoneId, score }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      setSession(response.data)
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update milestone'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId)
    }
  }, [sessionId, fetchSession])

  return {
    session,
    isLoading,
    error,
    createSession,
    fetchSession,
    updateMilestoneScore
  }
}
