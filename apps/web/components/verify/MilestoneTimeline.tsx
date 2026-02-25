'use client';

import { motion } from 'framer-motion';
import { GitCommit, FileCode, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { fetchIpfsContent } from '@/lib/ipfs';

interface MilestoneData {
  id: number;
  title: string;
  code: string;
  score: number;
  feedback: string;
  timestamp: number;
}

interface MilestoneTimelineProps {
  milestoneScores: number[];
  ipfsHash?: string;
}

export function MilestoneTimeline({ milestoneScores, ipfsHash }: MilestoneTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [realMilestones, setRealMilestones] = useState<MilestoneData[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ipfsHash) {
      setLoading(true);
      fetchIpfsContent<{ milestones?: MilestoneData[] }>(ipfsHash)
        .then(data => {
          if (data?.milestones) {
            setRealMilestones(data.milestones);
          }
        })
        .catch(err => console.error('Failed to fetch milestones from IPFS:', err))
        .finally(() => setLoading(false));
    }
  }, [ipfsHash]);

  const milestones = realMilestones && realMilestones.length > 0
    ? realMilestones.map((m, index) => ({
        id: m.id,
        score: m.score,
        isCheckpoint: index === 2 || index === 4,
        timestamp: m.timestamp
      }))
    : milestoneScores.map((score, index) => ({
        id: index + 1,
        score,
        isCheckpoint: index === 2 || index === 4,
        timestamp: Date.now() - ((5 - index) * 86400000)
      }));

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-primary" />
          Code Evolution
        </h3>

        <div className="relative mb-6">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2" />

          <div className="relative flex justify-between">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMilestone(milestone.id)}
                  className={`relative z-10 w-10 h-10 rounded-full border-4 ${
                    milestone.isCheckpoint ? 'border-primary' : 'border-border'
                  } ${getScoreColor(milestone.score)} flex items-center justify-center text-white font-bold text-sm transition-all`}
                >
                  {milestone.id}
                </motion.button>

                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                  <div className={`font-bold ${milestone.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                    {milestone.score}%
                  </div>
                  {milestone.isCheckpoint && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      Checkpoint
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3 rounded-lg border transition-all ${
                selectedMilestone === milestone.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${getScoreColor(milestone.score)} flex items-center justify-center text-white font-bold text-xs`}>
                    {milestone.id}
                  </div>
                  <div>
                    <div className="font-medium">Milestone {milestone.id}</div>
                    <div className="text-xs text-muted-foreground">
                      Score: {milestone.score}/100
                    </div>
                  </div>
                  {milestone.isCheckpoint && (
                    <Badge variant="secondary" className="text-xs">
                      On-chain
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setSelectedMilestone(milestone.id)}
                >
                  <FileCode className="w-3 h-3" />
                  View Code
                </Button>
              </div>
            </div>
          ))}
        </div>

        {ipfsHash && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open(`https://ipfs.io/ipfs/${ipfsHash}`, '_blank')}
              className="w-full gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Full History on IPFS
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
