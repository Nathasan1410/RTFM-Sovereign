'use client';

import { motion } from 'framer-motion';
import { Share2, Copy, Twitter, Linkedin, Download, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { generateCertificate } from '@/lib/pdfGenerator';

interface ShareActionsProps {
  url: string;
  score: number;
  skill: string;
  address: string;
  timestamp: number;
  transactionHash: string;
  ipfsHash: string;
}

export function ShareActions({ url, score, skill, address, timestamp, transactionHash, ipfsHash }: ShareActionsProps) {
  const [generating, setGenerating] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard', { duration: 2000 });
  };

  const shareOnX = () => {
    const text = `🎯 Just earned a ${score}/100 score in ${skill} on RTFM-Sovereign!\n\nVerify my skill credential here: ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnLinkedIn = () => {
    const text = `Check out my verified skill credential for ${skill} (Score: ${score}/100)`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, '_blank');
  };

  const downloadCertificate = async () => {
    setGenerating(true);
    try {
      const blob = await generateCertificate({
        skillName: skill,
        holderAddress: address,
        score,
        timestamp,
        transactionHash,
        ipfsHash,
        verifyUrl: url
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `RTFM-${skill}-${address.substring(0, 8)}.pdf`;
      
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success('Certificate downloaded successfully!', {
        description: `File: ${filename}`,
        duration: 5000
      });
    } catch (error) {
      console.error('[PDF] Error generating certificate:', error);
      toast.error('Failed to generate certificate', {
        description: 'Please try again or contact support.',
        duration: 5000
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Share Credential
        </h3>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyLink}
              className="flex-1 gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              onClick={downloadCertificate}
              disabled={generating}
              className="flex-1 gap-2"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={shareOnX}
              className="flex-1 gap-2"
            >
              <Twitter className="w-4 h-4" />
              Share on X
            </Button>
            <Button
              variant="outline"
              onClick={shareOnLinkedIn}
              className="flex-1 gap-2"
            >
              <Linkedin className="w-4 h-4" />
              Share on LinkedIn
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          Share your verified skill to show employers your coding expertise!
        </div>
      </Card>
    </motion.div>
  );
}
