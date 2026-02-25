'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SovereignPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 p-8">
      <h1 className="text-2xl font-mono text-zinc-500">
        Redirecting...
      </h1>
      <p className="text-sm text-zinc-600">
        Sovereign flow has been integrated into the main app. Choose "Proof Mode" when generating a roadmap.
      </p>
    </div>
  )
}
