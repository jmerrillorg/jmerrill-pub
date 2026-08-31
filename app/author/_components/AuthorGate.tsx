'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { AUTHOR_EMAIL_OTP_PROVIDER_ID } from '@/lib/author-durable-auth-shared'

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
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [otpPhase, setOtpPhase] = useState<'email' | 'code'>('email')
  const [resendAfter, setResendAfter] = useState(0)
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [otpSubmitting, setOtpSubmitting] = useState(false)
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
        if (response && [403, 409].includes(response.status)) {
          const data = await readAuthorGateError(response)
          setError(
            data?.error ||
              'Your sign-in was found, but your author relationship could not be resolved. Please contact the Publishing Team so we can restore access without creating a duplicate account.',
          )
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

  useEffect(() => {
    if (!resendAfter) return
    const interval = window.setInterval(() => {
      setResendAfter((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [resendAfter])

  async function sendOtpCode() {
    setOtpSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/author/otp/request', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Author sign-in is temporarily unavailable.')
      setChallengeId(String(data.challengeId || ''))
      setResendAfter(Number(data.resendAfterSeconds || 60))
      setOtpPhase('code')
    } catch (err: any) {
      setError(err.message || 'Unable to send an author access code.')
    } finally {
      setOtpSubmitting(false)
    }
  }

  async function handleOtpRequest(event: React.FormEvent) {
    event.preventDefault()
    await sendOtpCode()
  }

  async function handleOtpVerify(event: React.FormEvent) {
    event.preventDefault()
    setOtpSubmitting(true)
    setError('')

    try {
      const result = await signIn(AUTHOR_EMAIL_OTP_PROVIDER_ID, {
        redirect: false,
        email,
        challengeId,
        code: otpCode,
        callbackUrl: '/author/portal',
      })
      if (result?.error) throw new Error('The code was not accepted. Please check the code and try again.')

      const recovered = await tryRecoverAuthorSession(window.location.search)
      if (!recovered?.ok) {
        throw new Error('Your sign-in was accepted, but your author workspace could not be opened.')
      }
      sessionStorage.setItem(unlockedKey, 'true')
      await storeBootstrapContext(recovered, bootstrapContextKey)
      setUnlocked(true)
    } catch (err: any) {
      setError(err.message || 'Unable to verify your author access code.')
    } finally {
      setOtpSubmitting(false)
    }
  }

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
      if (data?.requiresMicrosoftSignIn && typeof data.signInUrl === 'string') {
        sessionStorage.removeItem(unlockedKey)
        sessionStorage.removeItem(bootstrapContextKey)
        window.location.href = data.signInUrl
        return
      }
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
      if (recovered && [403, 409].includes(recovered.status)) {
        const data = await readAuthorGateError(recovered)
        setError(
          data?.error ||
            'Your sign-in was found, but your author relationship could not be resolved. Please contact the Publishing Team so we can restore access without creating a duplicate account.',
        )
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

  const signedInRelationshipError =
    /sign-in was found|publisher sign-in was found|relationship could not be resolved/i.test(error)

  return (
    <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 backdrop-blur">
      <div className="mb-7">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">
          {signedInRelationshipError ? 'Relationship not resolved' : 'Invitation required'}
        </div>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Your Author Operating Center is private.
        </h2>
        <p className="mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/40">
          Enter the email connected to your active author record. We will send a short-lived one-time code for routine access.
        </p>
      </div>

      {signedInRelationshipError ? null : otpPhase === 'email' ? (
        <form onSubmit={handleOtpRequest} className="flex flex-col gap-4 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Author email"
            autoComplete="email"
            className="min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
            required
          />
          <button
            type="submit"
            disabled={otpSubmitting}
            className="min-h-[52px] rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
          >
            {otpSubmitting ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpVerify} className="flex flex-col gap-4 sm:flex-row">
          <input
            type="text"
            inputMode="numeric"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Six-digit code"
            autoComplete="one-time-code"
            className="min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
            required
          />
          <button
            type="submit"
            disabled={otpSubmitting || otpCode.length !== 6}
            className="min-h-[52px] rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
          >
            {otpSubmitting ? 'Checking...' : 'Continue'}
          </button>
          <button
            type="button"
            disabled={otpSubmitting || resendAfter > 0}
            onClick={() => void sendOtpCode()}
            className="min-h-[52px] rounded-full border border-white/10 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/65 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            {resendAfter > 0 ? `Resend in ${resendAfter}s` : 'Resend'}
          </button>
        </form>
      )}

      {signedInRelationshipError ? null : (
        <details className="mt-5 rounded-2xl border border-white/8 bg-black/10 p-4">
          <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.08em] text-white/50">
            Activation or recovery
          </summary>
          <p className="mt-3 text-[12px] leading-[1.7] text-white/35">
            Use this only when the Publishing Team has issued a lifecycle activation or recovery code.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row">
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Activation or recovery code"
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
        </details>
      )}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-[12px] leading-[1.7] text-white/35">
        J Merrill Publishing will never ask for your password. If you cannot get in, email{' '}
        <a className="text-blue-300 underline-offset-4 hover:underline" href="mailto:publishing@jmerrill.one?subject=Author%20access%20help">
          publishing@jmerrill.one
        </a>{' '}
        from the email connected to your author record.
      </p>
    </div>
  )
}

async function tryRecoverAuthorSession(search = '') {
  const suffix = search || ''
  let lastRelationshipResponse: Response | null = null

  for (let attempt = 0; attempt < AUTHOR_GATE_RECOVERY_ATTEMPTS; attempt += 1) {
    try {
      await fetch('/api/author/activation/complete', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => null)

      const response = await fetch(`/api/author/context${suffix}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (response.ok) {
        return response
      }
      if ([403, 409].includes(response.status)) {
        lastRelationshipResponse = response
        break
      }
    } catch {
      // Keep retrying while the browser settles cross-request cookies.
    }

    await new Promise((resolve) => window.setTimeout(resolve, AUTHOR_GATE_RECOVERY_DELAY_MS))
  }

  return lastRelationshipResponse
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

async function readAuthorGateError(response: Response) {
  try {
    return (await response.clone().json()) as { error?: string; status?: string; correlationId?: string }
  } catch {
    return null
  }
}
