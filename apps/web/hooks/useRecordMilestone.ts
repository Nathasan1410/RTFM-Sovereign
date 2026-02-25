'use client'

import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { type Hash } from 'viem'

/**
 * Parameters for recording a milestone
 */
interface RecordMilestoneParams {
  /** Session UUID from the TEE server */
  sessionId: string
  /** Milestone ID (1-5) */
  milestoneId: number
}

/**
 * Result from recording a milestone
 */
interface RecordMilestoneResult {
  /** Whether the operation was successful */
  success: boolean
  /** Transaction hash on success */
  txHash?: string
  /** Error message on failure */
  error?: string
  /** Error code for programmatic handling */
  code?: string
  /** Milestone ID that was recorded */
  milestoneId?: number
  /** Timestamp of the operation */
  timestamp?: number
}

/**
 * Return type for useRecordMilestone hook
 */
interface UseRecordMilestoneReturn {
  /** Function to record a milestone on-chain */
  recordMilestone: (params: RecordMilestoneParams) => Promise<RecordMilestoneResult>
  /** Whether a recording operation is in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Clear any error state */
  clearError: () => void
  /** Last transaction hash if successful */
  lastTxHash: string | null
}

/**
 * Hook for recording milestones on-chain via the TEE server
 * 
 * @example
 * ```tsx
 * const { recordMilestone, isLoading, error } = useRecordMilestone()
 * 
 * const handleRecordMilestone = async () => {
 *   const result = await recordMilestone({
 *     sessionId: 'session-uuid',
 *     milestoneId: 1
 *   })
 *   
 *   if (result.success) {
 *     console.log('Milestone recorded:', result.txHash)
 *   } else {
 *     console.error('Failed:', result.error)
 *   }
 * }
 * ```
 */
export function useRecordMilestone(): UseRecordMilestoneReturn {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const recordMilestone = useCallback(async (
    params: RecordMilestoneParams
  ): Promise<RecordMilestoneResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contract/record-milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const result: RecordMilestoneResult = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to record milestone')
        return result
      }

      // Store transaction hash
      if (result.txHash) {
        setLastTxHash(result.txHash)
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
    recordMilestone,
    isLoading,
    error,
    clearError,
    lastTxHash
  }
}
