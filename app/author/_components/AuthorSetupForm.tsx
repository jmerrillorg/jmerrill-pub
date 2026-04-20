'use client'

import { useState } from 'react'

type Field = {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  options?: string[]
  note?: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function AuthorSetupForm({
  endpoint,
  submitLabel,
  successTitle,
  successMessage,
  fields,
}: {
  endpoint: string
  submitLabel: string
  successTitle: string
  successMessage: string
  fields: Field[]
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, ''])),
  )
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const fieldClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500'
  const labelClass = 'mb-1.5 block font-mono text-[11px] uppercase tracking-[0.1em] text-white/40'

  function setValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Submission failed.')
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/[0.06] p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-[24px] text-white">✓</div>
        <h2
          className="text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
        >
          {successTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/45">{successMessage}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/8 bg-white/[0.04] p-7 backdrop-blur sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const isWide = field.type === 'textarea' || field.name.includes('Address') || field.name.includes('notes') || field.name.includes('Links') || field.name.includes('titleList')

          return (
            <div key={field.name} className={isWide ? 'sm:col-span-2' : undefined}>
              <label className={labelClass}>
                {field.label} {field.required ? <span className="text-blue-400">*</span> : null}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.name]}
                  onChange={(event) => setValue(field.name, event.target.value)}
                  rows={5}
                  required={field.required}
                  placeholder={field.placeholder}
                  className={`${fieldClass} resize-none leading-[1.7]`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.name]}
                  onChange={(event) => setValue(field.name, event.target.value)}
                  required={field.required}
                  className={fieldClass}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select one</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={values[field.name]}
                  onChange={(event) => setValue(field.name, event.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  className={fieldClass}
                />
              )}
              {field.note ? <p className="mt-2 text-[12px] leading-[1.6] text-white/25">{field.note}</p> : null}
            </div>
          )
        })}
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[520px] text-[12px] leading-[1.7] text-white/28">
          Submissions are prepared for Dataverse routing and operational notification to publishing@jmerrill.one. Do not enter full SSNs or bank account numbers in this form.
        </p>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-full bg-blue-500 px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-60"
        >
          {status === 'submitting' ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export const onboardingFields: Field[] = [
  { name: 'authorName', label: 'Author name', required: true },
  { name: 'legalName', label: 'Legal name' },
  { name: 'preferredName', label: 'Preferred name' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', required: true },
  { name: 'mailingAddress', label: 'Mailing address', type: 'textarea' },
  { name: 'bookTitle', label: 'Book title', required: true },
  { name: 'subtitle', label: 'Subtitle' },
  { name: 'genre', label: 'Genre / category' },
  {
    name: 'manuscriptStatus',
    label: 'Manuscript status',
    type: 'select',
    required: true,
    options: ['Idea / outline', 'In progress', 'Draft complete', 'Edited manuscript', 'Previously published'],
  },
  {
    name: 'publishingGoal',
    label: 'Publishing goal',
    type: 'select',
    required: true,
    options: ['Share my story', 'Build authority', 'Ministry / speaking', 'Professional author platform', 'Legacy project', 'Other'],
  },
  {
    name: 'packageInterest',
    label: 'Package interest',
    type: 'select',
    options: ['Starter', 'Pro', 'Signature', 'Not sure yet'],
  },
  { name: 'authorBio', label: 'Author bio', type: 'textarea', placeholder: 'Short author bio, credentials, ministry, business, or story context.' },
  { name: 'audience', label: 'Audience and reader fit', type: 'textarea' },
  { name: 'platformLinks', label: 'Website / social links', type: 'textarea' },
  { name: 'manuscriptLink', label: 'Manuscript or file link', note: 'Use a private OneDrive, SharePoint, Google Drive, or Dropbox link if available.' },
  { name: 'notes', label: 'Additional notes', type: 'textarea' },
]

export const financialFields: Field[] = [
  { name: 'authorName', label: 'Author name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'legalPayeeName', label: 'Legal payee name', required: true },
  { name: 'businessName', label: 'Business name, if applicable' },
  {
    name: 'taxClassification',
    label: 'Tax classification',
    type: 'select',
    required: true,
    options: ['Individual / Sole proprietor', 'LLC', 'Corporation', 'Nonprofit', 'Other / unsure'],
  },
  {
    name: 'paymentPreference',
    label: 'Payment preference',
    type: 'select',
    required: true,
    options: ['ACH / direct deposit follow-up', 'Check by mail', 'PayPal / digital payment follow-up', 'Not sure yet'],
  },
  { name: 'paymentEmail', label: 'Payment email, if different', type: 'email' },
  { name: 'mailingAddress', label: 'Mailing address', type: 'textarea', required: true },
  {
    name: 'taxDocumentStatus',
    label: 'W-9 / tax form status',
    type: 'select',
    options: ['Need secure upload link', 'Already provided', 'Will provide later', 'Not sure'],
  },
  { name: 'notes', label: 'Financial setup notes', type: 'textarea', note: 'Do not enter SSNs or bank account numbers here. JMP will request sensitive documents through a secure channel.' },
]

export const royaltyFields: Field[] = [
  { name: 'authorName', label: 'Author name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'titleList', label: 'Titles covered by this setup', type: 'textarea', required: true },
  { name: 'royaltyContact', label: 'Royalty contact name', required: true },
  {
    name: 'reportingPreference',
    label: 'Reporting preference',
    type: 'select',
    required: true,
    options: ['Email PDF reports', 'Author portal when available', 'Both email and portal', 'Not sure yet'],
  },
  {
    name: 'preferredReportFrequency',
    label: 'Preferred report frequency',
    type: 'select',
    options: ['Monthly', 'Quarterly', 'Semiannual', 'Annual', 'Not sure'],
  },
  {
    name: 'paymentCadence',
    label: 'Payment cadence',
    type: 'select',
    options: ['Monthly if eligible', 'Quarterly', 'Annual', 'Per agreement', 'Not sure'],
  },
  {
    name: 'existingAgreementStatus',
    label: 'Agreement status',
    type: 'select',
    options: ['Signed agreement on file', 'Agreement in progress', 'Need agreement review', 'Not sure'],
  },
  { name: 'notes', label: 'Royalty setup notes', type: 'textarea' },
]
