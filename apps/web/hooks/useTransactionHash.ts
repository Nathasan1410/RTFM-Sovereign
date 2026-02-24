'use client';

import { usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { SKILL_ATTESTATION_ADDRESS, SKILL_ATTESTATION_ABI } from '@/config/contracts';
import { keccak256, toBytes } from 'viem';

export function useTransactionHash(address: string, skill: string) {
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    const fetchTxHash = async () => {
      if (!address || !skill || !publicClient) return;

      const cacheKey = `rtfm_tx_${address}_${skill}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setTxHash(cached);
        return;
      }

      setLoading(true);
      
      try {
        const skillHash = keccak256(toBytes(skill));
        
        const logs = await publicClient.getLogs({
          address: SKILL_ATTESTATION_ADDRESS as `0x${string}`,
          event: {
            name: 'AttestationCreated',
            type: 'event',
            inputs: [
              { name: 'user', type: 'address', indexed: true },
              { name: 'skillHash', type: 'bytes32', indexed: true },
              { name: 'tokenId', type: 'uint256', indexed: false },
              { name: 'uri', type: 'string', indexed: false }
            ]
          },
          args: {
            user: address as `0x${string}`,
            skillHash
          }
        });

        const matchingLog = logs[0];
        
        if (matchingLog?.transactionHash) {
          setTxHash(matchingLog.transactionHash);
          localStorage.setItem(cacheKey, matchingLog.transactionHash);
          console.log('[RTFM] Transaction hash fetched:', matchingLog.transactionHash);
        } else {
          console.log('[RTFM] No AttestationCreated event found for', address, skill);
        }
      } catch (error) {
        console.error('[RTFM] Error fetching transaction hash:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTxHash();
  }, [address, skill, publicClient]);

  return { txHash, loading };
}
