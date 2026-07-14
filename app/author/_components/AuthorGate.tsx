'use client'

import { useEffect, useState } from 'react'
import { AUTHOR_OPERATING_CENTER_PROVIDER_ID } from '@/lib/author-durable-auth-shared'

type AuthorGateScope = 'forms' | 'portal'

const PORTAL_UNLOCKED_KEY = 'jmp-author-onboarding-unlocked'
const PORTAL_BOOTSTRAP_CONTEXT_KEY = 'jm1_author_portal_bootstrap_context'
const AUTHOR_GATE_RECOVERY_ATTEMPTS = 10
const AUTHOR_GATE_RECOVERY_DELAY_MS = 1200

export function AuthorGate({
  children,
  scope = 'portal',
}: {
  children: React.ReactNode
  scope?: AuthorGateScope
}) {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingSession, setCheckingSession] = useState(false)
  const unlockedKey = scope === 'portal' ? PORTAL_UNLOCKED_KEY : 'jmp-author-onboarding-unlocked'
  const bootstrapContextKey =
    scope === 'portal' ? PORTAL_BOOTSTRAP_CONTEXT_KEY : 'jm1_author_onboarding_bootstrap_context'

  useEffect(() => {
    const cached = sessionStorage.getItem(unlockedKey) === 'true'
    if (cached) {
      setUnlocked(true)
      return
    }

    let mounted = true

    async function checkSession() {
      setCheckingSession(true)
      try {
        const response = await tryRecoverAuthorSession()
        if (!mounted) return
        if (response?.ok) {
          sessionStorage.setItem(unlockedKey, 'true')
          await storeBootstrapContext(response, bootstrapContextKey)
          setUnlocked(true)
          return
        }
      } catch {
        // Ignore passive session checks.
      } finally {
        if (mounted) setCheckingSession(false)
      }
    }

    void checkSession()

    return () => {
      mounted = false
    }
  }, [scope, unlockedKey, bootstrapContextKey])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const params = new URLSearchParams(window.location.search)
      const response = await fetch('/api/author/gate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          scope,
          reference: params.get('reference') || params.get('ref') || '',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid access code.')
      sessionStorage.setItem(unlockedKey, 'true')
      if (data?.context) {
        sessionStorage.setItem(
          bootstrapContextKey,
          JSON.stringify({
            savedAt: Date.now(),
            context: data.context,
          }),
        )
      }
      setUnlocked(true)
    } catch (err: any) {
      const recovered = await tryRecoverAuthorSession(window.location.search)
      if (recovered?.ok) {
        sessionStorage.setItem(unlockedKey, 'true')
        await storeBootstrapContext(recovered, bootstrapContextKey)
        setUnlocked(true)
        return
      }

      setError(err.message || 'Unable to validate access code.')
    } finally {
      setSubmitting(false)
    }
  }

  if (unlocked) return <>{children}</>
  if (checkingSession) {
    return (
      <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 text-[14px] leading-[1.8] text-white/55">
        Opening your Author Operating Center...
      </div>
    )
  }

  const signInUrl = `/api/auth/signin/${AUTHOR_OPERATING_CENTER_PROVIDER_ID}?callbackUrl=%2Fauthor%2Fportal`

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 backdrop-blur">
      <div className="mb-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Invitation required</div>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Your Author Operating Center is private.
        </h2>
        <p className="mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/40">
          Sign in with your secure author account if it has already been activated. If you are setting up access for the first time or need governed recovery, use the activation code provided by J Merrill Publishing.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={signInUrl}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600"
        >
          Sign in
        </a>
        <div className="text-[12px] leading-[1.7] text-white/35">
          Use your author-owned sign-in for routine access. Activation codes remain available only for first-time setup and governed recovery.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Activation code"
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

      <p className="mt-4 text-[12px] leading-[1.7] text-white/35">
        If you need help with password recovery or secure access restoration, please contact publishing@jmerrill.one so we can use the governed recovery path.
      </p>
    </div>
  )
}

async function tryRecoverAuthorSession(search = '') {
  const suffix = search || ''

  for (let attempt = 0; attempt < AUTHOR_GATE_RECOVERY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`/api/author/context${suffix}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (response.ok) {
        return response
      }
    } catch {
      // Keep retrying while the browser settles cross-request cookies.
    }

    await new Promise((resolve) => window.setTimeout(resolve, AUTHOR_GATE_RECOVERY_DELAY_MS))
  }

  return null
}

async function storeBootstrapContext(response: Response, storageKey: string) {
  try {
    const data = (await response.clone().json()) as { context?: unknown }
    if (!data?.context) return

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        savedAt: Date.now(),
        context: data.context,
      }),
    )
  } catch {
    // The workspace can still load directly if the bootstrap payload is unavailable.
  }
}
