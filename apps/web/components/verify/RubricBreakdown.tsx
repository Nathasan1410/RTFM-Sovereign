'use client';

import { motion } from 'framer-motion';
import { Zap, Code, Shield, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface RubricBreakdownProps {
  breakdown: {
    functionality: number;
    codeQuality: number;
    bestPractices: number;
    innovation: number;
  };
}

export function RubricBreakdown({ breakdown }: RubricBreakdownProps) {
  const criteria = [
    {
      name: 'Functionality',
      score: breakdown.functionality,
      weight: 40,
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      name: 'Code Quality',
      score: breakdown.codeQuality,
      weight: 30,
      icon: Code,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      name: 'Best Practices',
      score: breakdown.bestPractices,
      weight: 20,
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      name: 'Innovation',
      score: breakdown.innovation,
      weight: 10,
      icon: Lightbulb,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    }
  ];

  const weightedTotal = Math.round(
    (breakdown.functionality * 0.4) +
    (breakdown.codeQuality * 0.3) +
    (breakdown.bestPractices * 0.2) +
    (breakdown.innovation * 0.1)
  );

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-6">Rubric Breakdown</h3>

        <div className="space-y-4">
          {criteria.map((criterion) => (
            <div key={criterion.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <criterion.icon className={`w-4 h-4 ${criterion.color}`} />
                  <span className="font-medium">{criterion.name}</span>
                  <span className="text-sm text-muted-foreground">({criterion.weight}%)</span>
                </div>
                <span className="font-bold">{criterion.score}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${criterion.score}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className={`h-full ${getProgressColor(criterion.score)}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">Weighted Total</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{weightedTotal}/100</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  weightedTotal >= 90
                    ? 'bg-green-500/10 text-green-500'
                    : weightedTotal >= 70
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                {weightedTotal >= 70 ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
