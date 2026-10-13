'use client'
import { useEffect, useRef, useState } from 'react'
import { AuthorSetupForm, onboardingFields } from '../author/_components/AuthorSetupForm'
type Context = { title: string; authorName: string; email: string; phone: string; mailingAddress: string }
const fundedNotes: Record<string, string> = {
  'section-governed-format-selection': 'Record your format preferences for this publisher-funded project. Preferences do not authorize new spending, provider commitments or publication.',
  governedFormatSelection: 'Choose your preferred formats. The executed agreement and separate production approvals remain authoritative.',
  additionalFormatInterest: 'Additional format interest requires separate production and budget approval; it creates no author fee or provider commitment.',
  isbn_preassigned: 'Enter an existing ISBN only if it belongs to this exact edition. Leaving this blank does not authorize assignment or publication.',
}
export default function OnboardingPage() {
  const [token, setToken] = useState(''), [context, setContext] = useState<Context | null>(null), [error, setError] = useState('')
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const value = window.location.hash.slice(1)
    window.history.replaceState(null, '', window.location.pathname)
    setToken(value)
    if (!value) { setError('Open your personal onboarding link from Publishing.'); return }
    void fetch('/api/publishing/onboarding', { headers: { Authorization: `Bearer ${value}` }, cache: 'no-store' })
      .then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error); setContext(data) })
      .catch(() => setError('This link is unavailable. Please contact publishing@jmerrill.one.'))
  }, [])
  const defaults: Record<string, string> = context ? { authorName: context.authorName, legalName: context.authorName,
    email: context.email, phone: context.phone, mailingAddress: context.mailingAddress, bookTitle: context.title,
    packageConfirmation: 'PUBLISHER_FUNDED' } : {}
  return <div className="min-h-screen bg-[#070710] pt-28 text-white">
    <main className="mx-auto max-w-3xl px-6 py-12">
    <h1 className="mb-6 text-3xl font-semibold">Author onboarding</h1>
    {error ? <p role="alert">{error}</p> : !context ? <p>Loading your request...</p> : <>
      <h2 className="mb-6 text-xl">{context.title}</h2>
      <AuthorSetupForm endpoint="/api/publishing/onboarding" requestHeaders={{ Authorization: `Bearer ${token}` }}
        fields={onboardingFields.filter(field => !['editingLevelAcknowledgment', 'payment_acknowledgment'].includes(field.name)).map(field => ({ ...field, defaultValue: defaults[field.name] ?? field.defaultValue,
          ...(fundedNotes[field.name] ? { note: fundedNotes[field.name] } : {}),
          ...(field.name === 'packageConfirmation' ? { type: 'text' as const, label: 'Funding route' } : {}) }))}
        submitLabel="Submit onboarding" successTitle="Your answers have been received."
        successMessage="Publishing will review your title-bound submission. No portal account is required."
        failureMessage="Receipt could not be confirmed. Keep this request and contact Publishing before starting another submission." />
    </>}
    </main>
  </div>
}
