"use client";

import { useState, useEffect } from "react";
import { X, Flame, BookOpen, Shield, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SKILL_STAKING_ABI, SKILL_STAKING_ADDRESS } from "@/config/contracts";
import { Button } from "@/components/ui/button";
import { parseEther, formatEther } from "viem";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnMode: () => void;
  onProofMode: (txHash: string) => void;
  topic: string;
}

export function StakingModal({ isOpen, onClose, onLearnMode, onProofMode, topic }: StakingModalProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [isStaking, setIsStaking] = useState(false);
  const [stakeTxHash, setStakeTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'learn' | 'proof' | null>(null);

  // Check existing stake for this topic
  const { data: existingStake, refetch: refetchStake } = useReadContract({
    address: SKILL_STAKING_ADDRESS,
    abi: SKILL_STAKING_ABI,
    functionName: 'stakes',
    args: [address as `0x${string}`, topic as string],
    query: {
      enabled: !!address && !!topic && isOpen && selectedMode === 'proof',
    }
  });

  const isAlreadyStaked = existingStake && (existingStake as any)?.[0] > BigInt(0);
  const stakedAmount = existingStake && (existingStake as any)?.[0] ? formatEther((existingStake as any)[0]) : '0';

  // Wait for transaction confirmation
  useWaitForTransactionReceipt({
    hash: stakeTxHash,
    query: {
      enabled: !!stakeTxHash,
    },
  });

  // Handle Learn Mode (no staking)
  const handleLearnMode = () => {
    setSelectedMode('learn');
    onLearnMode();
    onClose();
  };

  // Handle Proof Mode - ACTUAL STAKING LOGIC
  const handleProofMode = async () => {
    setSelectedMode('proof');
    setStakingError(null);

    // If already staked, skip staking and go straight to roadmap
    if (isAlreadyStaked) {
      console.log('✅ Already staked for this topic, proceeding to roadmap generation');
      onProofMode();
      onClose();
      return;
    }

    // NOT staked yet - MUST stake now
    setIsStaking(true);
    setStakeTxHash(undefined);

    try {
      console.log('🔷 Initiating stake transaction for topic:', topic);
      
      // STEP 1: Write to contract - THIS ACTUALLY STAKES ETH
      const hash = await writeContractAsync({
        address: SKILL_STAKING_ADDRESS,
        abi: SKILL_STAKING_ABI,
        functionName: 'stake',
        args: [topic],
        value: parseEther('0.001'), // EXACTLY 0.001 ETH
      });

      console.log('🔷 Transaction submitted:', hash);
      setStakeTxHash(hash);

      // STEP 2: Wait for confirmation (handled by useWaitForTransactionReceipt)
      // We poll to check when it's confirmed
      const receipt = await waitForTransactionReceipt(hash);
      
      console.log('🔷 Transaction receipt:', receipt);

      if (receipt.status === 'success') {
        console.log('✅ Staking successful!');

        // Refresh stake data
        await refetchStake();

        // STEP 3: Generate roadmap AFTER successful stake
        onProofMode(hash); // Pass tx hash to parent for loading screen
        onClose();
      } else {
        throw new Error('Transaction failed on chain');
      }
    } catch (error: any) {
      console.error('❌ Staking failed:', error);
      
      // Handle specific error cases
      if (error.message?.includes('user rejected') || 
          error.message?.includes('User rejected') ||
          error.message?.includes('rejected transaction')) {
        setStakingError('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds') ||
                 error.message?.includes('Insufficient funds')) {
        setStakingError('Insufficient ETH balance. You need 0.001 ETH for staking.');
      } else {
        setStakingError(error.message || 'Staking failed. Please try again.');
      }
    } finally {
      setIsStaking(false);
    }
  };

  // Helper to poll for transaction receipt
  const waitForTransactionReceipt = async (hash: `0x${string}`) => {
    // Poll every 1 second for up to 60 seconds
    for (let i = 0; i < 60; i++) {
      try {
        const receipt = await (window as any).ethereum?.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        });
        
        if (receipt) {
          return { status: receipt.status === '0x1' ? 'success' : 'reverted' };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error('Error polling for receipt:', e);
      }
    }
    throw new Error('Transaction confirmation timeout');
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMode(null);
      setStakingError(null);
      setIsStaking(false);
      setStakeTxHash(undefined);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-xl border-zinc-800 bg-zinc-900 text-zinc-50">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl font-bold font-mono tracking-tight">
            Choose Your Mode
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            How do you want to learn <span className="text-zinc-200 font-mono">{topic}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Learn Mode Option */}
          <button
            onClick={handleLearnMode}
            disabled={isStaking}
            className="w-full text-left p-5 border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 border border-zinc-700 bg-zinc-800 rounded-sm flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold font-mono text-zinc-100">Learn Mode</h3>
                  <span className="text-xs font-mono px-2 py-0.5 border border-zinc-800 bg-zinc-950 text-zinc-500 rounded-sm">
                    FREE
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Self-paced learning with local progress tracking. No staking required.
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-mono">
                  <span>✓ Local verification</span>
                  <span>✓ No commitment</span>
                  <span>✓ Flexible pace</span>
                </div>
              </div>
            </div>
          </button>

          {/* Proof Mode Option */}
          <button
            onClick={handleProofMode}
            disabled={isStaking || !isConnected}
            className={`w-full text-left p-5 border rounded-sm transition-all group
                       ${isAlreadyStaked 
                         ? 'border-green-500/50 bg-green-500/10' 
                         : 'border-orange-500/50 hover:border-orange-500/70 hover:bg-orange-500/10'
                       }
                       disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-sm flex items-center justify-center
                            ${isAlreadyStaked ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                {isAlreadyStaked ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <Shield className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold font-mono text-zinc-100 flex items-center gap-1.5">
                    Proof Mode
                    {isAlreadyStaked ? null : <Flame className="w-4 h-4 text-orange-500" />}
                  </h3>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-sm
                                  ${isAlreadyStaked 
                                    ? 'border border-green-500/30 bg-green-500/10 text-green-400' 
                                    : 'border border-orange-500/30 bg-orange-500/10 text-orange-400'
                                  }`}>
                    {isAlreadyStaked ? 'STAKED' : '0.001 ETH'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {isAlreadyStaked ? (
                    <span className="text-green-400">Already staked {stakedAmount} ETH for this skill!</span>
                  ) : (
                    "Stake 0.001 ETH to enable TEE verification & on-chain rewards."
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-mono">
                  <span>✓ TEE verification</span>
                  <span>✓ On-chain proof</span>
                  <span>✓ 80% refund on pass</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {isStaking ? (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                ) : (
                  <span className="text-zinc-600 group-hover:text-zinc-400">→</span>
                )}
              </div>
            </div>
          </button>

          {/* Staking Status / Error Messages */}
          {isStaking && (
            <div className="p-3 border border-orange-500/30 bg-orange-500/10 rounded-sm space-y-2">
              <div className="flex items-center gap-2 text-sm text-orange-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                {stakeTxHash ? (
                  <span>Confirming transaction...</span>
                ) : (
                  <span>Waiting for wallet confirmation...</span>
                )}
              </div>
              {stakeTxHash && (
                <div className="text-xs text-zinc-500 font-mono break-all">
                  Tx: {stakeTxHash}
                </div>
              )}
              <div className="text-xs text-zinc-500">
                Amount: 0.001 ETH
              </div>
            </div>
          )}

          {stakingError && (
            <div className="p-3 border border-red-500/30 bg-red-500/10 rounded-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <div className="text-sm text-red-400">{stakingError}</div>
              </div>
              <button
                onClick={() => setStakingError(null)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-400"
              >
                Dismiss
              </button>
            </div>
          )}

          {!isConnected && (
            <div className="p-3 border border-yellow-500/30 bg-yellow-500/10 rounded-sm">
              <div className="text-sm text-yellow-400">
                Please connect your wallet to use Proof Mode
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 border border-zinc-700 bg-zinc-800/50 rounded-sm text-xs text-zinc-400 space-y-1">
            <div className="font-mono">💡 How it works:</div>
            <div>• <strong>Learn Mode:</strong> Free, local verification only</div>
            <div>• <strong>Proof Mode:</strong> 0.001 ETH stake, TEE verification</div>
            <div>• Complete all modules → 80% refund (pass) or 20% refund (fail)</div>
            <div>• Milestones recorded on-chain for Proof Mode</div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-600 text-center font-mono">
            Proof Mode: Stake is locked in SkillStaking contract. Pass threshold: 70%
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
