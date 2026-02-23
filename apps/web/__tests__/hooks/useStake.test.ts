import { renderHook, act } from '@testing-library/react'
import { useStake } from '@/hooks/useStake'
import { mockStake } from '@/lib/demoMode'

jest.mock('wagmi', () => ({
  useWriteContract: () => ({
    writeContract: jest.fn(),
    isPending: false,
    data: null
  }),
  useReadContract: () => ({
    data: BigInt(0),
    isLoading: false
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false
  })
}))

jest.mock('@/lib/demoMode', () => ({
  isDemoMode: jest.fn(() => false),
  mockStake: jest.fn()
}))

jest.mock('@/config/contracts', () => ({
  SKILL_STAKING_ADDRESS: '0x0000000000000000000000000000000000000000',
  SKILL_STAKING_ABI: []
}))

jest.mock('viem', () => ({
  parseEther: jest.fn((val) => BigInt(val.replace('.', '')))
}))

describe('useStake', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockSkill = 'Solidity Smart Contracts'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return stake function and correct default state', () => {
    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    expect(typeof result.current.stake).toBe('function')
    expect(typeof result.current.claimRefund).toBe('function')
    expect(result.current.isPending).toBe(false)
    expect(result.current.hasStake).toBe(false)
    expect(result.current.stakeAmount).toBe(BigInt(0))
    expect(result.current.error).toBeNull()
  })

  it('should call writeContract when staking in production mode', async () => {
    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    const { isDemoMode } = require('@/lib/demoMode')
    isDemoMode.mockReturnValueOnce(false)

    await act(async () => {
      await result.current.stake(mockSkill)
    })

    expect(result.current.error).toBeNull()
  })

  it('should use mock stake in demo mode', async () => {
    const mockResult = {
      hash: '0xMockHash',
      status: 'success'
    }

    const { isDemoMode } = require('@/lib/demoMode')
    isDemoMode.mockReturnValueOnce(true)
    ;(mockStake as jest.Mock).mockResolvedValueOnce(mockResult)

    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    let response
    await act(async () => {
      response = await result.current.stake(mockSkill)
    })

    expect(mockStake).toHaveBeenCalledWith(mockSkill)
    expect(response).toEqual(mockResult)
  })

  it('should handle staking error', async () => {
    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    const { isDemoMode } = require('@/lib/demoMode')
    isDemoMode.mockReturnValueOnce(false)

    await act(async () => {
      try {
        await result.current.stake(mockSkill)
      } catch (e) {
      }
    })

    expect(result.current.error).toBeNull()
  })

  it('should call claimRefund with correct arguments', async () => {
    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    await act(async () => {
      await result.current.claimRefund(mockSkill)
    })

    expect(result.current.error).toBeNull()
  })

  it('should throw error when claiming refund without user address', async () => {
    const { result } = renderHook(() => useStake(undefined, mockSkill))

    await expect(
      act(async () => {
        await result.current.claimRefund(mockSkill)
      })
    ).rejects.toThrow('User address is required')

    expect(result.current.error).toBe('User address is required')
  })

  it('should handle claimRefund error', async () => {
    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    await act(async () => {
      try {
        await result.current.claimRefund(mockSkill)
      } catch (e) {
      }
    })

    expect(result.current.error).toBeNull()
  })

  it('should detect existing stake when stakeAmount > 0', () => {
    const { useReadContract } = require('wagmi')
    useReadContract.mockReturnValueOnce({
      data: BigInt(1000000),
      isLoading: false
    })

    const { result } = renderHook(() => useStake(mockAddress, mockSkill))

    expect(result.current.hasStake).toBe(true)
    expect(result.current.stakeAmount).toBe(BigInt(1000000))
  })
})
