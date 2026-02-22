import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { REGISTRY_ABI } from '../config/abi'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`
const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

export interface AttestationResult {
  signature: `0x${string}`
  score: number
  nonce: string
  deadline: number
  attestationHash: string
}

export function useAttest() {
  const { address } = useAccount()
  const [isSubmittingToTEE, setIsSubmittingToTEE] = useState(false)
  const [attestationResult, setAttestationResult] = useState<AttestationResult | null>(null)
  const [teeError, setTeeError] = useState<Error | null>(null)

  const { data: hash, writeContract, isPending: isRecording, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isRecorded } = useWaitForTransactionReceipt({ hash })

  const submitToTEE = async (topic: string, challengeId: string, answers: any[]) => {
    if (!address) throw new Error("Wallet not connected")
    
    setIsSubmittingToTEE(true)
    setTeeError(null)
    
    try {
      const res = await fetch(`${TEE_URL}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          topic,
          challengeId,
          answers
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'TEE Submission Failed')
      }

      const data = await res.json()
      // TEE returns attestation object inside response
      const result = {
          ...data.attestation,
          score: data.score // Score might be top level or inside attestation
      }
      setAttestationResult(result)
      return result
    } catch (err) {
      setTeeError(err as Error)
      throw err
    } finally {
      setIsSubmittingToTEE(false)
    }
  }

  const recordTopicOnChain = (topic: string) => {
    if (!attestationResult || !address) return

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'recordAttestation',
      args: [
        address,
        topic,
        BigInt(attestationResult.score),
        BigInt(attestationResult.nonce),
        attestationResult.signature
      ]
    })
  }

  return {
    submitToTEE,
    recordOnChain: recordTopicOnChain,
    isSubmittingToTEE,
    isRecording,
    isConfirming,
    isRecorded,
    attestationResult,
    error: teeError || writeError,
    hash
  }
}
