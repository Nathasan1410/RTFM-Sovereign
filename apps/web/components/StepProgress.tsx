"use client";

import { CheckCircle, Circle, Clock, ChevronRight, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicroStep {
  step_id: number;
  step_title: string;
  step_objective: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
  verificationStatus?: "pending" | "verified" | "failed";
  verificationFeedback?: string;
}

interface Milestone {
  milestone_id: number;
  title: string;
  description: string;
  micro_steps: MicroStep[];
  isCompleted?: boolean;
  isCurrent?: boolean;
  estimated_time?: number;
  key_concepts?: string[];
}

interface StepProgressProps {
  milestones: Milestone[];
  currentMilestoneId?: number;
  currentMicroStepId?: number;
  completedMicroSteps: number[];
  verificationResults?: Map<number, { status: "verified" | "failed"; feedback?: string }>;
  onStepClick?: (milestoneId: number, microStepId: number) => void;
}

export default function StepProgress({
  milestones,
  currentMilestoneId,
  currentMicroStepId,
  completedMicroSteps,
  verificationResults = new Map(),
  onStepClick,
}: StepProgressProps) {
  const totalMicroSteps = milestones.reduce((sum, m) => sum + m.micro_steps.length, 0);
  const completedCount = completedMicroSteps.length;
  const progressPercentage = totalMicroSteps > 0 ? (completedCount / totalMicroSteps) * 100 : 0;

  return (
    <div className="w-full space-y-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-sm">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
            Learning Path
          </h3>
        </div>
        <div className="text-xs font-mono text-zinc-500">
          {completedCount}/{totalMicroSteps} Steps Completed
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Milestones Timeline */}
      <div className="space-y-6">
        {milestones.map((milestone, milestoneIdx) => {
          const isMilestoneCurrent = milestone.milestone_id === currentMilestoneId;
          const isMilestoneCompleted = milestone.isCompleted || 
            milestone.micro_steps.every(ms => completedMicroSteps.includes(ms.step_id));

          return (
            <div
              key={milestone.milestone_id}
              className={cn(
                "relative pl-6 border-l-2 transition-colors",
                isMilestoneCompleted
                  ? "border-green-600/50"
                  : isMilestoneCurrent
                  ? "border-blue-500"
                  : "border-zinc-700"
              )}
            >
              {/* Milestone Marker */}
              <div
                className={cn(
                  "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                  isMilestoneCompleted
                    ? "bg-green-600 border-green-600"
                    : isMilestoneCurrent
                    ? "bg-blue-600 border-blue-600"
                    : "bg-zinc-800 border-zinc-600"
                )}
              >
                {isMilestoneCompleted && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>

              {/* Milestone Header */}
              <div
                className={cn(
                  "p-3 rounded-sm mb-3 cursor-pointer transition-colors",
                  isMilestoneCurrent
                    ? "bg-blue-950/20 border border-blue-900/30"
                    : "bg-zinc-900/30 border border-zinc-800 hover:bg-zinc-900/50"
                )}
                onClick={() => {
                  const firstStepId = milestone.micro_steps[0]?.step_id;
                  if (firstStepId !== undefined) {
                    onStepClick?.(milestone.milestone_id, firstStepId);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-sm",
                        isMilestoneCompleted
                          ? "bg-green-950/30 text-green-400"
                          : isMilestoneCurrent
                          ? "bg-blue-950/30 text-blue-400"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      M{milestone.milestone_id}
                    </span>
                    <h4
                      className={cn(
                        "text-sm font-semibold",
                        isMilestoneCurrent ? "text-blue-200" : "text-zinc-300"
                      )}
                    >
                      {milestone.title}
                    </h4>
                  </div>
                  {milestone.estimated_time && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>{milestone.estimated_time}m</span>
                    </div>
                  )}
                </div>
                {milestone.key_concepts && milestone.key_concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {milestone.key_concepts.slice(0, 3).map((concept, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-sm"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Micro-Steps */}
              <div className="space-y-2">
                {milestone.micro_steps.map((microStep, stepIdx) => {
                  const isStepCompleted = completedMicroSteps.includes(microStep.step_id);
                  const isStepCurrent = microStep.step_id === currentMicroStepId;
                  const verificationResult = verificationResults.get(microStep.step_id);

                  return (
                    <div
                      key={microStep.step_id}
                      className={cn(
                        "relative ml-4 p-3 rounded-sm border-l-2 cursor-pointer transition-all",
                        isStepCompleted
                          ? "bg-green-950/10 border-green-600/50 hover:bg-green-950/20"
                          : isStepCurrent
                          ? "bg-blue-950/20 border-blue-500 hover:bg-blue-950/30"
                          : "bg-zinc-900/20 border-zinc-700 hover:bg-zinc-900/40"
                      )}
                      onClick={() => onStepClick?.(milestone.milestone_id, microStep.step_id)}
                    >
                      {/* Step Number & Title */}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                            isStepCompleted
                              ? "bg-green-600 text-white"
                              : isStepCurrent
                              ? "bg-blue-600 text-white"
                              : "bg-zinc-700 text-zinc-400"
                          )}
                        >
                          {isStepCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span>{stepIdx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5
                            className={cn(
                              "text-sm font-medium truncate",
                              isStepCurrent ? "text-blue-200" : "text-zinc-300"
                            )}
                          >
                            {microStep.step_title}
                          </h5>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {microStep.step_objective}
                          </p>
                        </div>
                        {isStepCurrent && (
                          <ChevronRight className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
                        )}
                      </div>

                      {/* Verification Status */}
                      {verificationResult && (
                        <div
                          className={cn(
                            "mt-2 p-2 rounded-sm text-xs flex items-center gap-2",
                            verificationResult.status === "verified"
                              ? "bg-green-950/30 text-green-400 border border-green-900/30"
                              : "bg-red-950/30 text-red-400 border border-red-900/30"
                          )}
                        >
                          {verificationResult.status === "verified" ? (
                            <>
                              <Trophy className="w-3 h-3" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3 h-3" />
                              <span>Needs Improvement</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Verification Feedback */}
                      {verificationResult?.feedback && verificationResult.status === "failed" && (
                        <div className="mt-2 p-2 bg-red-950/20 border border-red-900/20 rounded-sm">
                          <p className="text-xs text-red-300">{verificationResult.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
