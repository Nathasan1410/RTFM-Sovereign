'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { AttestationCard } from '@/components/attestation/AttestationCard'

export default function ChallengePage() {
  const { challengeId } = useParams()
  const router = useRouter()
  const [challenge, setChallenge] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])

  useEffect(() => {
    // Load challenge from local storage (set by loading page)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`challenge-${challengeId}`)
      if (stored) {
        setChallenge(JSON.parse(stored))
      }
    }
  }, [challengeId, router])

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-muted-foreground">Loading Challenge Context...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Challenge: {challenge.topic}</h1>
          <p className="text-muted-foreground">Complete all modules to prove your mastery.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs font-mono bg-secondary px-3 py-1 rounded border">
            ID: {challenge.challengeId}
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Seed: {challenge.seed?.substring(0, 10)}...
          </div>
        </div>
      </div>
      
      {challenge.modules.map((module: any) => (
        <div key={module.id} className="p-6 border rounded-xl bg-card shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-6 border-b pb-4 border-border/50">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">
                {module.id}
              </span>
              Module {module.id}
            </h3>
            <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wide ${
              module.difficulty === 'hard' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
              module.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
              'bg-green-500/10 text-green-500 border border-green-500/20'
            }`}>
              {module.difficulty}
            </span>
          </div>
          
          {module.questions.map((q: any) => (
            <div key={q.id} className="mb-8 last:mb-0">
              <div className="mb-4">
                <p className="font-medium text-lg leading-relaxed">{q.prompt}</p>
                <div className="text-xs text-muted-foreground mt-2 font-mono">
                  Points: {q.expectedPoints}
                </div>
              </div>
              <textarea 
                className="w-full p-4 border rounded-lg bg-background/50 min-h-[150px] focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-y font-mono text-sm"
                placeholder="// Type your detailed answer here..."
                onChange={(e) => {
                  const newAnswers = [...answers]
                  const index = newAnswers.findIndex(a => a.questionId === q.id)
                  if (index >= 0) newAnswers[index].answer = e.target.value
                  else newAnswers.push({ questionId: q.id, answer: e.target.value })
                  setAnswers(newAnswers)
                }}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="sticky bottom-8 z-10">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl -z-10 rounded-xl"></div>
        <AttestationCard 
          topic={challenge.topic} 
          challengeId={challengeId as string} 
          answers={answers} 
        />
      </div>
    </div>
  )
}
