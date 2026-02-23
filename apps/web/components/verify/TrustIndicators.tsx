'use client';

import { motion } from 'framer-motion';
import { Shield, CheckCircle, ExternalLink, Clock, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TrustIndicatorsProps {
  address: string;
  transactionHash?: string;
  signature: string;
  timestamp: number;
}

export function TrustIndicators({ address, transactionHash, signature, timestamp }: TrustIndicatorsProps) {
  const formatAddress = (addr: string) => `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Trust Indicators
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Blockchain Verified</div>
              <div className="text-sm text-muted-foreground">
                Verified on Sepolia testnet
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Verification Timestamp</div>
              <div className="text-sm text-muted-foreground">
                {formatTimestamp(timestamp)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Data Permanence</div>
              <div className="text-sm text-muted-foreground">
                Stored permanently on IPFS
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono ml-2">{formatAddress(address)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank')}
                className="gap-1"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">TEE Signature:</span>
              <span className="font-mono ml-2 text-xs break-all bg-muted/50 p-1 rounded">
                {signature.substring(0, 20)}...{signature.substring(signature.length - 8)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank')}
              className="gap-2 flex-1"
            >
              <ExternalLink className="w-4 h-4" />
              View on Etherscan
            </Button>
            <Badge variant="outline" className="text-sm">
              Sepolia Testnet
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
