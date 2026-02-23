'use client'
import { useState, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { type Address } from 'viem'
import { SKILL_ATTESTATION_ABI, SKILL_ATTESTATION_ADDRESS } from '@/config/contracts'
import { isDemoMode, mockAttestation } from '@/lib/demoMode'

/**
 * Interface representing a skill attestation
 */
export interface Attestation {
  score: bigint
  timestamp: bigint
  signature: string
}

/**
 * Custom hook for managing skill attestations.
 * Provides methods to get and verify attestations from the smart contract.
 * 
 * @returns Object containing attestation methods and state
 * @returns {Function} returns.getAttestation - Function to retrieve attestation data
 * @returns {Function} returns.verifyAttestation - Function to verify attestation validity
 * @returns {string|null} returns.error - Error message if any
 * 
 * @example
 * ```tsx
 * const { getAttestation, verifyAttestation } = useAttestation()
 * 
 * // Get attestation data
 * const attestation = await getAttestation(address, 'Solidity')
 * 
 * // Verify attestation
 * const isValid = await verifyAttestation(address, 'Solidity')
 * ```
 */
export function useAttestation() {
  const [error, setError] = useState<string | null>(null)

  const getAttestation = useCallback(async (user: Address, skill: string) => {
    try {
      const result = await useReadContract({
        address: SKILL_ATTESTATION_ADDRESS,
        abi: SKILL_ATTESTATION_ABI,
        functionName: 'getAttestation',
        args: [user, skill]
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get attestation'
      setError(errorMessage)
      throw err
    }
  }, [])

  const verifyAttestation = useCallback(async (user: Address, skill: string) => {
    try {
      if (isDemoMode()) {
        return mockAttestation(user, skill)
      }

      const result = await useReadContract({
        address: SKILL_ATTESTATION_ADDRESS,
        abi: SKILL_ATTESTATION_ABI,
        functionName: 'verifyAttestation',
        args: [user, skill]
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify attestation'
      setError(errorMessage)
      throw err
    }
  }, [])

  return {
    getAttestation,
    verifyAttestation,
    error
  }
}

/**
 * Custom hook for fetching attestation data from the smart contract.
 * Automatically fetches attestation when user and skill are provided.
 * 
 * @param user - Optional user wallet address
 * @param skill - Optional skill/topic name
 * @returns Object containing attestation data and state
 * @returns {Attestation|null} returns.attestation - Attestation data or null
 * @returns {boolean} returns.isLoading - Whether data is being fetched
 * @returns {Error|null} returns.error - Error message if any
 * @returns {boolean} returns.exists - Whether attestation exists for the user/skill
 * 
 * @example
 * ```tsx
 * const { attestation, isLoading, exists } = useAttestationData(address, 'Solidity')
 * 
 * if (isLoading) return <div>Loading...</div>
 * if (!exists) return <div>No attestation found</div>
 * 
 * console.log('Score:', attestation?.score)
 * console.log('Timestamp:', attestation?.timestamp)
 * ```
 */
export function useAttestationData(user?: Address, skill?: string) {
  const { data: attestation, isLoading, error } = useReadContract({
    address: SKILL_ATTESTATION_ADDRESS,
    abi: SKILL_ATTESTATION_ABI,
    functionName: 'verifyAttestation',
    args: user && skill ? [user, skill] : undefined,
    query: {
      enabled: !!user && !!skill
    }
  })

  return {
    attestation: attestation ? {
      score: attestation[0],
      timestamp: attestation[1],
      signature: attestation[2]
    } : null,
    isLoading,
    error,
    exists: attestation !== undefined && attestation[0] > BigInt(0)
  }
}
