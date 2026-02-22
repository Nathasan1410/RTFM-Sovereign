'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { useFaucetRequest } from '@/hooks/useFaucetRequest'

export default function SovereignPage() {
  const { requestFunds, isRequesting, isAvailable, cooldownRemaining } = useFaucetRequest()

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-8">
      <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        RTFM Sovereign
      </h1>
      <p className="text-xl max-w-2xl text-center text-muted-foreground">
        Prove your technical skills with AI-generated challenges.
        Staked, deterministic, and verified in a TEE.
      </p>
      
      <div className="flex flex-col md:flex-row gap-4 items-center w-full max-w-md">
        <ConnectButton />
        
        <div className="flex gap-2 w-full">
          <Link href="/sovereign/stake/solidity" className="flex-1 text-center px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-all shadow-lg shadow-primary/20">
            Start Challenge
          </Link>
          
          <button 
            onClick={requestFunds} 
            disabled={!isAvailable || isRequesting}
            className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-80 font-medium disabled:opacity-50 text-sm whitespace-nowrap transition-all border border-border"
          >
            {isRequesting ? '⏳' : !isAvailable ? `Wait ${Math.ceil(cooldownRemaining/60000)}m` : '💧 Faucet'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
        <div className="p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="text-primary">01.</span> Stake
          </h3>
          <p className="text-muted-foreground text-sm">Commit 0.001 ETH to prove you're serious. Your stake backs your skill.</p>
        </div>
        <div className="p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="text-primary">02.</span> Solve
          </h3>
          <p className="text-muted-foreground text-sm">Complete a rigorous, AI-generated challenge inside a secure TEE environment.</p>
        </div>
        <div className="p-6 border rounded-xl bg-card hover:border-primary/50 transition-colors">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="text-primary">03.</span> Attest
          </h3>
          <p className="text-muted-foreground text-sm">Receive a cryptographic signature proving your mastery forever.</p>
        </div>
      </div>
    </div>
  )
}
