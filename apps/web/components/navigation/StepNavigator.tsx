'use client'

import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'

interface Step {
  id: number
  title: string
  status: 'pending' | 'active' | 'completed' | 'failed'
}

interface StepNavigatorProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepId: number) => void
  onPrevious?: () => void
  onNext?: () => void
  showArrows?: boolean
}

export function StepNavigator({
  steps,
  currentStep,
  onStepClick,
  onPrevious,
  onNext,
  showArrows = true
}: StepNavigatorProps) {
  const currentStepData = steps.find(s => s.id === currentStep)
  const canGoNext = currentStep < steps.length
  const canGoPrevious = currentStep > 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {showArrows && onPrevious && (
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous step"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 flex items-center justify-center gap-2 px-4">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = step.status === 'completed'
            const isLast = index === steps.length - 1

            return (
              <div key={step.id} className="flex items-center">
                <motion.button
                  onClick={() => onStepClick?.(step.id)}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted ? 'rgb(34 197 94)' : isActive ? 'rgb(59 130 246)' : 'rgb(71 85 105)'
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all cursor-pointer disabled:cursor-not-allowed
                    ${onStepClick ? '' : 'pointer-events-none'}
                  `}
                  disabled={step.status === 'pending' && !onStepClick}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.id}
                    </span>
                  )}

                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{ backgroundColor: isActive ? 'rgb(59 130 246)' : 'rgb(34 197 94)' }}
                    />
                  )}
                </motion.button>

                {!isLast && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-green-500' : step.status === 'pending' ? 'bg-muted' : 'bg-blue-500'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {showArrows && onNext && (
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next step"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {currentStepData && (
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
        </motion.div>
      )}
    </div>
  )
}
