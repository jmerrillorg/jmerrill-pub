'use client'

import { useEffect, useState } from 'react'

type AuthorGateScope = 'forms' | 'portal'

type GateResponse = {
  success?: boolean
  error?: string
  accessType?: 'admin' | 'author'
  portalContext?: {
    contactId?: string
    authorPortalId?: string
    titleId?: string
    titleIds?: string[]
    projectId?: string
    projectIds?: string[]
    titleName?: string
  } | null
}

export function AuthorGate({ children, scope = 'forms' }: { children: React.ReactNode; scope?: AuthorGateScope }) {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const storageKey = scope === 'portal' ? 'jmp-author-portal-unlocked' : 'jmp-author-onboarding-unlocked'
  const contextKey = scope === 'portal' ? 'jmp-author-portal-context' : 'jmp-author-onboarding-context'
  const codeKey = scope === 'portal' ? 'jmp-author-portal-access-code' : 'jmp-author-onboarding-access-code'

  useEffect(() => {
    let mounted = true

    async function verifyExistingSession() {
      if (sessionStorage.getItem(storageKey) !== 'true') return

      try {
        const ready = await verifyWorkspaceContext(scope)
        if (!mounted) return

        if (ready) {
          setUnlocked(true)
          return
        }
      } catch {
        // fall through to clear stale session markers
      }

      sessionStorage.removeItem(storageKey)
      sessionStorage.removeItem(contextKey)
      sessionStorage.removeItem(codeKey)
      if (mounted) setUnlocked(false)
    }

    void verifyExistingSession()

    return () => {
      mounted = false
    }
  }, [codeKey, contextKey, scope, storageKey])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const search = new URLSearchParams(window.location.search)
      const requestedReference =
        search.get('reference') ||
        search.get('ref') ||
        search.get('intakeReference') ||
        ''

      const response = await fetch('/api/author/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          scope,
          reference: requestedReference || undefined,
        }),
      })
      const data = (await response.json()) as GateResponse
      if (!response.ok) throw new Error(data.error || 'Invalid access code.')
      const ready = await verifyWorkspaceContext(scope)
      if (!ready) {
        throw new Error('We could not open your workspace right now. Please try again or contact publishing@jmerrill.one.')
      }

      sessionStorage.setItem(storageKey, 'true')
      sessionStorage.setItem(codeKey, code)
      sessionStorage.setItem(
        contextKey,
        JSON.stringify({
          accessType: data.accessType || (scope === 'portal' ? 'author' : 'forms'),
          portalContext: data.portalContext || null,
        }),
      )
      setUnlocked(true)
    } catch (err: any) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message && message !== 'Failed to fetch'
          ? message
          : 'We could not open your workspace right now. Please try again or contact publishing@jmerrill.one.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 backdrop-blur">
      <div className="mb-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Invitation required</div>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Your Author Workspace is private.
        </h2>
        <p className="mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/40">
          Enter the access code provided by J Merrill Publishing to continue. This keeps your project details and next steps available only to you and our publishing team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Access code"
          className="min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[52px] rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? 'Checking...' : 'Unlock'}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}

async function verifyWorkspaceContext(scope: AuthorGateScope) {
  if (scope !== 'portal') return true

  for (const delayMs of [0, 250, 500, 1000]) {
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs))
    }

    try {
      const response = await fetch('/api/author/context', { cache: 'no-store' })
      if (response.ok) return true

      if (response.status !== 401) {
        return false
      }
    } catch {
      // retry a couple of times before failing the unlock
    }
  }

  return false
}
