import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

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
