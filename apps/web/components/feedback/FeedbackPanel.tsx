'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface RubricItem {
  criteria: string
  maxPoints: number
  achievedPoints: number
  feedback?: string
}

interface FeedbackPanelProps {
  score: number
  totalScore: number
  rubric: RubricItem[]
  status: 'pending' | 'graded' | 'failed'
  onRetry?: () => void
  showDetails?: boolean
}

export function FeedbackPanel({
  score,
  totalScore,
  rubric,
  status,
  onRetry,
  showDetails: initialShowDetails = false
}: FeedbackPanelProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails)
  const percentage = Math.round((score / totalScore) * 100)
  const isPassed = percentage >= 70

  const getStatusIcon = () => {
    if (status === 'pending') return <AlertCircle className="w-6 h-6 text-yellow-500" />
    if (isPassed) return <CheckCircle className="w-6 h-6 text-green-500" />
    return <XCircle className="w-6 h-6 text-red-500" />
  }

  const getStatusText = () => {
    if (status === 'pending') return 'Pending Evaluation'
    if (isPassed) return 'Challenge Passed!'
    return 'Challenge Failed'
  }

  const getStatusColor = () => {
    if (status === 'pending') return 'border-yellow-500/50 bg-yellow-500/5'
    if (isPassed) return 'border-green-500/50 bg-green-500/5'
    return 'border-red-500/50 bg-red-500/5'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-6 ${getStatusColor()}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="mt-1">{getStatusIcon()}</div>
          <div>
            <h3 className="text-xl font-bold">{getStatusText()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {status === 'pending' 
                ? 'Your code is being evaluated by the TEE...'
                : `You scored ${score} out of ${totalScore} points (${percentage}%)`
              }
            </p>
          </div>
        </div>

        {status !== 'pending' && (
          <div className="text-right">
            <div className={`text-3xl font-bold ${isPassed ? 'text-green-500' : 'text-red-500'}`}>
              {percentage}%
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {isPassed ? 'Passed' : 'Failed'}
            </div>
          </div>
        )}
      </div>

      {status !== 'pending' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-4"
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View Rubric Breakdown
              </>
            )}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3"
              >
                {rubric.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      item.achievedPoints === item.maxPoints
                        ? 'border-green-500/20 bg-green-500/5'
                        : item.achievedPoints > 0
                        ? 'border-yellow-500/20 bg-yellow-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.criteria}</p>
                        {item.feedback && (
                          <p className="text-sm text-muted-foreground mt-1">{item.feedback}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          item.achievedPoints === item.maxPoints
                            ? 'text-green-500'
                            : item.achievedPoints > 0
                            ? 'text-yellow-500'
                            : 'text-red-500'
                        }`}>
                          {item.achievedPoints}/{item.maxPoints}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!isPassed && onRetry && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onRetry}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all"
            >
              Retry Challenge
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
