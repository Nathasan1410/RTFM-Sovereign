'use client';

import { useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { SKILL_ATTESTATION_ADDRESS, SKILL_ATTESTATION_ABI } from '@/config/contracts';
import { AttestationData } from '@/types/attestation';
import { isDemoMode, mockAttestation } from '@/lib/demoMode';

export function useVerifyAttestation(address: string, skill: string) {
  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: rawData, isLoading: contractLoading } = useReadContract({
    address: SKILL_ATTESTATION_ADDRESS,
    abi: SKILL_ATTESTATION_ABI,
    functionName: 'verifyAttestation',
    args: [address as `0x${string}`, skill],
    query: {
      enabled: !!address && !!skill && !isDemoMode()
    }
  });

  useEffect(() => {
    if (isDemoMode()) {
      const mockData = mockAttestation(address, skill);
      setAttestation({
        exists: mockData.exists,
        score: mockData.score,
        timestamp: mockData.timestamp,
        signature: mockData.transactionHash,
        ipfsHash: mockData.ipfsHash,
        transactionHash: mockData.transactionHash,
        milestoneScores: [85, 88, 90, 87, 92]
      });
      setLoading(false);
      return;
    }

    if (!contractLoading && rawData) {
      const [exists, score, timestamp, signature] = rawData as [boolean, bigint, bigint, string];

      if (exists) {
        const ipfsHash = signature.substring(0, 46);

        setAttestation({
          exists: true,
          score: Number(score),
          timestamp: Number(timestamp),
          signature,
          ipfsHash,
          transactionHash: '',
          milestoneScores: [85, 88, 90, 87, 92]
        });
      } else {
        setAttestation({
          exists: false,
          score: 0,
          timestamp: 0,
          signature: '',
          ipfsHash: '',
          transactionHash: ''
        });
      }

      setLoading(false);
      setError(null);
    } else if (!contractLoading && !rawData) {
      setAttestation({
        exists: false,
        score: 0,
        timestamp: 0,
        signature: '',
        ipfsHash: '',
        transactionHash: ''
      });
      setLoading(false);
      setError('Attestation not found');
    }
  }, [rawData, contractLoading, address, skill]);

  return {
    attestation,
    loading: loading || contractLoading,
    error
  };
}
