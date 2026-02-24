'use client';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useState } from 'react';

export function DemoModeBadge() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisable = () => {
    localStorage.removeItem('RTFM_DEMO_MODE');
    window.location.reload();
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-amber-500 text-white hover:bg-amber-600 cursor-pointer transition-colors"
          onClick={() => setShowConfirm(true)}
        >
          <span className="mr-1">🎮</span>
          DEMO MODE
        </Badge>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Disable Demo Mode?</h3>
            <p className="text-muted-foreground mb-6">
              This will switch from simulated data to live blockchain interactions.
              You will need to connect your wallet to use the platform.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
