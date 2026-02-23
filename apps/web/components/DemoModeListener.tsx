'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { enableDemoMode, isDemoMode } from '@/lib/demoMode';

export function DemoModeListener() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'D' && e.shiftKey) {
      const now = Date.now();
      const lastPress = (window as any).__lastShiftD || 0;
      const count = (window as any).__shiftDCount || 0;

      if (now - lastPress < 1000) {
        (window as any).__shiftDCount = count + 1;

        if ((window as any).__shiftDCount >= 3) {
          if (!isDemoMode()) {
            enableDemoMode();
            toast.success('🎮 Demo Mode Activated!', {
              description: 'All blockchain interactions are now simulated.',
              duration: 5000,
            });
          } else {
            toast.info('Demo Mode already active');
          }
          (window as any).__shiftDCount = 0;
        }
      } else {
        (window as any).__shiftDCount = 1;
      }

      (window as any).__lastShiftD = now;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}
