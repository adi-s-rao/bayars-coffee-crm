'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="max-w-md text-center">
        <p className="text-[13px] font-medium text-red-400">Something went wrong</p>
        <p className="mt-2 text-[12px] text-[#555]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-[#D97706] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#B45309] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
