'use client'

import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { type Hash } from 'viem'

/**
 * Parameters for claiming a refund
 */
interface ClaimRefundParams {
  /** Session UUID from the TEE server */
  sessionId: string
}

/**
 * Result from claiming a refund
 */
interface ClaimRefundResult {
  /** Whether the operation was successful */
  success: boolean
  /** Transaction hash on success */
  txHash?: string
  /** Refund amount in wei */
  refundAmount?: string
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
 * Return type for useClaimRefund hook
 */
interface UseClaimRefundReturn {
  /** Function to claim refund on-chain */
  claimRefund: (params: ClaimRefundParams) => Promise<ClaimRefundResult>
  /** Whether a claim operation is in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Clear any error state */
  clearError: () => void
  /** Last transaction hash if successful */
  lastTxHash: string | null
  /** Last refund amount if successful */
  lastRefundAmount: string | null
}

/**
 * Hook for claiming skill refund on-chain via the TEE server
 * 
 * @example
 * ```tsx
 * const { claimRefund, isLoading, error, lastRefundAmount } = useClaimRefund()
 * 
 * const handleClaimRefund = async () => {
 *   const result = await claimRefund({
 *     sessionId: 'session-uuid'
 *   })
 *   
 *   if (result.success) {
 *     console.log('Refund claimed! Amount:', result.refundAmount)
 *     console.log('TX:', result.txHash)
 *   } else {
 *     console.error('Failed:', result.error)
 *   }
 * }
 * ```
 */
export function useClaimRefund(): UseClaimRefundReturn {
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [lastRefundAmount, setLastRefundAmount] = useState<string | null>(null)

  const claimRefund = useCallback(async (
    params: ClaimRefundParams
  ): Promise<ClaimRefundResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/contract/claim-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const result: ClaimRefundResult = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to claim refund')
        return result
      }

      // Store transaction hash and refund amount
      if (result.txHash) {
        setLastTxHash(result.txHash)
      }
      if (result.refundAmount) {
        setLastRefundAmount(result.refundAmount)
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
    claimRefund,
    isLoading,
    error,
    clearError,
    lastTxHash,
    lastRefundAmount
  }
}
