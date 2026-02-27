"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Clock, FileText, Shield, Zap } from "lucide-react";

interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete';
  details?: string;
}

interface RoadmapLoadingProps {
  topic: string;
  mode: 'learn' | 'proof';
  stakeTxHash?: string;
}

export function RoadmapLoading({ topic, mode, stakeTxHash }: RoadmapLoadingProps) {
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: 'stake',
      label: mode === 'proof' ? 'Staking ETH' : 'Preparing',
      status: mode === 'proof' ? 'loading' : 'complete',
      details: mode === 'proof' ? 'Waiting for transaction confirmation...' : 'Ready'
    },
    {
      id: 'analyze',
      label: 'Analyzing Topic',
      status: 'pending',
      details: 'AI is analyzing your learning goals...'
    },
    {
      id: 'generate',
      label: 'Generating Roadmap',
      status: 'pending',
      details: 'Creating personalized learning path...'
    },
    {
      id: 'verify',
      label: 'Verifying Content',
      status: 'pending',
      details: 'TEE is verifying roadmap quality...'
    }
  ]);

  useEffect(() => {
    // Simulate progress through steps
    const timeouts = [
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'analyze' ? { ...step, status: 'loading' } : step
        ));
      }, 2000),
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'analyze' ? { ...step, status: 'complete', details: 'Topic analyzed successfully' } : step
        ));
      }, 4000),
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'generate' ? { ...step, status: 'loading' } : step
        ));
      }, 4500),
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'generate' ? { ...step, status: 'complete', details: 'Roadmap generated' } : step
        ));
      }, 8000),
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'verify' ? { ...step, status: 'loading' } : step
        ));
      }, 8500),
      setTimeout(() => {
        setSteps(prev => prev.map(step => 
          step.id === 'verify' ? { ...step, status: 'complete', details: 'Verified on-chain' } : step
        ));
      }, 10000)
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30">
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            <span className="text-sm font-mono text-orange-400">Generating Your Roadmap</span>
          </div>
          
          <h1 className="text-3xl font-bold font-mono text-zinc-50">
            {topic}
          </h1>
          
          <p className="text-zinc-400">
            This takes about 30-60 seconds. Here's what's happening:
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-4 rounded-sm border transition-all ${
                step.status === 'complete'
                  ? 'border-green-900/50 bg-green-950/10'
                  : step.status === 'loading'
                  ? 'border-orange-900/50 bg-orange-950/10'
                  : 'border-zinc-800 bg-zinc-900/30'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {step.status === 'complete' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : step.status === 'loading' ? (
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  ) : (
                    <Clock className="w-6 h-6 text-zinc-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      step.status === 'complete'
                        ? 'text-green-400'
                        : step.status === 'loading'
                        ? 'text-orange-400'
                        : 'text-zinc-500'
                    }`}>
                      {index + 1}. {step.label}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${
                    step.status === 'complete'
                      ? 'text-green-500/70'
                      : step.status === 'loading'
                      ? 'text-orange-500/70'
                      : 'text-zinc-600'
                  }`}>
                    {step.details}
                  </p>
                </div>

                {/* Progress Bar */}
                {step.status === 'loading' && (
                  <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 animate-pulse w-2/3" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Info */}
        {mode === 'proof' && stakeTxHash && (
          <div className="p-4 rounded-sm border border-green-900/50 bg-green-950/10">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-green-400">
                  Stake Transaction Submitted
                </h3>
                <p className="text-xs text-green-500/70 mt-1">
                  Your 0.001 ETH is being staked. Transaction hash:
                </p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${stakeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-green-400 hover:text-green-300 mt-2 break-all"
                >
                  <Zap className="w-3 h-3" />
                  {stakeTxHash.slice(0, 10)}...{stakeTxHash.slice(-8)}
                  <span className="text-green-500/50">↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Time */}
        <div className="text-center">
          <p className="text-xs text-zinc-500 font-mono">
            ⏱️ Estimated time: 30-60 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
