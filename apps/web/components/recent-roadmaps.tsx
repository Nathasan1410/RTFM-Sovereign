"use client";

import Link from "next/link";
import { BookOpen, CheckCircle, Trophy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";

export function RecentRoadmaps({ filter = "all" }: { filter?: "all" | "in-progress" | "completed" }) {
  const roadmaps = useAppStore((state) => state.roadmaps);
  const progressState = useAppStore((state) => state.progress);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Memoize roadmap categorization to prevent recalculation on every render
  const { completedRoadmaps, inProgressRoadmaps, notStartedRoadmaps, allRoadmaps } = useMemo(() => {
    const all = Object.values(roadmaps)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const categorized = {
      completed: [] as any[],
      inProgress: [] as any[],
      notStarted: [] as any[],
    };

    all.forEach((roadmap) => {
      const completedModules = roadmap.modules.filter((m: any) =>
        progressState[`${roadmap.id}_${m.id}`]?.isCompleted
      ).length;
      const progress = (completedModules / roadmap.modules.length) * 100;

      roadmap.progress = progress;
      roadmap.completedModules = completedModules;

      if (progress === 100) {
        categorized.completed.push(roadmap);
      } else if (progress > 0) {
        categorized.inProgress.push(roadmap);
      } else {
        categorized.notStarted.push(roadmap);
      }
    });

    return {
      allRoadmaps: all,
      completedRoadmaps: categorized.completed,
      inProgressRoadmaps: categorized.inProgress,
      notStartedRoadmaps: categorized.notStarted,
    };
  }, [roadmaps, progressState]);

  // Filter roadmaps by search query and category filter
  const filteredRoadmaps = useMemo(() => {
    let result = allRoadmaps;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((roadmap) =>
        roadmap.title.toLowerCase().includes(query) ||
        roadmap.topic.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (filter === "in-progress") {
      result = inProgressRoadmaps;
    } else if (filter === "completed") {
      result = completedRoadmaps;
    }
    
    return result;
  }, [allRoadmaps, searchQuery, filter, inProgressRoadmaps, completedRoadmaps]);

  // Pagination
  const totalPages = Math.ceil(filteredRoadmaps.length / itemsPerPage);
  const paginatedRoadmaps = filteredRoadmaps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (allRoadmaps.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-16">
      {/* Header with Search */}
      <div className="flex items-center justify-between mb-6 px-1 gap-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Your Learning Journey
        </h2>
        <span className="text-xs font-mono text-zinc-600">
          {filteredRoadmaps.length} of {allRoadmaps.length}
          {filter !== "all" && ` (${filter === "in-progress" ? "In Progress" : "Completed"})`}
        </span>
      </div>

      {/* Search Bar */}
      {allRoadmaps.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              placeholder={
                filter === "all" 
                  ? "Search all roadmaps..." 
                  : `Search ${filter === "in-progress" ? "in progress" : "completed"} roadmaps...`
              }
              className="w-full h-10 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-sm text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pagination - Top */}
      {totalPages > 1 && (
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="text-xs font-mono text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-3 rounded-sm border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-3 rounded-sm border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Completed Roadmaps */}
        {completedRoadmaps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-green-500" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-green-500">
                Completed ({completedRoadmaps.length})
              </h3>
            </div>
            <div className="space-y-3">
              {completedRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} progress={100} isCompleted />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Roadmaps */}
        {inProgressRoadmaps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-amber-500">
                In Progress ({inProgressRoadmaps.length})
              </h3>
            </div>
            <div className="space-y-3">
              {inProgressRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} progress={roadmap.progress} />
              ))}
            </div>
          </div>
        )}

        {/* Not Started Roadmaps */}
        {notStartedRoadmaps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Not Started ({notStartedRoadmaps.length})
              </h3>
            </div>
            <div className="space-y-3">
              {notStartedRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} progress={0} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination - Bottom */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 px-3 rounded-sm border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            Prev
          </button>
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={cn(
                  "h-8 w-8 rounded-sm border text-xs font-mono transition-colors",
                  currentPage === page
                    ? "border-green-900/50 bg-green-950/20 text-green-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 px-3 rounded-sm border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function RoadmapCard({ 
  roadmap, 
  progress, 
  isCompleted = false 
}: { 
  roadmap: any; 
  progress: number; 
  isCompleted?: boolean;
}) {
  return (
    <Link
      href={`/roadmap/${roadmap.id}`}
      className="block group relative"
    >
      <div
        className={cn(
          "flex flex-col border rounded-sm transition-all duration-200 overflow-hidden",
          isCompleted
            ? "border-green-900/50 bg-green-950/10 hover:border-green-900/70 hover:bg-green-950/20"
            : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/80",
          "active:scale-[0.99] active:border-zinc-500"
        )}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-sm border shrink-0 transition-colors",
            isCompleted
              ? "bg-green-950/20 border-green-900/50 text-green-500"
              : progress > 0
              ? "bg-amber-950/20 border-amber-900/50 text-amber-500"
              : "bg-zinc-950 border-zinc-800 text-zinc-600 group-hover:text-zinc-400 group-hover:border-zinc-700"
          )}>
            {isCompleted ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium font-mono text-zinc-300 truncate group-hover:text-zinc-50 transition-colors">
              {roadmap.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono group-hover:text-zinc-500">
                {new Date(roadmap.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-zinc-700">•</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono group-hover:text-zinc-500">
                {roadmap.modules.length} Mods
              </span>
              {roadmap.isStaked && (
                <>
                  <span className="text-[10px] text-zinc-700">•</span>
                  <span className="text-[10px] uppercase tracking-wider text-orange-500 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Staked
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Progress Text */}
          <div className="text-right shrink-0">
            <span
              className={cn(
                "text-xs font-mono tabular-nums",
                isCompleted ? "text-green-500 font-medium" : progress > 0 ? "text-amber-500" : "text-zinc-500 group-hover:text-zinc-400"
              )}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress Bar (Mini) */}
        {progress > 0 && (
          <div className="h-1 w-full bg-zinc-800">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out",
                isCompleted ? "bg-green-500" : "bg-amber-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
