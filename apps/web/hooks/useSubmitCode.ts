'use client'

import { useState, useCallback } from 'react'
import axios from 'axios'
import { isDemoMode, mockJudge } from '@/lib/demoMode'

const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

/**
 * Response interface for code submission to TEE service
 */
export interface SubmitCodeResponse {
  success: boolean
  score?: number
  totalScore?: number
  rubric?: Array<{
    criteria: string
    maxPoints: number
    achievedPoints: number
    feedback?: string
  }>
  feedback?: string
  ipfsHash?: string
  error?: string
}

/**
 * Custom hook for submitting code and answers to the TEE service.
 * Provides methods to submit code for grading and submit individual answers.
 * 
 * @returns Object containing submission methods and state
 * @returns {Function} returns.submitCode - Function to submit code for grading
 * @returns {Function} returns.submitAnswer - Function to submit an answer to a question
 * @returns {boolean} returns.isSubmitting - Whether a submission is in progress
 * @returns {string|null} returns.error - Error message if any
 * 
 * @example
 * ```tsx
 * const { submitCode, submitAnswer, isSubmitting } = useSubmitCode()
 * 
 * // Submit code for grading
 * const result = await submitCode('session-123', 'function hello() {}', 'typescript', 1)
 * console.log(result.score, result.rubric)
 * 
 * // Submit an answer
 * const answerResult = await submitAnswer('session-123', 'q1', 'My answer')
 * ```
 */
export function useSubmitCode() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitCode = useCallback(async (sessionId: string, code: string, language: string, milestoneId: number = 1) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (isDemoMode()) {
        const mockResult = await mockJudge(code, milestoneId)
        return {
          success: mockResult.passed,
          score: mockResult.score,
          totalScore: 100,
          rubric: Object.entries(mockResult.breakdown).map(([criteria, achievedPoints]) => ({
            criteria: criteria.charAt(0).toUpperCase() + criteria.slice(1),
            maxPoints: 100,
            achievedPoints: achievedPoints as number
          })),
          feedback: mockResult.feedback.strengths.join('; ') + '. ' + mockResult.feedback.improvements.join('; '),
          ipfsHash: mockResult.tx_hash
        }
      }

      const response = await axios.post<SubmitCodeResponse>(
        `${TEE_URL}/challenge/submit`,
        {
          sessionId,
          code,
          language
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit code'
      setError(errorMessage)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const submitAnswer = useCallback(async (sessionId: string, questionId: string, answer: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await axios.post<SubmitCodeResponse>(
        `${TEE_URL}/challenge/answer`,
        {
          sessionId,
          questionId,
          answer
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer'
      setError(errorMessage)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    submitCode,
    submitAnswer,
    isSubmitting,
    error
  }
}
