'use client'

import { useState, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import { type Address } from 'viem'
import { SKILL_ATTESTATION_ABI, SKILL_ATTESTATION_ADDRESS } from '@/config/contracts'
import { isDemoMode, mockAttestation } from '@/lib/demoMode'

export interface Attestation {
  score: bigint
  timestamp: bigint
  signature: string
}

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
