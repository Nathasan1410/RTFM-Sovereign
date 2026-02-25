'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChallengePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <h1 className="text-2xl font-mono text-zinc-500">
        Redirecting...
      </h1>
      <p className="text-sm text-zinc-600">
        Challenge flow has been integrated into main app. Choose "Proof Mode" when generating a roadmap.
      </p>
    </div>
  )
}
