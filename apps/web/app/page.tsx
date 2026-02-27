"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Terminal, Zap, Flame, Wallet, BookOpen, CheckCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecentRoadmaps } from "@/components/recent-roadmaps";
import { StakingModal } from "@/components/staking-modal";
import { RoadmapLoading } from "@/components/RoadmapLoading";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Roadmap } from "@/types/schemas";

const SUGGESTIONS = [
  "React Hooks",
  "System Design",
  "Rust Lifetimes",
  "Solidity Security",
];

function GlitchDot() {
  // Fixed pattern to prevent hydration mismatch
  const glitchChars = ["·", "·"];

  return (
    <span className="relative h-2 w-2 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,255,0.18)] overflow-hidden flex items-center justify-center text-[6px] font-mono leading-none tracking-tighter">
      {glitchChars.map((char, i) => (
        <span key={`${i}-${char}`} className={`absolute ${i < glitchChars.length - 1 ? 'opacity-100' : 'opacity-0'}`}>
          {char}
        </span>
      ))}
    </span>
  );
}

function PoweredByPill() {
  // Removed animation to prevent unnecessary re-renders
  return (
    <div className="mt-6 flex justify-center">
      <div className="inline-flex items-center gap-1.25 rounded-full bg-black px-1.75 py-1.25 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-white">
        <GlitchDot />
        <span className="relative h-[12.5px] min-w-[136px] overflow-hidden font-mono text-[9px] font-semibold tracking-wide flex items-center justify-center">
          <span className="absolute transition-all duration-500 flex items-center justify-center w-full opacity-100 translate-y-0">
            Powered by EigenLayer
          </span>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [version, setVersion] = useState<"lite" | "pro">("lite");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);
  const [pendingTopic, setPendingTopic] = useState("");
  const [stakeTxHash, setStakeTxHash] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("all");
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const addRoadmap = useAppStore((state) => state.addRoadmap);
  const apiKeys = useAppStore((state) => state.apiKeys);
  const roadmaps = useAppStore((state) => state.roadmaps);
  const progressState = useAppStore((state) => state.progress);
  const hasRoadmaps = Object.keys(roadmaps).length > 0;

  // Calculate roadmap counts
  const roadmapCounts = useMemo(() => {
    const all = Object.values(roadmaps);
    let inProgress = 0;
    let completed = 0;

    all.forEach((roadmap) => {
      const completedModules = roadmap.modules.filter((m) => 
        progressState[`${roadmap.id}_${m.id}`]?.isCompleted
      ).length;
      const progress = (completedModules / roadmap.modules.length) * 100;
      
      if (progress === 100) {
        completed++;
      } else if (progress > 0) {
        inProgress++;
      }
    });

    return {
      total: all.length,
      inProgress,
      completed,
    };
  }, [roadmaps, progressState]);

  const handleGenerateRoadmap = async (mode: "learn" | "proof", txHash?: string) => {
    const cleanTopic = pendingTopic.trim();
    setIsStakingModalOpen(false);
    setError(null);
    setIsGenerating(true); // Show loading screen
    setIsLoading(true);

    // Store stake tx hash if provided
    if (txHash) {
      setStakeTxHash(txHash);
      console.log("[Home Page] Stake transaction:", txHash);
    }

    try {
      // Get existing roadmaps titles for context
      const existingTitles = Object.values(roadmaps).map((r) => r.title);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKeys.groq) headers["x-api-key-groq"] = apiKeys.groq;
      if (apiKeys.cerebras) headers["x-api-key-cerebras"] = apiKeys.cerebras;

      const requestBody: any = {
        topic: cleanTopic,
        existingTitles,
        version,
        mode,
      };
      if (isConnected && address) {
        requestBody.userAddress = address;
        console.log("[Home Page] Wallet connected:", address);
      } else {
        console.log("[Home Page] Wallet not connected, using demo mode");
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("API returned non-JSON:", text);
        throw new Error(
          `Server Error: Received ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate roadmap");
      }

      const newId = nanoid(21);
      const newRoadmap: Roadmap = {
        id: newId,
        title: data.title,
        topic: cleanTopic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userAddress: data.userAddress,
        sessionId: data.sessionId,
        isStaked: mode === "proof",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modules: data.modules.map((m: any) => ({
          ...m,
          id: nanoid(21), // Generate IDs for modules here
        })),
      };

      await addRoadmap(newRoadmap);
      router.push(`/roadmap/${newId}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setIsGenerating(false); // Hide loading on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTopic = topic.trim();

    // Validation
    if (cleanTopic.length < 3) {
      setError("Topic must be at least 3 characters");
      return;
    }
    if (cleanTopic.length > 100) {
      setError("Topic must be less than 100 characters");
      return;
    }

    setPendingTopic(cleanTopic);
    setIsStakingModalOpen(true);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-56px)] py-20 px-6 overflow-hidden bg-zinc-950">
      {/* Loading Screen - Shows during roadmap generation */}
      {isGenerating && pendingTopic && (
        <RoadmapLoading
          topic={pendingTopic}
          mode="proof"
          stakeTxHash={stakeTxHash}
        />
      )}

      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-50">
          READ THE F*CKING MANUAL
          <span className="text-zinc-500 animate-[blink_1s_step-end_infinite] text-[1.2em] -ml-4">
            |
          </span>
        </h1>
        <PoweredByPill />
        <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
          AI generates structured roadmaps that force you to read official
          documentation. No tutorials. No spoon-feeding. Just you and the
          manual.
        </p>
      </div>


      {/* Input Interface */}
      <div className="w-full max-w-xl mt-6">
        <form onSubmit={handleSubmit} className="relative group">
          <label
            htmlFor="topic"
            className="block text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2 pl-1"
          >
            What do you want to master?
          </label>

          <div
            className={cn(
              "relative flex items-center bg-zinc-900 border rounded-sm overflow-hidden transition-colors",
              error
                ? "border-red-500 ring-1 ring-red-500"
                : "border-zinc-700 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600",
              isLoading && "opacity-80 cursor-not-allowed border-zinc-600",
            )}
          >
            <Terminal
              className={cn(
                "absolute left-4 w-5 h-5 transition-colors",
                error ? "text-red-500" : "text-zinc-600",
              )}
            />
            <Input
              id="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Next.js App Router, Rust Ownership..."
              className="h-16 pl-12 pr-32 text-lg bg-transparent border-none focus-visible:ring-0 placeholder:text-zinc-700 text-zinc-50 font-mono"
              disabled={isLoading}
              autoComplete="off"
            />

            <Button
              type="submit"
              disabled={!topic.trim() || isLoading}
              className={cn(
                "absolute right-2 top-3 h-10 px-4 rounded-sm text-sm font-mono font-medium transition-all",
                version === "pro"
                  ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span>
                    {version === "pro" ? "Deep research" : "Consulting docs"}
                  </span>
                  <span>█</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Generate {version === "pro"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>

                {/* Version Toggle */}
          <div className="w-full max-w-xl mt-8">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setVersion("lite")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-mono transition-all",
                  version === "lite"
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                    : "bg-transparent text-zinc-500 hover:text-zinc-400 border border-transparent hover:border-zinc-800",
                )}
              >
                <Flame className="w-4 h-4" />
                <span>Lite</span>
                <span className="text-xs opacity-60">(Fast)</span>
              </button>
              <button
                onClick={() => setVersion("pro")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-mono transition-all",
                  version === "pro"
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                    : "bg-transparent text-zinc-500 hover:text-zinc-400 border border-transparent hover:border-zinc-800",
                )}
              >
                <Zap className="w-4 h-4" />
                <span>Pro</span>
                <span className="text-xs opacity-60">(Deeper)</span>
              </button>
            </div>
            <p className="text-xs text-zinc-600 text-center mt-2 font-mono">
              {version === "lite"
                ? "Single-pass generation • 5-7 modules • Great for quick learning"
                : "Multi-agent system • Deep research • Specialized per module"}
            </p>
          </div>


          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-500 font-mono mt-2 pl-1">
              {error}
            </p>
          )}
        </form>

        {/* Empty State Suggestions */}
        {!hasRoadmaps && !isLoading && (
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 mb-4">
              Type a topic above to generate your first learning roadmap.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">
                Try:
              </span>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setTopic(suggestion);
                    setError(null);
                    // Optional: focus input
                    document.getElementById("topic")?.focus();
                  }}
                  className="text-xs font-mono border border-zinc-800 bg-zinc-900 px-2 py-1 rounded-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Roadmap Navigation */}
      {hasRoadmaps && (
        <div className="w-full max-w-3xl mx-auto mt-12 mb-8">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setFilter("all");
                setTimeout(() => {
                  document.getElementById("roadmaps")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-sm border transition-colors cursor-pointer",
                filter === "all"
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-mono">
                {roadmapCounts.total} Roadmap{roadmapCounts.total !== 1 ? 's' : ''}
              </span>
            </button>
            
            {roadmapCounts.inProgress > 0 && (
              <button
                onClick={() => {
                  setFilter("in-progress");
                  setTimeout(() => {
                    document.getElementById("roadmaps")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-sm border transition-colors cursor-pointer",
                  filter === "in-progress"
                    ? "border-amber-600 bg-amber-900/30 text-amber-100"
                    : "border-amber-900/50 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 hover:text-amber-200"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-mono">
                  {roadmapCounts.inProgress} In Progress
                </span>
              </button>
            )}
            
            {roadmapCounts.completed > 0 && (
              <button
                onClick={() => {
                  setFilter("completed");
                  setTimeout(() => {
                    document.getElementById("roadmaps")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-sm border transition-colors cursor-pointer",
                  filter === "completed"
                    ? "border-green-600 bg-green-900/30 text-green-100"
                    : "border-green-900/50 bg-green-950/20 text-green-400 hover:bg-green-900/30 hover:text-green-200"
                )}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-mono">
                  {roadmapCounts.completed} Completed
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Roadmaps */}
      <div id="roadmaps" className="scroll-mt-20">
        <RecentRoadmaps filter={filter} />
      </div>

      {/* Staking Mode Modal */}
      <StakingModal
        isOpen={isStakingModalOpen}
        onClose={() => setIsStakingModalOpen(false)}
        onLearnMode={() => handleGenerateRoadmap("learn")}
        onProofMode={(txHash) => handleGenerateRoadmap("proof", txHash)}
        topic={pendingTopic}
      />
    </div>
  );
}
