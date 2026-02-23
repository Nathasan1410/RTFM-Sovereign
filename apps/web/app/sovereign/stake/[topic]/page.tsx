'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { SKILL_STAKING_ABI, SKILL_STAKING_ADDRESS } from '@/config/contracts'
import { useEffect } from 'react'

export default function StakePage() {
  const { topic } = useParams<{ topic: string }>()
  const router = useRouter()
  const { address } = useAccount()
  
  const { data: hash, writeContract, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isSuccess && topic) {
      // Redirect to challenge loading which will fetch the active challenge
      router.push(`/sovereign/challenge/loading?topic=${topic}`)
    }
  }, [isSuccess, router, topic])

  const handleStake = () => {
    if (!topic) return
    
    writeContract({
      address: SKILL_STAKING_ADDRESS,
      abi: SKILL_STAKING_ABI,
      functionName: 'stake',
      args: [topic],
      value: parseEther('0.001'),
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <h1 className="text-3xl font-bold capitalize">Stake for {topic}</h1>
      
      <div className="p-6 border rounded-xl bg-card max-w-md w-full shadow-lg">
        <div className="flex justify-between mb-4 text-sm text-muted-foreground">
          <span>Required Stake</span>
          <span className="font-mono font-bold text-foreground">0.001 ETH</span>
        </div>
        
        <div className="mb-6 text-sm text-muted-foreground">
          By staking, you commit to completing the challenge within 24 hours.
          Your stake ensures you are serious about proving your skill.
        </div>

        <button 
          onClick={handleStake}
          disabled={isPending || isConfirming || !address}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 font-bold transition-all hover:opacity-90"
        >
          {!address ? 'Connect Wallet' : isPending ? 'Check Wallet...' : isConfirming ? 'Confirming Transaction...' : 'Stake 0.001 ETH'}
        </button>
        
        {hash && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            <a 
              href={`https://sepolia.etherscan.io/tx/${hash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View on Etherscan
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
