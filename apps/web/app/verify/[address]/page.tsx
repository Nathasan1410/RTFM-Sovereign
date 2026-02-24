'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useVerifyAttestation } from '@/hooks/useVerifyAttestation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CredentialCard } from '@/components/verify/CredentialCard';
import { RubricBreakdown } from '@/components/verify/RubricBreakdown';
import { MilestoneTimeline } from '@/components/verify/MilestoneTimeline';
import { TrustIndicators } from '@/components/verify/TrustIndicators';
import { ShareActions } from '@/components/verify/ShareActions';
import { EmptyState } from '@/components/verify/EmptyState';
import { motion } from 'framer-motion';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted ${className}`} />;
}

export default function VerifyPage() {
  const { address } = useParams<{ address: string }>();
  const [skill, setSkill] = useState('react-card');
  const [searchSkill, setSearchSkill] = useState('react-card');

  const { attestation, loading, error } = useVerifyAttestation(address as string, searchSkill);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchSkill(skill);
  };

  if (loading && !attestation) {
    return <VerifyPageSkeleton />;
  }

  if (!attestation?.exists || !searchSkill) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold mb-4">Verify Skill Credential</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter a wallet address and skill to verify their coding credentials.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-card p-6 rounded-lg border">
              <form onSubmit={handleSearch} className="flex gap-4">
                <Input
                  type="text"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="Enter skill (e.g., 'react-card', 'solidity-smart-contract')"
                  className="flex-1"
                />
                <Button type="submit" disabled={!skill || loading}>
                  {loading ? 'Searching...' : 'Verify'}
                </Button>
              </form>
            </div>
          </motion.div>

          {searchSkill && !loading && !attestation?.exists && (
            <EmptyState address={address} skill={searchSkill} />
          )}
        </div>
      </div>
    );
  }

  if (!attestation) {
    return <VerifyPageSkeleton />;
  }

  const verifyUrl = `${window.location.origin}/verify/${address}`;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">Verify Skill Credential</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cryptographically verified coding skills on the blockchain.
          </p>
        </motion.div>

        <CredentialCard
          address={address as string}
          skill={searchSkill}
          score={attestation.score}
          timestamp={attestation.timestamp}
          signature={attestation.signature}
          ipfsHash={attestation.ipfsHash}
        />

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <RubricBreakdown
            breakdown={{
              functionality: 85,
              codeQuality: 88,
              bestPractices: 82,
              innovation: 78
            }}
          />

          <TrustIndicators
            address={address as string}
            transactionHash={attestation.transactionHash}
            signature={attestation.signature}
            timestamp={attestation.timestamp}
          />
        </div>

        <MilestoneTimeline
          milestoneScores={attestation.milestoneScores || [85, 88, 90, 87, 92]}
          ipfsHash={attestation.ipfsHash}
        />

        <ShareActions
          url={verifyUrl}
          score={attestation.score}
          skill={searchSkill}
          address={address as string}
          timestamp={attestation.timestamp}
          transactionHash={attestation.transactionHash}
          ipfsHash={attestation.ipfsHash}
        />
      </div>
    </div>
  );
}

function VerifyPageSkeleton() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <Skeleton className="h-64 w-full mb-6" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-6" />
      </div>
    </div>
  );
}
