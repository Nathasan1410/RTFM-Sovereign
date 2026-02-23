'use client';

import { motion } from 'framer-motion';
import { Search, Code, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  address?: string;
  skill?: string;
}

export function EmptyState({ address, skill }: EmptyStateProps) {
  const router = useRouter();

  return (
    <Card className="p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center gap-6"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-3">No Attestation Found</h2>
          <p className="text-muted-foreground max-w-md">
            {skill
              ? `This address hasn't completed any challenges for "${skill}" yet. Try a different skill or check if address is correct.`
              : 'This address hasn\'t completed any challenges yet. Try a different skill or check if address is correct.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/sovereign')}
            className="gap-2"
          >
            <Code className="w-4 h-4" />
            Explore Skills
          </Button>
          <Button
            variant="default"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </motion.div>
    </Card>
  );
}
