import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

/**
 * Custom hook for managing faucet requests.
 * Provides functionality to request testnet ETH from faucet service.
 * Implements cooldown mechanism (1 hour) to prevent spam.
 * 
 * @returns Object containing faucet request methods and state
 * @returns {Function} returns.requestFunds - Function to request faucet funds
 * @returns {boolean} returns.isRequesting - Whether a request is in progress
 * @returns {number} returns.cooldownRemaining - Remaining cooldown time in milliseconds
 * @returns {boolean} returns.isAvailable - Whether faucet is available (no cooldown)
 * 
 * @example
 * ```tsx
 * const { requestFunds, isRequesting, isAvailable } = useFaucetRequest()
 * 
 * <button onClick={requestFunds} disabled={!isAvailable || isRequesting}>
 *   {isRequesting ? 'Requesting...' : 'Get Testnet ETH'}
 * </button>
 * 
 * {cooldownRemaining > 0 && (
 *   <p>Cooldown: {Math.floor(cooldownRemaining / 60000)} minutes</p>
 * )}
 * ```
 * 
 * @remarks
 * - Cooldown period: 1 hour (3,600,000 ms)
 * - Demo mode simulates faucet request without real transaction
 * - Production mode opens external faucet URL
 * - Last request time persisted in localStorage
 */
export function useFaucetRequest() {
  const { address } = useAccount()
  const [isRequesting, setIsRequesting] = useState(false)
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`faucet-${address}`)
      if (stored) {
        setLastRequestTime(parseInt(stored))
      }
    }
  }, [address])

  useEffect(() => {
    if (lastRequestTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, 3600000 - (Date.now() - lastRequestTime))
        setCooldownRemaining(remaining)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [lastRequestTime])

  const requestFunds = async () => {
    if (!address) return
    
    if (cooldownRemaining > 0) {
      alert("Cooldown active.")
      return
    }

    setIsRequesting(true)
    
    // Mock Mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      await new Promise(r => setTimeout(r, 2000))
      localStorage.setItem(`faucet-${address}`, Date.now().toString())
      setLastRequestTime(Date.now())
      setIsRequesting(false)
      alert("Demo Faucet: 0.01 ETH sent (Simulated)")
    } else {
      // External Faucet Link
      window.open("https://sepoliafaucet.com", "_blank")
      setIsRequesting(false)
    }
  }

  return {
    requestFunds,
    isRequesting,
    cooldownRemaining,
    isAvailable: cooldownRemaining === 0
  }
}
