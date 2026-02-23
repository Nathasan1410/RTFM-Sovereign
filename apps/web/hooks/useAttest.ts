import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { REGISTRY_ABI } from '../config/abi'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT as `0x${string}`
const TEE_URL = process.env.NEXT_PUBLIC_TEE_URL || 'http://localhost:8080'

/**
 * Interface representing an attestation result from TEE service
 */
export interface AttestationResult {
  signature: `0x${string}`
  score: number
  nonce: string
  deadline: number
  attestationHash: string
}

/**
 * Custom hook for managing attestation submission and on-chain recording.
 * Handles two-phase attestation process: TEE verification and blockchain storage.
 * 
 * @returns Object containing attestation methods and state
 * @returns {Function} returns.submitToTEE - Function to submit answers to TEE for attestation
 * @returns {Function} returns.recordOnChain - Function to record attestation on blockchain
 * @returns {boolean} returns.isSubmittingToTEE - Whether TEE submission is in progress
 * @returns {boolean} returns.isRecording - Whether on-chain recording is in progress
 * @returns {boolean} returns.isConfirming - Whether transaction is being confirmed
 * @returns {boolean} returns.isRecorded - Whether attestation was successfully recorded on-chain
 * @returns {AttestationResult|null} returns.attestationResult - TEE attestation result
 * @returns {Error|null} returns.error - Error from TEE or blockchain
 * @returns {`0x${string}`|undefined} returns.hash - Transaction hash of on-chain recording
 * 
 * @example
 * ```tsx
 * const { submitToTEE, recordOnChain, isRecorded } = useAttest()
 * 
 * // Submit answers to TEE
 * const attestation = await submitToTEE('Solidity', 'challenge-123', ['answer1', 'answer2'])
 * 
 * // Record on blockchain
 * await recordOnChain('Solidity')
 * 
 * if (isRecorded) {
 *   console.log('Attestation recorded successfully!')
 * }
 * ```
 * 
 * @remarks
 * - Must call submitToTEE before recordOnChain
 * - TEE returns signed attestation with EIP-712 signature
 * - Blockchain recording stores attestation permanently
 * - Requires wallet connection for on-chain recording
 */
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
