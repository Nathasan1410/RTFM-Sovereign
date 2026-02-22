import { useAttest, AttestationResult } from '@/hooks/useAttest'
import { useState } from 'react'

interface AttestationCardProps {
  topic: string
  challengeId: string
  answers: any[]
}

export function AttestationCard({ topic, challengeId, answers }: AttestationCardProps) {
  const { submitToTEE, recordOnChain, isSubmittingToTEE, isRecording, isRecorded, attestationResult, error, hash } = useAttest()

  const handleSubmit = async () => {
    try {
      await submitToTEE(topic, challengeId, answers)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRecord = () => {
    recordOnChain(topic)
  }

  if (attestationResult) {
    return (
      <div className="p-6 border rounded-xl bg-card shadow-lg max-w-md mx-auto mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🎓 Skill Verified
          {attestationResult.score >= 90 && <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full">MASTER</span>}
        </h3>
        
        <div className="flex justify-between items-center mb-4 p-4 bg-muted/50 rounded-lg">
          <span className="text-muted-foreground">Score</span>
          <span className={`text-2xl font-bold ${attestationResult.score >= 90 ? 'text-green-500' : attestationResult.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
            {attestationResult.score}/100
          </span>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-xs text-muted-foreground uppercase font-bold">Cryptographic Proof</label>
          <div className="text-xs font-mono bg-muted p-3 rounded break-all border">
            {attestationResult.signature}
          </div>
        </div>

        {!isRecorded ? (
          <button 
            onClick={handleRecord} 
            disabled={isRecording}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all"
          >
            {isRecording ? 'Recording on Chain...' : 'Mint On-Chain Proof'}
          </button>
        ) : (
          <div className="text-center space-y-2">
            <div className="text-green-500 font-bold flex items-center justify-center gap-2">
              ✅ Recorded on Blockchain
            </div>
            <a 
              href={`https://sepolia.etherscan.io/tx/${hash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline block"
            >
              View Transaction
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 border rounded-xl bg-card shadow-sm mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Ready to Submit?</h3>
        <span className="text-sm text-muted-foreground">{answers.length} answers recorded</span>
      </div>
      
      <button 
        onClick={handleSubmit} 
        disabled={isSubmittingToTEE}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50"
      >
        {isSubmittingToTEE ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> Verifying in TEE...
          </span>
        ) : 'Submit Answers for Verification'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm text-center">
          {error.message}
        </div>
      )}
    </div>
  )
}
