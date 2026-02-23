'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { MonacoEditor } from '@/components/editor/MonacoEditor'
import { StepNavigator } from '@/components/navigation/StepNavigator'
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel'
import { EditorErrorBoundary } from '@/components/error/EditorErrorBoundary'
import { useSessionStore, useActiveSession, type MilestoneData } from '@/lib/sessionStore'
import { useSession } from '@/hooks/useSession'
import { useStake } from '@/hooks/useStake'
import { useSubmitCode } from '@/hooks/useSubmitCode'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { enableDemoMode, disableDemoMode } from '@/lib/demoMode'
import { toast } from 'sonner'

export default function LearnPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const { address } = useAccount()
  const { session: sessionData, isLoading } = useSession(sessionId)
  const { updateMilestone } = useSessionStore()
  const { hasStake, stake, isPending: isStaking } = useStake(address, sessionData?.topic)
  const { submitCode, submitAnswer, isSubmitting } = useSubmitCode()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [code, setCode] = useState('')
  const [answer, setAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState<any>(null)
  
  const activeSession = useActiveSession()

  useEffect(() => {
    if (!isLoading && !sessionData) {
      router.push('/sovereign')
    }
  }, [isLoading, sessionData, router])

  useEffect(() => {
    let keyCount = 0
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        keyCount++
        if (keyCount === 3) {
          enableDemoMode()
        }
        
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          keyCount = 0
        }, 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    )
  }

  if (!sessionData) {
    return null
  }

  const currentModule: MilestoneData | undefined = sessionData.milestones.find(m => m.id === currentStep)
  const totalSteps = sessionData.milestones.length
  const isLastStep = currentStep === totalSteps

  const steps = sessionData.milestones.map(m => ({
    id: m.id,
    title: `Milestone ${m.id}: ${m.title}`,
    status: m.status as 'pending' | 'active' | 'completed' | 'failed'
  }))

  const handleStepChange = (stepId: number) => {
    setCurrentStep(stepId)
    setShowFeedback(false)
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1)
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit()
    } else {
      handleStepChange(currentStep + 1)
    }
  }

  const handleSubmit = async () => {
    if (!sessionId || !currentModule) return

    try {
      const response = await submitCode(sessionId, code, 'typescript')
      setFeedbackData(response)
      setShowFeedback(true)
      
      if (response.success && response.score !== undefined) {
        updateMilestone(sessionId, currentModule.id, {
          status: response.score >= 70 ? 'completed' : 'failed',
          score: response.score,
          feedback: response.feedback ?? undefined
        })
      }
    } catch (error) {
      console.error('Failed to submit:', error)
    }
  }

  const handleRetry = () => {
    setShowFeedback(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <StepNavigator
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>

        {!hasStake && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 border border-yellow-500/50 bg-yellow-500/5 rounded-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Stake Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to stake 0.001 ETH to continue with this challenge.
                  This ensures commitment and enables attestation on-chain.
                </p>
              </div>
              <Button
                onClick={() => stake(sessionData.topic)}
                disabled={isStaking}
                className="bg-primary text-primary-foreground"
              >
                {isStaking ? 'Staking...' : 'Stake 0.001 ETH'}
              </Button>
            </div>
          </motion.div>
        )}

        {currentModule && (
          <motion.div
            key={currentModule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 border rounded-xl bg-card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{currentModule.title}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase ${
                      currentModule.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' :
                      currentModule.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {currentModule.difficulty}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Module {currentModule.id} of {totalSteps}
                </div>
              </div>

              {currentModule.description && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{currentModule.description}</p>
                </div>
              )}

              {currentModule.questions?.map((question, index) => (
                <div key={question.id} className="mb-6 last:mb-0">
                  <div className="mb-4">
                    <p className="font-medium mb-2">{question.prompt}</p>
                    <div className="text-xs text-muted-foreground">
                      Points: {question.expectedPoints}
                    </div>
                  </div>

                  {question.language ? (
                    <EditorErrorBoundary>
                      <MonacoEditor
                        value={code}
                        onChange={(value) => setCode(value ?? '')}
                        language={question.language}
                        height="300px"
                        options={{ readOnly: showFeedback }}
                      />
                    </EditorErrorBoundary>
                  ) : (
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={showFeedback}
                      placeholder="Type your answer here..."
                      className="w-full p-4 border rounded-lg bg-background min-h-[150px] focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-y"
                    />
                  )}
                </div>
              ))}
            </div>

            {showFeedback && feedbackData && (
              <FeedbackPanel
                score={feedbackData.score || 0}
                totalScore={feedbackData.totalScore || 100}
                rubric={feedbackData.rubric || []}
                status={feedbackData.success ? 'graded' : 'failed'}
                onRetry={handleRetry}
                showDetails={true}
              />
            )}

            {!showFeedback && (
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
