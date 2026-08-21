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
  preferredName: string
  publishingName: string
  penName: string
  email: string
  phone: string
  preferredCommunication: string
  timezone: string
  returningAuthor: string
  streetAddress: string
  addressLine2: string
  city: string
  stateProvince: string
  postalCode: string
  country: string
  billingSameAsMailing: boolean
  billingStreetAddress: string
  billingAddressLine2: string
  billingCity: string
  billingStateProvince: string
  billingPostalCode: string
  billingCountry: string
  bookTitle: string
  subtitle: string
  workType: string
  genre: string
  wordCount: string
  manuscriptStatus: string
  manuscriptSubmissionChoice: string
  manuscriptUrl: string
  publishedBefore: string
  intendedAudience: string
  bookGoals: string
  desiredTimeline: string
  priorPublishingHistory: string
  bookDescription: string
  referred: boolean
  referrerName: string
  referrerEmail: string
  referrerRelationship: string
  referrerNotes: string
  referralSource: string
  heardAboutJmp: string
  whyJmp: string
  publishingPartnerHope: string
  authorPlatform: string
  accessibilityNotes: string
  rightsAttestation: boolean
  thirdPartyMaterialDisclosure: string
  aiDisclosure: string
  sensitiveContentDisclosure: string
  serviceCommunicationConsent: boolean
  marketingConsent: boolean
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  landingPage: string
  referrerUrl: string
  campaignId: string
  additionalNotes: string
  consent: boolean
  turnstileToken: string
  idempotencyKey: string
}

type JoinFormErrorField = keyof JoinFormState | 'manuscriptFile'
type Errors = Partial<Record<JoinFormErrorField, string>>

const initialForm: JoinFormState = {
  firstName: '',
  lastName: '',
  preferredName: '',
  publishingName: '',
  penName: '',
  email: '',
  phone: '',
  preferredCommunication: '',
  timezone: '',
  returningAuthor: '',
  streetAddress: '',
  addressLine2: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: 'United States',
  billingSameAsMailing: true,
  billingStreetAddress: '',
  billingAddressLine2: '',
  billingCity: '',
  billingStateProvince: '',
  billingPostalCode: '',
  billingCountry: 'United States',
  bookTitle: '',
  subtitle: '',
  workType: '',
  genre: '',
  wordCount: '',
  manuscriptStatus: '',
  manuscriptSubmissionChoice: 'later',
  manuscriptUrl: '',
  publishedBefore: '',
  intendedAudience: '',
  bookGoals: '',
  desiredTimeline: '',
  priorPublishingHistory: '',
  bookDescription: '',
  referred: false,
  referrerName: '',
  referrerEmail: '',
  referrerRelationship: '',
  referrerNotes: '',
  referralSource: '',
  heardAboutJmp: '',
  whyJmp: '',
  publishingPartnerHope: '',
  authorPlatform: '',
  accessibilityNotes: '',
  rightsAttestation: false,
  thirdPartyMaterialDisclosure: '',
  aiDisclosure: '',
  sensitiveContentDisclosure: '',
  serviceCommunicationConsent: false,
  marketingConsent: false,
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  landingPage: '',
  referrerUrl: '',
  campaignId: '',
  additionalNotes: '',
  consent: false,
  turnstileToken: '',
  idempotencyKey: createUuid(),
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const buildTimeSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''
const allowedManuscriptExtensions = ['.docx', '.doc', '.pages', '.rtf', '.pdf']
const maxManuscriptFileBytes = 25 * 1024 * 1024
const communicationOptions = ['Email', 'Phone', 'Text message'] as const
const returningAuthorOptions = ['No', 'Yes', 'Not sure'] as const

export default function JoinForm() {
  const [form, setForm] = useState<JoinFormState>(initialForm)
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null)
  const [touched, setTouched] = useState<Partial<Record<keyof JoinFormState, boolean>>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [reference, setReference] = useState('')
  const [continuationUrl, setContinuationUrl] = useState('')
  const [serverMessage, setServerMessage] = useState('')
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(buildTimeSiteKey)
  const [verificationConfigStatus, setVerificationConfigStatus] = useState<VerificationConfigStatus>(
    buildTimeSiteKey ? 'ready' : 'loading',
  )
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string>()

  const allErrors = useMemo(() => validate(form, manuscriptFile), [form, manuscriptFile])
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
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setForm((current) => ({
      ...current,
      utmSource: params.get('utm_source') || current.utmSource,
      utmMedium: params.get('utm_medium') || current.utmMedium,
      utmCampaign: params.get('utm_campaign') || current.utmCampaign,
      utmContent: params.get('utm_content') || current.utmContent,
      campaignId: params.get('campaign_id') || current.campaignId,
      landingPage: window.location.href,
      referrerUrl: document.referrer || current.referrerUrl,
    }))
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
      const value = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value

      setForm((current) => ({ ...current, [field]: value }))
      setStatus('idle')
      setServerMessage('')
    }

  const markTouched = (field: keyof JoinFormState) => () => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors(validate(form, manuscriptFile))
  }

  const setFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setManuscriptFile(file)
    setErrors(validate(form, file))
    setStatus('idle')
    setServerMessage('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const nextErrors = validate(form, manuscriptFile)
    setErrors(nextErrors)
    setTouched(markAllTouched())

    if (Object.keys(nextErrors).length) return

    setStatus('submitting')
    setServerMessage('')

    const payload = {
      ...form,
      wordCount: Number.parseInt(form.wordCount, 10),
      email: form.email.trim().toLowerCase(),
      phone: optional(form.phone),
      preferredName: optional(form.preferredName),
      publishingName: optional(form.publishingName),
      penName: optional(form.penName),
      preferredCommunication: optional(form.preferredCommunication),
      timezone: optional(form.timezone),
      returningAuthor: optional(form.returningAuthor),
      addressLine2: optional(form.addressLine2),
      billingStreetAddress: form.billingSameAsMailing ? undefined : optional(form.billingStreetAddress),
      billingAddressLine2: form.billingSameAsMailing ? undefined : optional(form.billingAddressLine2),
      billingCity: form.billingSameAsMailing ? undefined : optional(form.billingCity),
      billingStateProvince: form.billingSameAsMailing ? undefined : optional(form.billingStateProvince),
      billingPostalCode: form.billingSameAsMailing ? undefined : optional(form.billingPostalCode),
      billingCountry: form.billingSameAsMailing ? undefined : optional(form.billingCountry),
      subtitle: optional(form.subtitle),
      manuscriptUrl: optionalUrl(form.manuscriptUrl),
      intendedAudience: optional(form.intendedAudience),
      bookGoals: optional(form.bookGoals),
      desiredTimeline: optional(form.desiredTimeline),
      priorPublishingHistory: optional(form.priorPublishingHistory),
      referrerName: form.referred ? optional(form.referrerName) : undefined,
      referrerEmail: form.referred ? optional(form.referrerEmail) : undefined,
      referrerRelationship: form.referred ? optional(form.referrerRelationship) : undefined,
      referrerNotes: form.referred ? optional(form.referrerNotes) : undefined,
      referralSource: optional(form.referralSource),
      heardAboutJmp: optional(form.heardAboutJmp),
      whyJmp: optional(form.whyJmp),
      publishingPartnerHope: optional(form.publishingPartnerHope),
      authorPlatform: optional(form.authorPlatform),
      accessibilityNotes: optional(form.accessibilityNotes),
      thirdPartyMaterialDisclosure: optional(form.thirdPartyMaterialDisclosure),
      aiDisclosure: optional(form.aiDisclosure),
      sensitiveContentDisclosure: optional(form.sensitiveContentDisclosure),
      utmSource: optional(form.utmSource),
      utmMedium: optional(form.utmMedium),
      utmCampaign: optional(form.utmCampaign),
      utmContent: optional(form.utmContent),
      landingPage: optional(form.landingPage),
      referrerUrl: optional(form.referrerUrl),
      campaignId: optional(form.campaignId),
      additionalNotes: optional(form.additionalNotes),
    }

    try {
      const request = manuscriptFile
        ? {
            method: 'POST',
            body: buildMultipartPayload(payload, manuscriptFile),
          }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }

      const res = await fetch('/api/publishing/intake', request)

      const data = await res.json()

      if (res.status === 201 && data.status === 'received') {
        localStorage.setItem(referenceStorageKey(form.idempotencyKey), data.reference)
        setReference(data.reference)
        setContinuationUrl(typeof data.continuationUrl === 'string' ? data.continuationUrl : '')
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
            serverErrors[item.field as JoinFormErrorField] = item.message
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
        <p className="mb-4 text-[15px] leading-[1.75] text-slate-100">
          {form.manuscriptSubmissionChoice === 'now'
            ? 'Your publishing inquiry and manuscript have been received. We will review the project with care and keep you informed about the next step.'
            : 'Your publishing inquiry has been received. We will keep it connected to this reference while you prepare the manuscript you want us to review.'}
        </p>
        <p className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-5 py-4 font-mono text-[13px] uppercase tracking-[0.08em] text-blue-200">
          Your reference: {reference}
        </p>
        {continuationUrl && (
          <a href={continuationUrl} className="mt-5 inline-flex rounded-full bg-blue-500 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-blue-600">
            Add manuscript later
          </a>
        )}
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
        <p className="text-[15px] leading-[1.75] text-slate-100">
          We detected a repeated submission attempt. Please check your email for a confirmation, or contact publishing@jmerrill.one and we&apos;ll take care of you personally.
        </p>
      </Panel>
    )
  }

  return (
    <div className="rounded-3xl border border-blue-200/30 bg-[#18283B] p-6 text-slate-50 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
        <section className="flex flex-col gap-3" aria-labelledby="welcome-heading">
          <SectionHeading id="welcome-heading" title="Welcome" />
          <p className="text-[14px] leading-[1.75] text-slate-100">
            J Merrill Publishing reviews each submitted project thoughtfully and personally. Completing this inquiry starts a publishing conversation; it does not guarantee publication. After we receive your details, we will confirm the next step and whether your manuscript is ready for Editorial Review.
          </p>
        </section>

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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Preferred name" name="preferredName" error={visibleError('preferredName', touched, errors)}>
              <input id="preferredName" name="preferredName" value={form.preferredName} onChange={set('preferredName')} onBlur={markTouched('preferredName')} className={fieldClass(Boolean(visibleError('preferredName', touched, errors)))} autoComplete="nickname" />
            </Field>
            <Field label="Publishing/display name" name="publishingName" error={visibleError('publishingName', touched, errors)}>
              <input id="publishingName" name="publishingName" value={form.publishingName} onChange={set('publishingName')} onBlur={markTouched('publishingName')} className={fieldClass(Boolean(visibleError('publishingName', touched, errors)))} />
            </Field>
            <Field label="Pen name" name="penName" error={visibleError('penName', touched, errors)}>
              <input id="penName" name="penName" value={form.penName} onChange={set('penName')} onBlur={markTouched('penName')} className={fieldClass(Boolean(visibleError('penName', touched, errors)))} />
            </Field>
          </div>

          <Field label="Email" name="email" required error={visibleError('email', touched, errors)}>
            <input id="email" name="email" type="email" value={form.email} onChange={set('email')} onBlur={markTouched('email')} className={fieldClass(Boolean(visibleError('email', touched, errors)))} autoComplete="email" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" name="phone" error={visibleError('phone', touched, errors)}>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} onBlur={markTouched('phone')} className={fieldClass(Boolean(visibleError('phone', touched, errors)))} autoComplete="tel" />
            </Field>
            <Field label="Preferred communication" name="preferredCommunication" error={visibleError('preferredCommunication', touched, errors)}>
              <select id="preferredCommunication" name="preferredCommunication" value={form.preferredCommunication} onChange={set('preferredCommunication')} onBlur={markTouched('preferredCommunication')} className={fieldClass(Boolean(visibleError('preferredCommunication', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Select one</option>
                {communicationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone" name="timezone" error={visibleError('timezone', touched, errors)}>
              <input id="timezone" name="timezone" value={form.timezone} onChange={set('timezone')} onBlur={markTouched('timezone')} className={fieldClass(Boolean(visibleError('timezone', touched, errors)))} placeholder="Eastern, Central, Pacific..." />
            </Field>
            <Field label="Have you published with JMP before?" name="returningAuthor" error={visibleError('returningAuthor', touched, errors)}>
              <select id="returningAuthor" name="returningAuthor" value={form.returningAuthor} onChange={set('returningAuthor')} onBlur={markTouched('returningAuthor')} className={fieldClass(Boolean(visibleError('returningAuthor', touched, errors)))} style={{ colorScheme: 'dark' }}>
                <option value="">Select one</option>
                {returningAuthorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="address-heading">
          <SectionHeading id="address-heading" title="Address" />

          <Field label="Street address" name="streetAddress" required error={visibleError('streetAddress', touched, errors)}>
            <input id="streetAddress" name="streetAddress" value={form.streetAddress} onChange={set('streetAddress')} onBlur={markTouched('streetAddress')} className={fieldClass(Boolean(visibleError('streetAddress', touched, errors)))} autoComplete="street-address" />
          </Field>
          <Field label="Address line 2" name="addressLine2" error={visibleError('addressLine2', touched, errors)}>
            <input id="addressLine2" name="addressLine2" value={form.addressLine2} onChange={set('addressLine2')} onBlur={markTouched('addressLine2')} className={fieldClass(Boolean(visibleError('addressLine2', touched, errors)))} autoComplete="address-line2" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="City" name="city" required error={visibleError('city', touched, errors)}>
              <input id="city" name="city" value={form.city} onChange={set('city')} onBlur={markTouched('city')} className={fieldClass(Boolean(visibleError('city', touched, errors)))} autoComplete="address-level2" />
            </Field>
            <Field label="State / Province" name="stateProvince" required error={visibleError('stateProvince', touched, errors)}>
              <input id="stateProvince" name="stateProvince" value={form.stateProvince} onChange={set('stateProvince')} onBlur={markTouched('stateProvince')} className={fieldClass(Boolean(visibleError('stateProvince', touched, errors)))} autoComplete="address-level1" />
            </Field>
            <Field label="Postal code" name="postalCode" required error={visibleError('postalCode', touched, errors)}>
              <input id="postalCode" name="postalCode" value={form.postalCode} onChange={set('postalCode')} onBlur={markTouched('postalCode')} className={fieldClass(Boolean(visibleError('postalCode', touched, errors)))} autoComplete="postal-code" />
            </Field>
            <Field label="Country" name="country" required error={visibleError('country', touched, errors)}>
              <input id="country" name="country" value={form.country} onChange={set('country')} onBlur={markTouched('country')} className={fieldClass(Boolean(visibleError('country', touched, errors)))} autoComplete="country-name" />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/25 bg-[#0F1C2E] p-4">
            <input id="billingSameAsMailing" name="billingSameAsMailing" type="checkbox" checked={form.billingSameAsMailing} onChange={set('billingSameAsMailing')} className="mt-1 accent-blue-500" />
            <span className="text-[13px] leading-[1.7] text-slate-100">This is also my billing address.</span>
          </label>

          {!form.billingSameAsMailing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Billing street address" name="billingStreetAddress" required error={visibleError('billingStreetAddress', touched, errors)}>
                <input id="billingStreetAddress" name="billingStreetAddress" value={form.billingStreetAddress} onChange={set('billingStreetAddress')} onBlur={markTouched('billingStreetAddress')} className={fieldClass(Boolean(visibleError('billingStreetAddress', touched, errors)))} />
              </Field>
              <Field label="Billing address line 2" name="billingAddressLine2" error={visibleError('billingAddressLine2', touched, errors)}>
                <input id="billingAddressLine2" name="billingAddressLine2" value={form.billingAddressLine2} onChange={set('billingAddressLine2')} onBlur={markTouched('billingAddressLine2')} className={fieldClass(Boolean(visibleError('billingAddressLine2', touched, errors)))} />
              </Field>
              <Field label="Billing city" name="billingCity" required error={visibleError('billingCity', touched, errors)}>
                <input id="billingCity" name="billingCity" value={form.billingCity} onChange={set('billingCity')} onBlur={markTouched('billingCity')} className={fieldClass(Boolean(visibleError('billingCity', touched, errors)))} />
              </Field>
              <Field label="Billing state / province" name="billingStateProvince" required error={visibleError('billingStateProvince', touched, errors)}>
                <input id="billingStateProvince" name="billingStateProvince" value={form.billingStateProvince} onChange={set('billingStateProvince')} onBlur={markTouched('billingStateProvince')} className={fieldClass(Boolean(visibleError('billingStateProvince', touched, errors)))} />
              </Field>
              <Field label="Billing postal code" name="billingPostalCode" required error={visibleError('billingPostalCode', touched, errors)}>
                <input id="billingPostalCode" name="billingPostalCode" value={form.billingPostalCode} onChange={set('billingPostalCode')} onBlur={markTouched('billingPostalCode')} className={fieldClass(Boolean(visibleError('billingPostalCode', touched, errors)))} />
              </Field>
              <Field label="Billing country" name="billingCountry" required error={visibleError('billingCountry', touched, errors)}>
                <input id="billingCountry" name="billingCountry" value={form.billingCountry} onChange={set('billingCountry')} onBlur={markTouched('billingCountry')} className={fieldClass(Boolean(visibleError('billingCountry', touched, errors)))} />
              </Field>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="about-book-heading">
          <SectionHeading id="about-book-heading" title="About your book" />

          <Field label="Book title" name="bookTitle" required error={visibleError('bookTitle', touched, errors)}>
            <input id="bookTitle" name="bookTitle" value={form.bookTitle} onChange={set('bookTitle')} onBlur={markTouched('bookTitle')} className={fieldClass(Boolean(visibleError('bookTitle', touched, errors)))} />
          </Field>
          <Field label="Subtitle" name="subtitle" error={visibleError('subtitle', touched, errors)}>
            <input id="subtitle" name="subtitle" value={form.subtitle} onChange={set('subtitle')} onBlur={markTouched('subtitle')} className={fieldClass(Boolean(visibleError('subtitle', touched, errors)))} />
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
            helper="A reachable OneDrive, Google Drive, or Dropbox link. You may use this instead of a file upload."
          >
            <input id="manuscriptUrl" name="manuscriptUrl" type="url" value={form.manuscriptUrl} onChange={set('manuscriptUrl')} onBlur={markTouched('manuscriptUrl')} className={fieldClass(Boolean(visibleError('manuscriptUrl', touched, errors)))} placeholder="https://..." />
          </Field>

          <Field label="Would you like to submit your manuscript now?" name="manuscriptSubmissionChoice" required error={visibleError('manuscriptSubmissionChoice', touched, errors)}>
            <select id="manuscriptSubmissionChoice" name="manuscriptSubmissionChoice" value={form.manuscriptSubmissionChoice} onChange={set('manuscriptSubmissionChoice')} onBlur={markTouched('manuscriptSubmissionChoice')} className={fieldClass(Boolean(visibleError('manuscriptSubmissionChoice', touched, errors)))} style={{ colorScheme: 'dark' }}>
              <option value="later">Not yet</option>
              <option value="now">Yes, now</option>
            </select>
          </Field>

          <div>
            <label htmlFor="manuscriptFile" className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-100">
              Manuscript file
            </label>
            <input
              id="manuscriptFile"
              name="manuscriptFile"
              type="file"
              accept=".docx,.doc,.pages,.rtf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,application/rtf,text/rtf"
              onChange={setFile}
              className={`${fieldClass(Boolean(errors.manuscriptFile))} file:mr-4 file:rounded-full file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-[12px] file:font-semibold file:text-white hover:file:bg-blue-600`}
            />
            {!errors.manuscriptFile && (
              <p className="mt-1.5 text-[11px] leading-[1.6] text-slate-200">
                Optional. Upload .docx, .doc, .pages, .rtf, or .pdf up to 25 MB. Pages files are preserved as the original source and normalized separately when needed.
              </p>
            )}
            {errors.manuscriptFile && (
              <p className="mt-1.5 text-[12px] text-red-200" role="alert">
                {errors.manuscriptFile}
              </p>
            )}
          </div>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Intended audience" name="intendedAudience" error={visibleError('intendedAudience', touched, errors)}>
              <textarea id="intendedAudience" name="intendedAudience" value={form.intendedAudience} onChange={set('intendedAudience')} onBlur={markTouched('intendedAudience')} rows={3} className={`${fieldClass(Boolean(visibleError('intendedAudience', touched, errors)))} resize-none`} />
            </Field>
            <Field label="Goals for the book" name="bookGoals" error={visibleError('bookGoals', touched, errors)}>
              <textarea id="bookGoals" name="bookGoals" value={form.bookGoals} onChange={set('bookGoals')} onBlur={markTouched('bookGoals')} rows={3} className={`${fieldClass(Boolean(visibleError('bookGoals', touched, errors)))} resize-none`} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desired timeline" name="desiredTimeline" error={visibleError('desiredTimeline', touched, errors)}>
              <input id="desiredTimeline" name="desiredTimeline" value={form.desiredTimeline} onChange={set('desiredTimeline')} onBlur={markTouched('desiredTimeline')} className={fieldClass(Boolean(visibleError('desiredTimeline', touched, errors)))} />
            </Field>
            <Field label="Prior publishing/submission history" name="priorPublishingHistory" error={visibleError('priorPublishingHistory', touched, errors)}>
              <input id="priorPublishingHistory" name="priorPublishingHistory" value={form.priorPublishingHistory} onChange={set('priorPublishingHistory')} onBlur={markTouched('priorPublishingHistory')} className={fieldClass(Boolean(visibleError('priorPublishingHistory', touched, errors)))} />
            </Field>
          </div>

          <Field label="Anything else on your heart?" name="additionalNotes" error={visibleError('additionalNotes', touched, errors)} helper="Optional. Share timing, hopes, concerns, or anything else that helps us understand how to care for the work.">
            <textarea id="additionalNotes" name="additionalNotes" value={form.additionalNotes} onChange={set('additionalNotes')} onBlur={markTouched('additionalNotes')} rows={4} className={`${fieldClass(Boolean(visibleError('additionalNotes', touched, errors)))} resize-none`} />
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="relationship-heading">
          <SectionHeading id="relationship-heading" title="Relationship" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What led you to JMP?" name="whyJmp" error={visibleError('whyJmp', touched, errors)}>
              <textarea id="whyJmp" name="whyJmp" value={form.whyJmp} onChange={set('whyJmp')} onBlur={markTouched('whyJmp')} rows={3} className={`${fieldClass(Boolean(visibleError('whyJmp', touched, errors)))} resize-none`} />
            </Field>
            <Field label="What are you hoping for in a publishing partner?" name="publishingPartnerHope" error={visibleError('publishingPartnerHope', touched, errors)}>
              <textarea id="publishingPartnerHope" name="publishingPartnerHope" value={form.publishingPartnerHope} onChange={set('publishingPartnerHope')} onBlur={markTouched('publishingPartnerHope')} rows={3} className={`${fieldClass(Boolean(visibleError('publishingPartnerHope', touched, errors)))} resize-none`} />
            </Field>
          </div>

          <Field label="How did you hear about J Merrill Publishing?" name="heardAboutJmp" error={visibleError('heardAboutJmp', touched, errors)}>
            <select id="heardAboutJmp" name="heardAboutJmp" value={form.heardAboutJmp} onChange={set('heardAboutJmp')} onBlur={markTouched('heardAboutJmp')} className={fieldClass(Boolean(visibleError('heardAboutJmp', touched, errors)))} style={{ colorScheme: 'dark' }}>
              <option value="">Select one</option>
              {REFERRAL_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/25 bg-[#0F1C2E] p-4">
            <input id="referred" name="referred" type="checkbox" checked={form.referred} onChange={set('referred')} className="mt-1 accent-blue-500" />
            <span className="text-[13px] leading-[1.7] text-slate-100">I was referred by someone connected to J Merrill Publishing.</span>
          </label>

          {form.referred && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referrer name" name="referrerName" error={visibleError('referrerName', touched, errors)}>
                <input id="referrerName" name="referrerName" value={form.referrerName} onChange={set('referrerName')} onBlur={markTouched('referrerName')} className={fieldClass(Boolean(visibleError('referrerName', touched, errors)))} />
              </Field>
              <Field label="Referrer email" name="referrerEmail" error={visibleError('referrerEmail', touched, errors)}>
                <input id="referrerEmail" name="referrerEmail" type="email" value={form.referrerEmail} onChange={set('referrerEmail')} onBlur={markTouched('referrerEmail')} className={fieldClass(Boolean(visibleError('referrerEmail', touched, errors)))} />
              </Field>
              <Field label="Relationship" name="referrerRelationship" error={visibleError('referrerRelationship', touched, errors)}>
                <input id="referrerRelationship" name="referrerRelationship" value={form.referrerRelationship} onChange={set('referrerRelationship')} onBlur={markTouched('referrerRelationship')} className={fieldClass(Boolean(visibleError('referrerRelationship', touched, errors)))} />
              </Field>
              <Field label="Referral notes" name="referrerNotes" error={visibleError('referrerNotes', touched, errors)}>
                <input id="referrerNotes" name="referrerNotes" value={form.referrerNotes} onChange={set('referrerNotes')} onBlur={markTouched('referrerNotes')} className={fieldClass(Boolean(visibleError('referrerNotes', touched, errors)))} />
              </Field>
            </div>
          )}

          <Field label="Author platform" name="authorPlatform" error={visibleError('authorPlatform', touched, errors)} helper="Optional. Website, social profiles, speaking, ministry, business, community, email list, or prior publications.">
            <textarea id="authorPlatform" name="authorPlatform" value={form.authorPlatform} onChange={set('authorPlatform')} onBlur={markTouched('authorPlatform')} rows={4} className={`${fieldClass(Boolean(visibleError('authorPlatform', touched, errors)))} resize-none`} />
          </Field>

          <Field label="Accessibility support" name="accessibilityNotes" error={visibleError('accessibilityNotes', touched, errors)} helper="Optional. Share anything that would help us make submission, review, or communication more accessible for you.">
            <textarea id="accessibilityNotes" name="accessibilityNotes" value={form.accessibilityNotes} onChange={set('accessibilityNotes')} onBlur={markTouched('accessibilityNotes')} rows={3} className={`${fieldClass(Boolean(visibleError('accessibilityNotes', touched, errors)))} resize-none`} />
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="verification-heading">
          <SectionHeading id="verification-heading" title="Rights, permission, and verification" />

          <Field label="Rights attestation" name="rightsAttestation" required error={visibleError('rightsAttestation', touched, errors)}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/25 bg-[#0F1C2E] p-4 focus-within:border-blue-400">
              <input id="rightsAttestation" name="rightsAttestation" type="checkbox" checked={form.rightsAttestation} onChange={set('rightsAttestation')} onBlur={markTouched('rightsAttestation')} className="mt-1 accent-blue-500" />
              <span className="text-[13px] leading-[1.7] text-slate-100">
                I have authority to submit this project for review and have disclosed any known ownership, rights, or third-party material concerns below.
              </span>
            </label>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Third-party material or rights notes" name="thirdPartyMaterialDisclosure" error={visibleError('thirdPartyMaterialDisclosure', touched, errors)}>
              <textarea id="thirdPartyMaterialDisclosure" name="thirdPartyMaterialDisclosure" value={form.thirdPartyMaterialDisclosure} onChange={set('thirdPartyMaterialDisclosure')} onBlur={markTouched('thirdPartyMaterialDisclosure')} rows={3} className={`${fieldClass(Boolean(visibleError('thirdPartyMaterialDisclosure', touched, errors)))} resize-none`} />
            </Field>
            <Field label="AI/manuscript disclosure" name="aiDisclosure" error={visibleError('aiDisclosure', touched, errors)}>
              <textarea id="aiDisclosure" name="aiDisclosure" value={form.aiDisclosure} onChange={set('aiDisclosure')} onBlur={markTouched('aiDisclosure')} rows={3} className={`${fieldClass(Boolean(visibleError('aiDisclosure', touched, errors)))} resize-none`} />
            </Field>
          </div>

          <Field label="Sensitive content note" name="sensitiveContentDisclosure" error={visibleError('sensitiveContentDisclosure', touched, errors)} helper="Optional. Share mature, graphic, sensitive, or potentially triggering material that would help our editorial team handle the work with care.">
            <textarea id="sensitiveContentDisclosure" name="sensitiveContentDisclosure" value={form.sensitiveContentDisclosure} onChange={set('sensitiveContentDisclosure')} onBlur={markTouched('sensitiveContentDisclosure')} rows={3} className={`${fieldClass(Boolean(visibleError('sensitiveContentDisclosure', touched, errors)))} resize-none`} />
          </Field>

          <Field label="Service communication consent" name="serviceCommunicationConsent" required error={visibleError('serviceCommunicationConsent', touched, errors)}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/25 bg-[#0F1C2E] p-4 focus-within:border-blue-400">
              <input
                id="serviceCommunicationConsent"
                name="serviceCommunicationConsent"
                type="checkbox"
                checked={form.serviceCommunicationConsent}
                onChange={(event) => {
                  set('serviceCommunicationConsent')(event)
                  setForm((current) => ({ ...current, consent: event.target.checked }))
                }}
                onBlur={markTouched('serviceCommunicationConsent')}
                className="mt-1 accent-blue-500"
              />
              <span className="text-[13px] leading-[1.7] text-slate-100">
                I give J Merrill Publishing permission to review my inquiry and any manuscript file or link I provide, and to contact me about my book. I understand this form does not collect payment data, SSN, or banking information.
              </span>
            </label>
          </Field>

          <Field label="Marketing consent" name="marketingConsent" error={visibleError('marketingConsent', touched, errors)}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/25 bg-[#0F1C2E] p-4 focus-within:border-blue-400">
              <input id="marketingConsent" name="marketingConsent" type="checkbox" checked={form.marketingConsent} onChange={set('marketingConsent')} onBlur={markTouched('marketingConsent')} className="mt-1 accent-blue-500" />
              <span className="text-[13px] leading-[1.7] text-slate-100">
                I would also like to receive occasional publishing news, updates, or general communications. This is optional and not required for Publishing service communication.
              </span>
            </label>
          </Field>

          <div>
            {verificationConfigStatus === 'loading' && (
              <p className="min-h-[70px] rounded-2xl border border-white/20 bg-[#0F1C2E] px-4 py-5 text-[13px] text-slate-100">
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
      <label htmlFor={name} className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-slate-100">
        {label} {required && <span className="text-blue-300">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p className="mt-1.5 text-[11px] leading-[1.6] text-slate-200">
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
    <div className="rounded-3xl border border-blue-500/30 bg-[#18283B] p-8 text-center text-slate-50 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-12">
      {children}
    </div>
  )
}

function validate(form: JoinFormState, manuscriptFile: File | null): Errors {
  const errors: Errors = {}

  if (!between(form.firstName, 1, 60)) errors.firstName = 'Enter a first name, 60 characters or fewer.'
  if (!between(form.lastName, 1, 60)) errors.lastName = 'Enter a last name, 60 characters or fewer.'
  if (form.preferredName && !between(form.preferredName, 1, 60)) errors.preferredName = 'Use 60 characters or fewer.'
  if (form.publishingName && !between(form.publishingName, 1, 120)) errors.publishingName = 'Use 120 characters or fewer.'
  if (form.penName && !between(form.penName, 1, 120)) errors.penName = 'Use 120 characters or fewer.'
  if (!emailPattern.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!between(form.streetAddress, 1, 160)) errors.streetAddress = 'Enter a street address.'
  if (!between(form.city, 1, 100)) errors.city = 'Enter a city.'
  if (!between(form.stateProvince, 1, 100)) errors.stateProvince = 'Enter a state or province.'
  if (!between(form.postalCode, 1, 30)) errors.postalCode = 'Enter a postal code.'
  if (!between(form.country, 1, 80)) errors.country = 'Enter a country.'
  if (!form.billingSameAsMailing) {
    if (!between(form.billingStreetAddress, 1, 160)) errors.billingStreetAddress = 'Enter a billing street address.'
    if (!between(form.billingCity, 1, 100)) errors.billingCity = 'Enter a billing city.'
    if (!between(form.billingStateProvince, 1, 100)) errors.billingStateProvince = 'Enter a billing state or province.'
    if (!between(form.billingPostalCode, 1, 30)) errors.billingPostalCode = 'Enter a billing postal code.'
    if (!between(form.billingCountry, 1, 80)) errors.billingCountry = 'Enter a billing country.'
  }
  if (!between(form.bookTitle, 1, 200)) errors.bookTitle = 'Enter a book title, 200 characters or fewer.'
  if (form.subtitle && !between(form.subtitle, 1, 200)) errors.subtitle = 'Use 200 characters or fewer.'
  if (!form.workType) errors.workType = 'Select a work type.'
  if (!between(form.genre, 1, 100)) errors.genre = 'Enter a genre, 100 characters or fewer.'

  const count = Number.parseInt(form.wordCount, 10)
  if (!Number.isFinite(count) || count < 100 || count > 500000) {
    errors.wordCount = 'Enter a word count between 100 and 500,000.'
  }

  if (!form.manuscriptStatus) errors.manuscriptStatus = 'Select a manuscript status.'
  if (form.manuscriptUrl.trim() && !isPlaceholderUrl(form.manuscriptUrl) && !isValidUrl(form.manuscriptUrl)) errors.manuscriptUrl = 'Enter a valid shareable URL.'
  if (form.manuscriptSubmissionChoice !== 'now' && form.manuscriptSubmissionChoice !== 'later') {
    errors.manuscriptSubmissionChoice = 'Choose whether you want to submit your manuscript now or later.'
  }
  if (form.manuscriptSubmissionChoice === 'now' && !manuscriptFile && !optionalUrl(form.manuscriptUrl)) {
    errors.manuscriptSubmissionChoice = 'Upload a manuscript file or provide a manuscript link, or choose to send it later.'
  }
  if (!form.publishedBefore) errors.publishedBefore = 'Select your publishing history.'
  if (!between(form.bookDescription, 50, 2000)) errors.bookDescription = 'Enter 50–2,000 characters.'
  if (form.intendedAudience.length > 500) errors.intendedAudience = 'Use 500 characters or fewer.'
  if (form.bookGoals.length > 500) errors.bookGoals = 'Use 500 characters or fewer.'
  if (form.desiredTimeline.length > 160) errors.desiredTimeline = 'Use 160 characters or fewer.'
  if (form.priorPublishingHistory.length > 500) errors.priorPublishingHistory = 'Use 500 characters or fewer.'
  if (form.referrerEmail.trim() && !emailPattern.test(form.referrerEmail.trim())) errors.referrerEmail = 'Enter a valid referrer email address.'
  if (form.whyJmp.length > 500) errors.whyJmp = 'Use 500 characters or fewer.'
  if (form.publishingPartnerHope.length > 500) errors.publishingPartnerHope = 'Use 500 characters or fewer.'
  if (form.authorPlatform.length > 1000) errors.authorPlatform = 'Use 1,000 characters or fewer.'
  if (form.accessibilityNotes.length > 500) errors.accessibilityNotes = 'Use 500 characters or fewer.'
  if (form.thirdPartyMaterialDisclosure.length > 800) errors.thirdPartyMaterialDisclosure = 'Use 800 characters or fewer.'
  if (form.aiDisclosure.length > 800) errors.aiDisclosure = 'Use 800 characters or fewer.'
  if (form.sensitiveContentDisclosure.length > 800) errors.sensitiveContentDisclosure = 'Use 800 characters or fewer.'
  if (form.additionalNotes.length > 1000) errors.additionalNotes = 'Use 1,000 characters or fewer.'
  if (manuscriptFile) {
    const extension = manuscriptFile.name.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
    if (!allowedManuscriptExtensions.includes(extension)) {
      errors.manuscriptFile = 'Upload a .docx, .doc, .pages, .rtf, or .pdf manuscript file.'
    } else if (manuscriptFile.size <= 0) {
      errors.manuscriptFile = 'Upload a non-empty manuscript file.'
    } else if (manuscriptFile.size > maxManuscriptFileBytes) {
      errors.manuscriptFile = 'Upload a manuscript file smaller than 25 MB.'
    }
  }
  if (!form.serviceCommunicationConsent) errors.serviceCommunicationConsent = 'Service communication consent is required.'
  if (!form.rightsAttestation) errors.rightsAttestation = 'Rights attestation is required.'
  if (!form.consent) errors.consent = 'Consent is required.'
  if (!form.turnstileToken) errors.turnstileToken = 'Complete the verification challenge.'

  return errors
}

function visibleError(field: keyof JoinFormState, touched: Partial<Record<keyof JoinFormState, boolean>>, errors: Errors) {
  return touched[field] ? errors[field] : undefined
}

function markAllTouched(): Partial<Record<keyof JoinFormState, boolean>> {
  return Object.fromEntries(Object.keys(initialForm).map((key) => [key, true])) as Partial<Record<keyof JoinFormState, boolean>>
}

function fieldClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-[#0F1C2E] px-4 py-3 text-[14px] text-white placeholder:text-slate-300 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#0F1C2E]',
    hasError ? 'border-red-300 focus:border-red-200' : 'border-white/30 focus:border-blue-400',
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

function buildMultipartPayload(payload: Record<string, unknown>, manuscriptFile: File) {
  const formData = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    formData.append(key, String(value))
  }

  formData.append('manuscriptFile', manuscriptFile)
  return formData
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
