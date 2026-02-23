import { renderHook, waitFor } from '@testing-library/react'
import { useAttestation, useAttestationData } from '@/hooks/useAttestation'
import { mockAttestation } from '@/lib/demoMode'

jest.mock('wagmi', () => ({
  useReadContract: jest.fn(({ functionName }: { functionName: string }) => {
    if (functionName === 'getAttestation') {
      return {
        data: [BigInt(85), BigInt(1234567890), '0xMockSignature'],
        isLoading: false,
        error: null
      }
    }
    if (functionName === 'verifyAttestation') {
      return {
        data: [BigInt(85), BigInt(1234567890), '0xMockSignature', 'QmMockHash'],
        isLoading: false,
        error: null
      }
    }
    return {
      data: null,
      isLoading: false,
      error: null
    }
  })
}))

jest.mock('@/lib/demoMode', () => ({
  isDemoMode: jest.fn(() => false),
  mockAttestation: jest.fn()
}))

jest.mock('@/config/contracts', () => ({
  SKILL_ATTESTATION_ADDRESS: '0x0000000000000000000000000000000000000',
  SKILL_ATTESTATION_ABI: []
}))

describe('useAttestation', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockSkill = 'Solidity Smart Contracts'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return getAttestation and verifyAttestation functions', () => {
    const { result } = renderHook(() => useAttestation())

    expect(typeof result.current.getAttestation).toBe('function')
    expect(typeof result.current.verifyAttestation).toBe('function')
    expect(result.current.error).toBeNull()
  })

  it('should return attestation data from getAttestation', async () => {
    const { result } = renderHook(() => useAttestation())

    const attestation = await result.current.getAttestation(mockAddress, mockSkill)

    expect(attestation).toEqual({
      data: [BigInt(85), BigInt(1234567890), '0xMockSignature'],
      isLoading: false,
      error: null
    })
  })

  it('should use mock attestation in demo mode for verifyAttestation', async () => {
    const mockResult = {
      score: BigInt(85),
      timestamp: BigInt(1234567890),
      signature: '0xDemoSignature'
    }

    const { isDemoMode } = require('@/lib/demoMode')
    isDemoMode.mockReturnValueOnce(true)
    ;(mockAttestation as jest.Mock).mockResolvedValueOnce(mockResult)

    const { result } = renderHook(() => useAttestation())

    const resultAttestation = await result.current.verifyAttestation(mockAddress, mockSkill)

    expect(mockAttestation).toHaveBeenCalledWith(mockAddress, mockSkill)
    expect(resultAttestation).toEqual(mockResult)
  })

  it('should handle getAttestation error gracefully', async () => {
    const { useReadContract } = require('wagmi')
    const originalUseReadContract = useReadContract

    originalUseReadContract.mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: new Error('Contract error')
    })

    const { result } = renderHook(() => useAttestation())

    await expect(
      result.current.getAttestation(mockAddress, mockSkill)
    ).resolves.toBeDefined()
  })

  it('should handle verifyAttestation error gracefully', async () => {
    const { useReadContract } = require('wagmi')
    const originalUseReadContract = useReadContract

    originalUseReadContract.mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: new Error('Verification error')
    })

    const { result } = renderHook(() => useAttestation())

    await expect(
      result.current.verifyAttestation(mockAddress, mockSkill)
    ).resolves.toBeDefined()
  })
})

describe('useAttestationData', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockSkill = 'Solidity Smart Contracts'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return formatted attestation data when user and skill provided', () => {
    const { result } = renderHook(() => useAttestationData(mockAddress, mockSkill))

    expect(result.current.attestation).toEqual({
      score: BigInt(85),
      timestamp: BigInt(1234567890),
      signature: '0xMockSignature'
    })
    expect(result.current.exists).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('should return exists false when score is 0', () => {
    const { useReadContract } = require('wagmi')
    const originalUseReadContract = useReadContract

    originalUseReadContract.mockReturnValueOnce({
      data: [BigInt(0), BigInt(1234567890), '0xMockSignature', 'QmMockHash'],
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useAttestationData(mockAddress, mockSkill))

    expect(result.current.exists).toBe(false)
  })

  it('should handle error state', () => {
    const { useReadContract } = require('wagmi')
    const originalUseReadContract = useReadContract

    originalUseReadContract.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('RPC error')
    })

    const { result } = renderHook(() => useAttestationData(mockAddress, mockSkill))

    expect(result.current.attestation).toBeNull()
    expect(result.current.exists).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('should handle loading state', () => {
    const { useReadContract } = require('wagmi')
    const originalUseReadContract = useReadContract

    originalUseReadContract.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null
    })

    const { result } = renderHook(() => useAttestationData(mockAddress, mockSkill))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.attestation).toBeNull()
  })
})
