'use client'

import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { type Hash } from 'viem'

/**
 * Parameters for submitting an attestation
 */
interface SubmitAttestationParams {
  /** Session UUID from the TEE server */
  sessionId: string
}

/**
 * Result from submitting an attestation
 */
interface SubmitAttestationResult {
  /** Whether the operation was successful */
  success: boolean
  /** Transaction hash on success */
  txHash?: string
  /** IPFS hash of the code snapshot */
  ipfsHash?: string
  /** Final score (0-100) */
  finalScore?: number
  /** Error message on failure */
  error?: string
  /** Error code for programmatic handling */
  code?: string
  /** Timestamp of the operation */
  timestamp?: number
}

/**
 * Return type for useSubmitAttestation hook
 */
interface UseSubmitAttestationReturn {
  /** Function to submit final attestation on-chain */
  submitAttestation: (params: SubmitAttestationParams) => Promise<SubmitAttestationResult>
  /** Whether a submission operation is in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Clear any error state */
  clearError: () => void
  /** Last transaction hash if successful */
  lastTxHash: string | null
  /** Last final score if successful */
  lastFinalScore: number | null
}

/**
 * Hook for submitting final skill attestation on-chain via the TEE server
 * 
 * @example
 * ```tsx
 * const { submitAttestation, isLoading, error, lastFinalScore } = useSubmitAttestation()
 * 
 * const handleSubmitAttestation = async () => {
 *   const result = await submitAttestation({
 *     sessionId: 'session-uuid'
 *   })
 *   
 *   if (result.success) {
 *     console.log('Attestation submitted! Score:', result.finalScore)
 *     console.log('TX:', result.txHash)
 *   } else {
 *     console.error('Failed:', result.error)
 *   }
 * }
 * ```
 */
export function useSubmitAttestation(): UseSubmitAttestationReturn {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [lastFinalScore, setLastFinalScore] = useState<number | null>(null)

  const submitAttestation = useCallback(async (
    params: SubmitAttestationParams
  ): Promise<SubmitAttestationResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contract/submit-attestation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const result: SubmitAttestationResult = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to submit attestation')
        return result
      }

      // Store transaction hash and score
      if (result.txHash) {
        setLastTxHash(result.txHash)
      }
      if (result.finalScore !== undefined) {
        setLastFinalScore(result.finalScore)
      }

      // Wait for transaction confirmation if public client is available
      if (result.txHash && publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({
            hash: result.txHash as Hash,
          })
        } catch (waitError) {
          // Non-fatal: transaction was submitted, just waiting failed
          console.warn('Failed to wait for transaction confirmation:', waitError)
        }
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
        code: 'NETWORK_ERROR'
      }
    } finally {
      setIsLoading(false)
    }
  }, [publicClient])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    submitAttestation,
    isLoading,
    error,
    clearError,
    lastTxHash,
    lastFinalScore
  }
}
