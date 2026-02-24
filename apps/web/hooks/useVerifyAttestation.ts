'use client';

import { useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SKILL_ATTESTATION_ADDRESS, SKILL_ATTESTATION_ABI } from '@/config/contracts';
import { AttestationData } from '@/types/attestation';
import { isDemoMode, mockAttestation, enableDemoMode } from '@/lib/demoMode';
import { useTransactionHash } from './useTransactionHash';

export function useVerifyAttestation(address: string, skill: string) {
  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { txHash, loading: txLoading } = useTransactionHash(address, skill);

  const { data: rawData, isLoading: contractLoading, error: contractError } = useReadContract({
    address: SKILL_ATTESTATION_ADDRESS,
    abi: SKILL_ATTESTATION_ABI,
    functionName: 'verifyAttestation',
    args: [address as `0x${string}`, skill],
    query: {
      enabled: !!address && !!skill && !isDemoMode()
    }
  });

  useEffect(() => {
    if (contractError && !isDemoMode()) {
      console.log('[RTFM] Contract read error, enabling demo mode fallback:', contractError);
      enableDemoMode();
      toast.error('Blockchain unavailable - Switched to Demo Preview', {
        description: 'RPC connection failed. Showing simulated data.',
        duration: 8000,
      });
      return;
    }

    if (isDemoMode()) {
      const mockData = mockAttestation(address, skill);
      setAttestation({
        exists: mockData.exists,
        score: mockData.score,
        timestamp: mockData.timestamp,
        signature: mockData.transactionHash,
        ipfsHash: mockData.ipfsHash,
        transactionHash: txHash || mockData.transactionHash,
        milestoneScores: [85, 88, 90, 87, 92]
      });
      setLoading(false);
      return;
    }

    if (!contractLoading && rawData) {
      const data = rawData as unknown;

      if (!data) {
        setAttestation({
          exists: false,
          score: 0,
          timestamp: 0,
          signature: '',
          ipfsHash: '',
          transactionHash: ''
        });
        setLoading(false);
        return;
      }

      const dataArray = Array.isArray(data) ? data : [];

      if (dataArray.length >= 3) {
        const [score, timestamp, signature] = dataArray as unknown as readonly [bigint, bigint, string];
        const ipfsHash = signature.substring(0, 46);

        setAttestation({
          exists: true,
          score: Number(score),
          timestamp: Number(timestamp),
          signature,
          ipfsHash,
          transactionHash: txHash || '',
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
    loading: loading || contractLoading || txLoading,
    error
  };
}
