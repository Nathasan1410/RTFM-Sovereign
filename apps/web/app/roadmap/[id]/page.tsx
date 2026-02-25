"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Calendar, LayoutGrid, Shield, Flame, ExternalLink, CheckCircle } from "lucide-react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { SKILL_STAKING_ABI, SKILL_STAKING_ADDRESS } from "@/config/contracts";
import { formatEther, keccak256, toBytes } from "viem";
import { Button } from "@/components/ui/button";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { ModuleCard } from "@/components/module-card";
import { DeleteRoadmapDialog } from "@/components/delete-roadmap-dialog";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const router = useRouter();
  const roadmaps = useAppStore((state) => state.roadmaps);
  const deleteRoadmap = useAppStore((state) => state.deleteRoadmap);
  const progressState = useAppStore((state) => state.progress);
  const isLoadingStore = useAppStore((state) => state.isLoading);
  const { address } = useAccount();

  const { id } = use(params);
  const roadmap = roadmaps[id];
  if (!roadmap) {
    // If roadmap is not found after initial load, show 404 UI
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl font-mono text-zinc-500">
          {isLoadingStore ? "Loading Roadmap..." : "Roadmap Not Found"}
        </h1>
        <Button 
          variant="link" 
          onClick={() => router.push("/")}
          className="mt-4 text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return Home
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalModules = roadmap.modules.length;
  const completedModules = roadmap.modules.filter(m => 
    progressState[`${roadmap.id}_${m.id}`]?.isCompleted
  ).length;

  const handleDelete = () => {
    deleteRoadmap(roadmap.id);
    setIsDeleteDialogOpen(false);
    router.push("/");
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-6 pb-20">
      {/* 1. Page Header */}
      <header className="mb-8">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0 hover:bg-transparent hover:text-zinc-200 text-zinc-400 transition-colors"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Command Center
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-mono text-zinc-50 tracking-tight">
              {roadmap.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(roadmap.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" />
                {totalModules} Modules
              </span>
              <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-sm text-zinc-400 uppercase tracking-wider">
                {roadmap.topic}
              </span>
              {roadmap.isStaked ? (
                <span className="flex items-center gap-1.5 text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded-sm">
                  <Flame className="w-3.5 h-3.5" />
                  Proof Mode
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-zinc-400 border border-zinc-700 bg-zinc-800 px-2 py-0.5 rounded-sm">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Learn Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Delete Roadmap"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Progress Dashboard */}
      <ProgressDashboard total={totalModules} completed={completedModules} />

      {/* Staking Status Section - Only for Proof Mode */}
      {roadmap.isStaked && address && (
        <StakingStatusSection 
          roadmap={roadmap} 
          address={address} 
          completedModules={completedModules}
          totalModules={totalModules}
        />
      )}

      {/* 3. Module List */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-600">
            Modules
          </h2>
          {completedModules < totalModules && (
             <span className="text-xs font-mono text-zinc-500">
               Next: Module {completedModules + 1}
             </span>
          )}
        </div>

        <div className="space-y-3">
          {roadmap.modules.map((module, index) => {
             const isCompleted = progressState[`${roadmap.id}_${module.id}`]?.isCompleted || false;
             // Logic for "current": First incomplete module
             // or if all complete, none is current (or last one)
             // Simple logic: index === completedModules count (0-based index)
             const isCurrent = index === completedModules;

             return (
               <div key={module.id} className={cn(
                 "transition-all duration-300",
                 isCurrent && "translate-x-2"
               )}>
                 <ModuleCard
                   module={module}
                   roadmapId={roadmap.id}
                   isCompleted={isCompleted}
                   isCurrent={isCurrent}
                   // isLocked={isLocked} // Optional locking, disabled for now to allow free navigation
                 />
               </div>
             );
          })}
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <DeleteRoadmapDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={roadmap.title}
      />
    </div>
  );
}

// Staking Status Section Component
function StakingStatusSection({ 
  roadmap, 
  address, 
  completedModules, 
  totalModules 
}: { 
  roadmap: any; 
  address: `0x${string}`; 
  completedModules: number; 
  totalModules: number;
}) {
  const { writeContractAsync } = useWriteContract();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [claimError, setClaimError] = useState<string | null>(null);

  // Convert topic string to bytes32 for contract calls
  const topicHash = keccak256(toBytes(roadmap.topic));

  // Fetch stake data
  const { data: stakeData, refetch: refetchStake } = useReadContract({
    address: SKILL_STAKING_ADDRESS,
    abi: SKILL_STAKING_ABI,
    functionName: 'stakes',
    args: [address, topicHash],
    query: {
      enabled: !!address && !!roadmap.topic,
    },
  });

  const isAllModulesComplete = completedModules >= totalModules;
  const hasRefunded = stakeData && (stakeData as any)?.refunded;

  const handleClaimRefund = async (passed: boolean) => {
    setIsClaiming(true);
    setClaimError(null);

    try {
      const finalScore = passed ? 100 : 50;
      
      const hash = await writeContractAsync({
        address: SKILL_STAKING_ADDRESS,
        abi: SKILL_STAKING_ABI,
        functionName: 'claimRefund',
        args: [address, roadmap.topic, BigInt(finalScore)],
      });

      setClaimTxHash(hash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(hash);
      
      if (receipt.status === 'success') {
        await refetchStake();
        alert(`✅ Refund claimed! ${passed ? '80%' : '20%'} of stake returned.`);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Claim failed:', error);
      setClaimError(error.message || 'Failed to claim refund');
    } finally {
      setIsClaiming(false);
    }
  };

  const waitForTransactionReceipt = async (hash: `0x${string}`) => {
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

  const stakeAmount = stakeData ? formatEther((stakeData as any).amount) : '0';

  return (
    <div className="mt-6 p-4 border border-orange-500/30 bg-orange-500/10 rounded-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="font-mono text-sm text-orange-400">
            Staked: {stakeAmount} ETH
          </span>
        </div>
        <a
          href={`https://sepolia.etherscan.io/address/${SKILL_STAKING_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View on Etherscan
        </a>
      </div>

      {/* Progress */}
      <div className="text-xs text-zinc-400 mb-3">
        Milestones: {completedModules}/{totalModules}
      </div>

      {/* Claim Buttons - Show when all modules complete */}
      {isAllModulesComplete && !hasRefunded && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-500">
            All modules complete! Choose your outcome:
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleClaimRefund(true)}
              disabled={isClaiming}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isClaiming ? (
                <span>Processing...</span>
              ) : (
                <span>✅ Pass - Claim 80% Refund</span>
              )}
            </Button>
            <Button
              onClick={() => handleClaimRefund(false)}
              disabled={isClaiming}
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              {isClaiming ? (
                <span>Processing...</span>
              ) : (
                <span>❌ Fail - Claim 20% Refund</span>
              )}
            </Button>
          </div>
          {claimTxHash && (
            <div className="text-xs text-zinc-500 font-mono">
              Tx: {claimTxHash}
            </div>
          )}
          {claimError && (
            <div className="text-xs text-red-400">
              Error: {claimError}
            </div>
          )}
        </div>
      )}

      {hasRefunded && (
        <div className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Refund already claimed
        </div>
      )}
    </div>
  );
}
