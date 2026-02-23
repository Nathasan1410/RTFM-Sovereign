'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Star, Copy, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { QRCode } from '@/components/ui/QRCode';

interface CredentialCardProps {
  address: string;
  skill: string;
  score: number;
  timestamp: number;
  signature: string;
  ipfsHash: string;
}

export function CredentialCard({ address, skill, score, timestamp, signature, ipfsHash }: CredentialCardProps) {
  const [showQR, setShowQR] = useState(false);
  const formatAddress = (addr: string) => `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getScoreColor = () => {
    if (score >= 90) return 'text-yellow-500';
    if (score >= 70) return 'text-green-500';
    return 'text-red-500';
  };

  const getScoreLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Passed';
    return 'Failed';
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard', { duration: 2000 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-8 bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${score >= 70 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {score >= 70 ? (
                  <Award className="w-12 h-12 text-green-500" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500" />
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Verified Skill Credential</div>
                <h1 className="text-2xl font-bold capitalize">{skill}</h1>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <div className={`font-bold ${getScoreColor()}`}>
                    {score}/100
                  </div>
                </Badge>
                <Badge
                  variant={score >= 70 ? 'default' : 'destructive'}
                  className="text-base px-3 py-1"
                >
                  {getScoreLabel()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">Score:</span>
                  <span className={`font-bold ${getScoreColor()}`}>{score}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-purple-500" />
                  <span className="text-muted-foreground">Grade:</span>
                  <span className="font-bold">{getScoreLabel()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono bg-muted/50 px-2 py-1 rounded text-xs">
                      {formatAddress(address)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAddress}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Attested:</span>
                  <span className="font-mono">{formatTimestamp(timestamp)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-48 flex flex-col items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Scan to Verify</div>
              <div className="bg-white p-3 rounded-lg inline-block">
                <QRCode value={`${window.location.origin}/verify/${address}`} size={128} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
