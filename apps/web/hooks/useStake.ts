import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi'
import { parseEther } from 'viem'
import { REGISTRY_ABI } from '../config/abi'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`

export interface StakeResult {
  stake: () => void
  isPending: boolean
  isConfirming: boolean
  isSuccess: boolean
  hash: `0x${string}` | undefined
  error: Error | null
}

export function useStake(topic: string): StakeResult {
  const { address } = useAccount()
  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  })

  // Balance Check (Optional Pre-flight)
  const { data: balance } = useBalance({ address })

  const stake = () => {
    if (!address) {
      alert("Please connect wallet first")
      return
    }
    if (!topic) return

    if (balance && balance.value < parseEther('0.001')) {
      alert("Insufficient balance. You need 0.001 ETH + gas.")
      return
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'stakeForChallenge',
        args: [topic],
        value: parseEther('0.001'),
      })
    } catch (err) {
      console.error("Stake failed", err)
    }
  }

  return {
    stake,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError || receiptError
  }
}
