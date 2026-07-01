'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  MANUSCRIPT_STATUS_OPTIONS,
  PUBLISHED_BEFORE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  WORK_TYPE_OPTIONS,
} from '@/lib/publishing/intake/options'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
        },
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

type Status = 'idle' | 'submitting' | 'success' | 'duplicate' | 'rate_limited' | 'error'
type VerificationConfigStatus = 'loading' | 'ready' | 'missing'

type JoinFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  bookTitle: string
  workType: string
  genre: string
  wordCount: string
  manuscriptStatus: string
  manuscriptUrl: string
  publishedBefore: string
  bookDescription: string
  referralSource: string
  additionalNotes: string
  consent: boolean
  turnstileToken: string
  idempotencyKey: string
}

type Errors = Partial<Record<keyof JoinFormState, string>>

const initialForm: JoinFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  bookTitle: '',
  workType: '',
  genre: '',
  wordCount: '',
  manuscriptStatus: '',
  manuscriptUrl: '',
  publishedBefore: '',
  bookDescription: '',
  referralSource: '',
  additionalNotes: '',
  consent: false,
  turnstileToken: '',
  idempotencyKey: createUuid(),
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const buildTimeSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''

export default function JoinForm() {
  const [form, setForm] = useState<JoinFormState>(initialForm)
  const [touched, setTouched] = useState<Partial<Record<keyof JoinFormState, boolean>>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [reference, setReference] = useState('')
  const [serverMessage, setServerMessage] = useState('')
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(buildTimeSiteKey)
  const [verificationConfigStatus, setVerificationConfigStatus] = useState<VerificationConfigStatus>(
    buildTimeSiteKey ? 'ready' : 'loading',
  )
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string>()

  const allErrors = useMemo(() => validate(form), [form])
  const canSubmit = Object.keys(allErrors).length === 0 && status !== 'submitting' && verificationConfigStatus === 'ready'

  useEffect(() => {
    let cancelled = false

    async function loadRuntimeConfig() {
      try {
        const res = await fetch('/api/publishing/intake/config', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        const runtimeSiteKey = typeof data?.turnstileSiteKey === 'string' ? data.turnstileSiteKey.trim() : ''
        const nextSiteKey = runtimeSiteKey || buildTimeSiteKey

        if (cancelled) return

        if (nextSiteKey) {
          setTurnstileSiteKey(nextSiteKey)
          setVerificationConfigStatus('ready')
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          setForm((current) => ({ ...current, turnstileToken: 'development-turnstile-token' }))
          setVerificationConfigStatus('ready')
          return
        }

        setVerificationConfigStatus('missing')
      } catch {
        if (cancelled) return

        if (buildTimeSiteKey) {
          setTurnstileSiteKey(buildTimeSiteKey)
          setVerificationConfigStatus('ready')
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          setForm((current) => ({ ...current, turnstileToken: 'development-turnstile-token' }))
          setVerificationConfigStatus('ready')
          return
        }

        setVerificationConfigStatus('missing')
      }
    }

    loadRuntimeConfig()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return

    const scriptId = 'cloudflare-turnstile-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }

    const interval = window.setInterval(() => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token) => setForm((current) => ({ ...current, turnstileToken: token })),
          'expired-callback': () => setForm((current) => ({ ...current, turnstileToken: '' })),
          'error-callback': () => setForm((current) => ({ ...current, turnstileToken: '' })),
        })
        window.clearInterval(interval)
      }
    }, 250)

    return () => window.clearInterval(interval)
  }, [turnstileSiteKey])

  const set =
    (field: keyof JoinFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = field === 'consent'
        ? (e.target as HTMLInputElement).checked
        : e.target.value

      setForm((current) => ({ ...current, [field]: value }))
      setStatus('idle')
      setServerMessage('')
    }

  const markTouched = (field: keyof JoinFormState) => () => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors(validate(form))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const nextErrors = validate(form)
    setErrors(nextErrors)
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      bookTitle: true,
      workType: true,
      genre: true,
      wordCount: true,
      manuscriptStatus: true,
      manuscriptUrl: true,
      publishedBefore: true,
      bookDescription: true,
      additionalNotes: true,
      consent: true,
      turnstileToken: true,
    })

    if (Object.keys(nextErrors).length) return

    setStatus('submitting')
    setServerMessage('')

    const payload = {
      ...form,
      wordCount: Number.parseInt(form.wordCount, 10),
      email: form.email.trim().toLowerCase(),
      phone: optional(form.phone),
      manuscriptUrl: optionalUrl(form.manuscriptUrl),
      referralSource: optional(form.referralSource),
      additionalNotes: optional(form.additionalNotes),
    }

    try {
      const res = await fetch('/api/publishing/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.status === 201 && data.status === 'received') {
        localStorage.setItem(referenceStorageKey(form.idempotencyKey), data.reference)
        setReference(data.reference)
        setStatus('success')
        return
      }

      if (res.status === 409 && data.status === 'duplicate') {
        const priorReference = localStorage.getItem(referenceStorageKey(form.idempotencyKey))
        if (priorReference) {
          setReference(priorReference)
          setStatus('success')
          return
        }

        setStatus('duplicate')
        return
      }

      if (res.status === 429) {
        setStatus('rate_limited')
        return
      }

      if (res.status === 400 && data.status === 'invalid' && Array.isArray(data.errors)) {
        const serverErrors: Errors = {}
        for (const item of data.errors) {
          if (typeof item.field === 'string' && typeof item.message === 'string') {
            serverErrors[item.field as keyof JoinFormState] = item.message
          }
        }
        setErrors(serverErrors)
        setStatus('idle')
        setServerMessage('Please review the highlighted fields and try again.')
        return
      }

      setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Panel>
        <h2 className="mb-3 text-white" style={headingStyle}>Thank you, {form.firstName} — welcome to the family conversation.</h2>
        <p className="mb-4 text-[15px] leading-[1.75] text-white/75">
          We have your story details and will review them with care. Please save your reference number. Our editorial team will reach out within 7–10 business days.
        </p>
        <p className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 font-mono text-[13px] uppercase tracking-[0.08em] text-blue-200">
          Your reference: {reference}
        </p>
        <Link href="/" className="mt-6 inline-flex text-[13px] text-blue-300 underline underline-offset-4 hover:text-blue-200">
          Back to J Merrill Publishing
        </Link>
      </Panel>
    )
  }

  if (status === 'duplicate') {
    return (
      <Panel>
        <h2 className="mb-3 text-white" style={headingStyle}>Your story may already be with us.</h2>
        <p className="text-[15px] leading-[1.75] text-white/75">
          We detected a repeated submission attempt. Please check your email for a confirmation, or contact publishing@jmerrill.one and we&apos;ll take care of you personally.
        </p>
      </Panel>
    )
  }

  return (
    <div className="rounded-3xl border border-blue-200/20 bg-[#18283B] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
        <section className="flex flex-col gap-4" aria-labelledby="about-you-heading">
          <SectionHeading id="about-you-heading" title="About you" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required error={visibleError('firstName', touched, errors)}>
              <input id="firstName" name="firstName" value={form.firstName} onChange={set('firstName')} onBlur={markTouched('firstName')} className={fieldClass(Boolean(visibleError('firstName', touched, errors)))} autoComplete="given-name" />
            </Field>
            <Field label="Last name" name="lastName" required error={visibleError('lastName', touched, errors)}>
              <input id="lastName" name="lastName" value={form.lastName} onChange={set('lastName')} onBlur={markTouched('lastName')} className={fieldClass(Boolean(visibleError('lastName', touched, errors)))} autoComplete="family-name" />
            </Field>
          </div>

          <Field label="Email" name="email" required error={visibleError('email', touched, errors)}>
            <input id="email" name="email" type="email" value={form.email} onChange={set('email')} onBlur={markTouched('email')} className={fieldClass(Boolean(visibleError('email', touched, errors)))} autoComplete="email" />
          </Field>

          <Field label="Phone" name="phone" error={visibleError('phone', touched, errors)}>
            <input id="phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} onBlur={markTouched('phone')} className={fieldClass(Boolean(visibleError('phone', touched, errors)))} autoComplete="tel" />
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="about-book-heading">
          <SectionHeading id="about-book-heading" title="About your book" />

          <Field label="Book title" name="bookTitle" required error={visibleError('bookTitle', touched, errors)}>
            <input id="bookTitle" name="bookTitle" value={form.bookTitle} onChange={set('bookTitle')} onBlur={markTouched('bookTitle')} className={fieldClass(Boolean(visibleError('bookTitle', touched, errors)))} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What kind of book is this?" name="workType" required error={visibleError('workType', touched, errors)}>
              <select id="workType" name="workType" value={form.workType} onChange={set('workType')} onBlur={markTouched('workType')} className={fieldClass(Boolean(visibleError('workType', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Select one</option>
                {WORK_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Genre or subject" name="genre" required error={visibleError('genre', touched, errors)}>
              <input id="genre" name="genre" value={form.genre} onChange={set('genre')} onBlur={markTouched('genre')} className={fieldClass(Boolean(visibleError('genre', touched, errors)))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estimated word count" name="wordCount" required error={visibleError('wordCount', touched, errors)}>
              <input id="wordCount" name="wordCount" type="number" min={100} max={500000} value={form.wordCount} onChange={set('wordCount')} onBlur={markTouched('wordCount')} className={fieldClass(Boolean(visibleError('wordCount', touched, errors)))} />
            </Field>

            <Field label="Where are you in the writing journey?" name="manuscriptStatus" required error={visibleError('manuscriptStatus', touched, errors)}>
              <select id="manuscriptStatus" name="manuscriptStatus" value={form.manuscriptStatus} onChange={set('manuscriptStatus')} onBlur={markTouched('manuscriptStatus')} className={fieldClass(Boolean(visibleError('manuscriptStatus', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Select one</option>
                {MANUSCRIPT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Manuscript link"
            name="manuscriptUrl"
            error={visibleError('manuscriptUrl', touched, errors)}
            helper="A shareable link, such as OneDrive, Google Drive, or Dropbox. You can also provide this later."
          >
            <input id="manuscriptUrl" name="manuscriptUrl" type="url" value={form.manuscriptUrl} onChange={set('manuscriptUrl')} onBlur={markTouched('manuscriptUrl')} className={fieldClass(Boolean(visibleError('manuscriptUrl', touched, errors)))} placeholder="https://..." />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Have you published before?" name="publishedBefore" required error={visibleError('publishedBefore', touched, errors)}>
              <select id="publishedBefore" name="publishedBefore" value={form.publishedBefore} onChange={set('publishedBefore')} onBlur={markTouched('publishedBefore')} className={fieldClass(Boolean(visibleError('publishedBefore', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Select one</option>
                {PUBLISHED_BEFORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="How did you find us?" name="referralSource" error={visibleError('referralSource', touched, errors)}>
              <select id="referralSource" name="referralSource" value={form.referralSource} onChange={set('referralSource')} onBlur={markTouched('referralSource')} className={fieldClass(Boolean(visibleError('referralSource', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Optional</option>
                {REFERRAL_SOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Why does this book matter?" name="bookDescription" required error={visibleError('bookDescription', touched, errors)} helper="Tell us what the book is about, who it is for, and why it needs to exist. Minimum 50 characters.">
            <textarea id="bookDescription" name="bookDescription" value={form.bookDescription} onChange={set('bookDescription')} onBlur={markTouched('bookDescription')} rows={6} className={`${fieldClass(Boolean(visibleError('bookDescription', touched, errors)))} resize-none`} />
          </Field>

          <Field label="Anything else on your heart?" name="additionalNotes" error={visibleError('additionalNotes', touched, errors)} helper="Optional. Share timing, hopes, concerns, or anything else that helps us understand how to care for the work.">
            <textarea id="additionalNotes" name="additionalNotes" value={form.additionalNotes} onChange={set('additionalNotes')} onBlur={markTouched('additionalNotes')} rows={4} className={`${fieldClass(Boolean(visibleError('additionalNotes', touched, errors)))} resize-none`} />
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="verification-heading">
          <SectionHeading id="verification-heading" title="Permission and verification" />

          <Field label="Permission to connect" name="consent" required error={visibleError('consent', touched, errors)}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-4 focus-within:border-blue-400">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={form.consent}
                onChange={set('consent')}
                onBlur={markTouched('consent')}
                className="mt-1 accent-blue-500"
              />
              <span className="text-[13px] leading-[1.7] text-white/75">
                I give J Merrill Publishing permission to review my inquiry and contact me about my book. I understand this form does not collect payment data, SSN, banking information, or file uploads.
              </span>
            </label>
          </Field>

          <div>
            {verificationConfigStatus === 'loading' && (
              <p className="min-h-[70px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-[13px] text-white/70">
                Preparing verification…
              </p>
            )}
            {verificationConfigStatus !== 'loading' && (
              <div ref={turnstileRef} className="min-h-[70px]" aria-label="Cloudflare Turnstile verification" />
            )}
            {verificationConfigStatus === 'missing' && process.env.NODE_ENV === 'production' && (
              <p className="text-[13px] text-red-200">Verification is not configured. Please email publishing@jmerrill.one.</p>
            )}
            {visibleError('turnstileToken', touched, errors) && verificationConfigStatus !== 'loading' && (
              <p className="mt-2 text-[12px] text-red-200" role="alert">
                {visibleError('turnstileToken', touched, errors)}
              </p>
            )}
          </div>
        </section>

        <div aria-live="polite" className="min-h-[44px]">
          {serverMessage && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
              {serverMessage}
            </p>
          )}
          {status === 'rate_limited' && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[13px] leading-[1.7] text-amber-100">
              The submission limit was reached for now. Please try again later, or email publishing@jmerrill.one and we&apos;ll take care of you personally.
            </p>
          )}
          {status === 'error' && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] leading-[1.7] text-red-200">
              We&apos;re sorry — something went wrong on our end. Your submission did not go through. Please try again in a few minutes, or email us directly at publishing@jmerrill.one and we&apos;ll take care of you personally.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-blue-500 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#0F1C2E] disabled:cursor-not-allowed disabled:bg-blue-500/55 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {status === 'submitting' ? 'Joining...' : 'Join the Family'}
        </button>
      </form>
    </div>
  )
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div>
      <h2 id={id} className="font-mono text-[12px] uppercase tracking-[0.16em] text-blue-300">
        {title}
      </h2>
      <div className="mt-2 h-px bg-white/15" />
    </div>
  )
}

function Field({
  label,
  name,
  required,
  error,
  helper,
  children,
}: {
  label: string
  name: keyof JoinFormState
  required?: boolean
  error?: string
  helper?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
        {label} {required && <span className="text-blue-300">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="mt-1.5 text-[11px] leading-[1.6] text-white/55">
          {helper}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-[12px] text-red-200" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-blue-500/25 bg-[#18283B] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-12">
      {children}
    </div>
  )
}

function validate(form: JoinFormState): Errors {
  const errors: Errors = {}

  if (!between(form.firstName, 1, 60)) errors.firstName = 'Enter a first name, 60 characters or fewer.'
  if (!between(form.lastName, 1, 60)) errors.lastName = 'Enter a last name, 60 characters or fewer.'
  if (!emailPattern.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!between(form.bookTitle, 1, 200)) errors.bookTitle = 'Enter a book title, 200 characters or fewer.'
  if (!form.workType) errors.workType = 'Select a work type.'
  if (!between(form.genre, 1, 100)) errors.genre = 'Enter a genre, 100 characters or fewer.'

  const count = Number.parseInt(form.wordCount, 10)
  if (!Number.isFinite(count) || count < 100 || count > 500000) {
    errors.wordCount = 'Enter a word count between 100 and 500,000.'
  }

  if (!form.manuscriptStatus) errors.manuscriptStatus = 'Select a manuscript status.'
  if (form.manuscriptUrl.trim() && !isPlaceholderUrl(form.manuscriptUrl) && !isValidUrl(form.manuscriptUrl)) errors.manuscriptUrl = 'Enter a valid shareable URL.'
  if (!form.publishedBefore) errors.publishedBefore = 'Select your publishing history.'
  if (!between(form.bookDescription, 50, 2000)) errors.bookDescription = 'Enter 50–2,000 characters.'
  if (form.additionalNotes.length > 1000) errors.additionalNotes = 'Use 1,000 characters or fewer.'
  if (!form.consent) errors.consent = 'Consent is required.'
  if (!form.turnstileToken) errors.turnstileToken = 'Complete the verification challenge.'

  return errors
}

function visibleError(field: keyof JoinFormState, touched: Partial<Record<keyof JoinFormState, boolean>>, errors: Errors) {
  return touched[field] ? errors[field] : undefined
}

function fieldClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-white/[0.08] px-4 py-3 text-[14px] text-white placeholder:text-white/30 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#0F1C2E]',
    hasError ? 'border-red-300 focus:border-red-200' : 'border-white/15 focus:border-blue-400',
  ].join(' ')
}

function between(value: string, min: number, max: number) {
  const length = value.trim().length
  return length >= min && length <= max
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function optionalUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed || isPlaceholderUrl(trimmed)) return undefined
  return trimmed
}

function isPlaceholderUrl(value: string) {
  return /^https?:\/\/\.{3}\/?$/i.test(value.trim())
}

function createUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16))
  hex[12] = '4'
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20).join('')}`
}

function referenceStorageKey(idempotencyKey: string) {
  return `jmp-intake-reference:${idempotencyKey}`
}

const headingStyle = {
  fontFamily: "'Libre Baskerville', serif",
  fontSize: '28px',
  fontWeight: 700,
}
