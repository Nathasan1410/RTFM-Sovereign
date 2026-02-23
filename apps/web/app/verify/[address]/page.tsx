'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useAttestationData } from '@/hooks/useAttestation'
import { SKILL_ATTESTATION_ADDRESS } from '@/config/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CheckCircle, XCircle, Clock, FileSignature, FileCode } from 'lucide-react'
import { motion } from 'framer-motion'

export default function VerifyPage() {
  const { address } = useParams<{ address: string }>()
  const [skill, setSkill] = useState('')
  const [searchSkill, setSearchSkill] = useState('')

  const { attestation, isLoading, exists } = useAttestationData(
    address as `0x${string}`,
    searchSkill
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchSkill(skill)
  }

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getIpfsGatewayUrl = (hash: string) => {
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    return `${gateway}${hash}`
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Verify Skill Attestation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Check if a developer has proven their skills through the RTFM Sovereign platform.
            All attestations are cryptographically signed by TEE and recorded on-chain.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Enter skill (e.g., 'solidity', 'react', 'typescript')"
                className="flex-1"
              />
              <Button type="submit" disabled={!skill || isLoading}>
                {isLoading ? 'Searching...' : 'Verify'}
              </Button>
            </form>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-8">
            {address && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Address</div>
                    <div className="font-mono font-bold">{formatAddress(address)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="animate-spin text-4xl">⏳</div>
                <p className="text-muted-foreground">Verifying attestation on-chain...</p>
              </div>
            )}

            {!isLoading && searchSkill && !exists && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <XCircle className="w-16 h-16 text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-bold mb-2">No Attestation Found</h3>
                  <p className="text-muted-foreground">
                    This address has no attestation for the skill "{searchSkill}".
                    Try a different skill or check if the address is correct.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && exists && attestation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-6 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${
                      Number(attestation.score) >= 70 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {Number(attestation.score) >= 70 ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{searchSkill}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(attestation.timestamp)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {attestation.score.toString()} / 100
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <FileSignature className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Score</div>
                        <div className="text-xl font-bold">{attestation.score.toString()}%</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Timestamp</div>
                        <div className="text-sm font-mono">
                          {attestation.timestamp.toString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium mb-3">TEE Signature</div>
                  <Card className="p-4">
                    <div className="font-mono text-xs break-all bg-muted/50 p-3 rounded-lg">
                      {attestation.signature}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      This signature was generated by the TEE and proves that the challenge
                      was completed in a secure, deterministic environment.
                    </div>
                  </Card>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => window.open(
                      `https://sepolia.etherscan.io/address/${SKILL_ATTESTATION_ADDRESS}`,
                      '_blank'
                    )}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Etherscan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(
                      getIpfsGatewayUrl(attestation.signature.substring(0, 46)),
                      '_blank'
                    )}
                    className="gap-2"
                  >
                    <FileCode className="w-4 h-4" />
                    View Code on IPFS
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
