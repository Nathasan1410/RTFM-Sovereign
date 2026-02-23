'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useAccount } from 'wagmi'

const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

function LoadingPageContent() {
  const searchParams = useSearchParams()
  const topic = searchParams.get('topic')
  const router = useRouter()
  const { address } = useAccount()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChallenge = async () => {
      if (!topic || !address) return

      try {
        const response = await fetch(`${TEE_URL}/challenge/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAddress: address, topic })
        })

        if (!response.ok) throw new Error('Failed to generate challenge')

        const data = await response.json()
        // Store challenge data in localStorage to retrieve it on the challenge page
        if (typeof window !== 'undefined') {
          localStorage.setItem(`challenge-${data.challengeId}`, JSON.stringify(data))
        }
        
        router.push(`/sovereign/challenge/${data.challengeId}`)
      } catch (err) {
        console.error(err)
        setError((err as Error).message)
      }
    }

    fetchChallenge()
  }, [topic, address, router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500 gap-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold">Generation Failed</h2>
        <p className="text-muted-foreground">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Retry Generation
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
        <div className="relative text-6xl animate-bounce">🔮</div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Summoning TEE...</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generating a deterministic challenge for <span className="font-mono text-primary font-bold">{topic}</span> based on your wallet signature.
        </p>
      </div>

      <div className="w-64 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary w-1/2 animate-[shimmer_2s_infinite]"></div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Powered by EigenAI & Groq Fallback Layer
      </p>
    </div>
  )
}

export default function LoadingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">Loading...</div>}>
      <LoadingPageContent />
    </Suspense>
  )
}
