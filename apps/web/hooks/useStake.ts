'use client'

import { useState, useCallback } from 'react'
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, type Address } from 'viem'
import { SKILL_STAKING_ABI, SKILL_STAKING_ADDRESS } from '@/config/contracts'
import { isDemoMode, mockStake } from '@/lib/demoMode'

export function useStake(user?: Address, skill?: string) {
  const { data: hash, writeContract, isPending: isWriting } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const { data: stakeAmount } = useReadContract({
    address: SKILL_STAKING_ADDRESS,
    abi: SKILL_STAKING_ABI,
    functionName: 'verifyStake',
    args: user && skill ? [user, skill] : undefined,
    query: {
      enabled: !!user && !!skill
    }
  })

  const [error, setError] = useState<string | null>(null)

  const stake = useCallback(async (skillToStake: string) => {
    setError(null)

    try {
      if (isDemoMode()) {
        const mockResult = await mockStake(skillToStake)
        return mockResult
      }

      writeContract({
        address: SKILL_STAKING_ADDRESS,
        abi: SKILL_STAKING_ABI,
        functionName: 'stake',
        args: [skillToStake],
        value: parseEther('0.001')
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake'
      setError(errorMessage)
      throw err
    }
  }, [writeContract])

  const claimRefund = useCallback(async (skillToClaim: string) => {
    if (!user) {
      setError('User address is required')
      throw new Error('User address is required')
    }

    setError(null)

    try {
      writeContract({
        address: SKILL_STAKING_ADDRESS,
        abi: SKILL_STAKING_ABI,
        functionName: 'claimRefund',
        args: [user, skillToClaim]
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim refund'
      setError(errorMessage)
      throw err
    }
  }, [writeContract, user])

  return {
    stake,
    claimRefund,
    hasStake: stakeAmount !== undefined && (stakeAmount as bigint) > BigInt(0),
    stakeAmount,
    isPending: isWriting || isConfirming,
    error,
    hash
  }
}
