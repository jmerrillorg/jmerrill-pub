'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { AuthorPortalContext } from '@/lib/server/author-portal-context'

export function AuthorTaskGate({
  task,
  children,
  completedTitle,
  completedBody,
}: {
  task: 'authorProfileRequired' | 'paymentRoyaltyRequired'
  children: React.ReactNode
  completedTitle: string
  completedBody: string
}) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const response = await fetch('/api/author/context', { cache: 'no-store' })
        const text = await response.text()
        const data = text ? (JSON.parse(text) as { context?: AuthorPortalContext; error?: string }) : null

        if (!response.ok) {
          throw new Error(data?.error || 'We could not load your workspace step.')
        }

        if (!mounted) return
        setAllowed(Boolean(data?.context?.tasks?.[task]))
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'We could not load your workspace step.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [task])

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-8 text-[14px] leading-[1.8] text-white/55">
        Loading your workspace step...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-8 text-[14px] leading-[1.8] text-amber-100">
        {error}
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] p-8">
        <h2 className="text-[24px] font-semibold text-white">{completedTitle}</h2>
        <p className="mt-3 max-w-[720px] text-[14px] font-light leading-[1.8] text-white/55">{completedBody}</p>
        <Link
          href="/author/portal"
          className="mt-6 inline-flex items-center rounded-full border border-blue-400/25 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
        >
          Return to workspace
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
