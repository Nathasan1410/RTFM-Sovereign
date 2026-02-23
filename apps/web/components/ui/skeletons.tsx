import { cn } from '@/lib/utils';

export function EditorSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden border">
      <div className="h-12 bg-muted border-b" />
      <div className="h-[300px] bg-muted/50 animate-pulse" />
      <div className="h-10 bg-muted border-t" />
    </div>
  );
}

export function FeedbackSkeleton() {
  return (
    <div className="rounded-xl border p-6 space-y-4">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted/50 animate-pulse rounded" />
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-16 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg bg-muted/30">
            <div className="h-4 w-40 bg-muted animate-pulse rounded mb-2" />
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
              <div className="h-3 w-12 bg-muted/50 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center justify-between px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          {i < count - 1 && <div className="w-16 h-0.5 bg-muted animate-pulse rounded" />}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted/50 animate-pulse rounded" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted/30 animate-pulse rounded" />
      </div>
      <div className="flex gap-2 pt-4">
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted/50 animate-pulse rounded" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6 mb-6">
          <div className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          <div className="flex items-center justify-between px-4">
            <div className="flex-1 space-y-3">
              <div className="h-12 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-6 space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg bg-muted/30">
                <div className="h-4 w-full bg-muted animate-pulse rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-8 w-3/4 bg-muted/50 animate-pulse rounded" />
                  <div className="h-8 w-2/4 bg-muted/30 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
