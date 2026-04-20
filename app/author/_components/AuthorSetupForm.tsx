'use client'

import { useState } from 'react'

type Field = {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  kind?: 'field' | 'section'
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
    Object.fromEntries(fields.filter((field) => field.kind !== 'section').map((field) => [field.name, ''])),
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
        headers: {
          'Content-Type': 'application/json',
          'x-author-access-code': sessionStorage.getItem('jmp-author-onboarding-access-code') || '',
        },
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
          if (field.kind === 'section') {
            return (
              <div key={field.name} className="sm:col-span-2">
                <div className="rounded-3xl border border-blue-500/15 bg-blue-500/[0.06] px-5 py-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{field.label}</div>
                  {field.note ? <p className="mt-2 max-w-[760px] text-[13px] font-light leading-[1.7] text-white/38">{field.note}</p> : null}
                </div>
              </div>
            )
          }

          const isWide = field.type === 'textarea' || field.type === 'checkbox' || field.name.includes('Address') || field.name.includes('notes') || field.name.includes('Links') || field.name.includes('titleList') || field.name.includes('Description') || field.name.includes('Vision')

          return (
            <div key={field.name} className={isWide ? 'sm:col-span-2' : undefined}>
              <label className={labelClass}>
                {field.label} {field.required ? <span className="text-blue-400">*</span> : null}
              </label>
              {field.type === 'checkbox' ? (
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-[13px] leading-[1.7] text-white/55">
                  <input
                    type="checkbox"
                    checked={values[field.name] === 'true'}
                    onChange={(event) => setValue(field.name, event.target.checked ? 'true' : '')}
                    required={field.required}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-blue-500"
                  />
                  <span>{field.placeholder || field.note || field.label}</span>
                </label>
              ) : field.type === 'textarea' ? (
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
  {
    kind: 'section',
    name: 'section-author-identity',
    label: 'Section 1 - Author identity',
    note: 'Required identity and contact details for the author record. Pen names are captured separately from legal names.',
  },
  { name: 'authorName', label: 'Author / public name', required: true },
  { name: 'legalName', label: 'Full legal name', required: true },
  { name: 'penName', label: 'Pen name, if applicable' },
  { name: 'preferredName', label: 'Preferred name' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', required: true },
  { name: 'mailingAddress', label: 'Mailing address', type: 'textarea', required: true },
  {
    kind: 'section',
    name: 'section-book-metadata',
    label: 'Section 2 - Book metadata',
    note: 'Core title metadata that can later map to Dataverse title records, catalog pages, sell sheets, and distribution prep.',
  },
  { name: 'bookTitle', label: 'Book title', required: true },
  { name: 'subtitle', label: 'Subtitle' },
  { name: 'genre', label: 'Genre / category', required: true },
  { name: 'targetAudience', label: 'Target audience', type: 'textarea', required: true },
  { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true, placeholder: '50-100 words for quick catalog, sales, and reviewer context.' },
  { name: 'longDescription', label: 'Long description', type: 'textarea', placeholder: '150-300 words for expanded catalog and future title pages.' },
  {
    kind: 'section',
    name: 'section-manuscript-intake',
    label: 'Section 3 - Manuscript intake',
    note: 'For now, use secure file links instead of direct upload. This keeps the website stable while SharePoint/Dataverse intake is prepared.',
  },
  {
    name: 'manuscriptStatus',
    label: 'Manuscript status',
    type: 'select',
    required: true,
    options: ['Idea / outline', 'In progress', 'Draft complete', 'Edited manuscript', 'Previously published'],
  },
  { name: 'manuscriptLink', label: 'Manuscript file link', note: 'Use a private OneDrive, SharePoint, Google Drive, or Dropbox link if available.' },
  { name: 'supportingFilesLink', label: 'Supporting files link', note: 'Optional link for images, permissions, sample covers, forewords, endorsements, or supplemental files.' },
  {
    name: 'editingLevelAcknowledgment',
    label: 'Editing level acknowledgment',
    type: 'select',
    options: ['Developmental editing may be needed', 'Line editing may be needed', 'Copyediting may be needed', 'Proofread only', 'Not sure yet'],
  },
  { name: 'authorIntentNotes', label: 'Author intent / manuscript notes', type: 'textarea' },
  {
    kind: 'section',
    name: 'section-rights-compliance',
    label: 'Section 4 - Rights and compliance',
    note: 'Lightweight rights screening. Formal contract, permissions, and legal review remain separate from this intake.',
  },
  {
    name: 'originalWorkConfirmation',
    label: 'Original work confirmation',
    type: 'checkbox',
    required: true,
    placeholder: 'I confirm this work is original to me/us or that I am prepared to provide permissions for any third-party material.',
  },
  {
    name: 'hasCoAuthors',
    label: 'Co-authors',
    type: 'select',
    options: ['No', 'Yes', 'Not sure yet'],
  },
  { name: 'coAuthorNames', label: 'Co-author names', type: 'textarea' },
  {
    name: 'priorPublication',
    label: 'Prior publication',
    type: 'select',
    options: ['No', 'Yes - self-published', 'Yes - traditional or hybrid publisher', 'Yes - serialized/blog/newsletter', 'Not sure'],
  },
  {
    kind: 'section',
    name: 'section-design-direction',
    label: 'Section 5 - Design direction',
    note: 'Optional creative direction for cover, interior, tone, and visual references.',
  },
  { name: 'coverVision', label: 'Cover vision', type: 'textarea' },
  { name: 'referenceCovers', label: 'Reference covers / inspiration links', type: 'textarea' },
  { name: 'toneStylePreferences', label: 'Tone / style preferences', type: 'textarea' },
  {
    kind: 'section',
    name: 'section-marketing-foundation',
    label: 'Section 6 - Marketing foundation',
    note: 'Early platform signals for launch planning, speaking, ministry/business alignment, and future author growth infrastructure.',
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
  { name: 'authorPlatform', label: 'Author platform', type: 'textarea', placeholder: 'Ministry, business, speaking, nonprofit, community, media, or professional platform.' },
  { name: 'socialMediaLinks', label: 'Website / social media links', type: 'textarea' },
  { name: 'emailListSize', label: 'Email list size', type: 'select', options: ['No list yet', 'Under 500', '500-2,500', '2,500-10,000', '10,000+', 'Not sure'] },
  { name: 'speakingInterest', label: 'Speaking interest', type: 'select', options: ['Yes', 'No', 'Maybe later'] },
  { name: 'notes', label: 'Additional notes', type: 'textarea' },
]

export const financialFields: Field[] = [
  {
    kind: 'section',
    name: 'section-financial-control',
    label: 'Gated financial setup',
    note: 'This form is for active or invited authors only. It captures payout readiness without collecting bank account numbers, SSNs, or EINs directly on the website.',
  },
  { name: 'authorName', label: 'Author name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'legalPayeeName', label: 'Legal payee name', required: true },
  { name: 'businessName', label: 'Business name, if applicable' },
  {
    name: 'activeAuthorStatus',
    label: 'Activation status',
    type: 'select',
    required: true,
    options: ['Active author', 'Contract/payment complete', 'Manuscript intake complete', 'Invited by JMP staff', 'Not sure'],
  },
  {
    name: 'taxClassification',
    label: 'Tax classification',
    type: 'select',
    required: true,
    options: ['Individual / Sole proprietor', 'LLC', 'Corporation', 'Nonprofit', 'Other / unsure'],
  },
  {
    name: 'taxIdentifierType',
    label: 'Tax ID type',
    type: 'select',
    options: ['SSN follow-up required', 'EIN follow-up required', 'Not sure', 'Already on file'],
    note: 'Do not enter the SSN or EIN value here.',
  },
  {
    name: 'paymentPreference',
    label: 'Payment preference',
    type: 'select',
    required: true,
    options: ['Secure ACH onboarding link', 'Check by mail', 'PayPal / digital payment follow-up', 'Stripe/processor onboarding when available', 'Not sure yet'],
  },
  { name: 'securePaymentLinkPreference', label: 'Secure payment onboarding link', type: 'checkbox', placeholder: 'I prefer to complete bank or processor details through a secure payment onboarding link.' },
  { name: 'paymentEmail', label: 'Payment email, if different', type: 'email' },
  { name: 'mailingAddress', label: 'Mailing address', type: 'textarea', required: true },
  {
    name: 'taxDocumentStatus',
    label: 'W-9 / tax form status',
    type: 'select',
    required: true,
    options: ['Need secure upload link', 'Already provided', 'Will provide later', 'Not sure'],
  },
  { name: 'notes', label: 'Financial setup notes', type: 'textarea', note: 'Do not enter SSNs or bank account numbers here. JMP will request sensitive documents through a secure channel.' },
]

export const royaltyFields: Field[] = [
  {
    kind: 'section',
    name: 'section-royalty-readiness',
    label: 'Gated royalty setup',
    note: 'This captures reporting and title-coverage preferences for future Dataverse and Power BI royalty infrastructure.',
  },
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
    name: 'royaltyDashboardInterest',
    label: 'Future royalty dashboard interest',
    type: 'select',
    options: ['Yes - portal visibility is important', 'Email reports are enough for now', 'Both', 'Not sure yet'],
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
  { name: 'royaltyNotes', label: 'Royalty notes / special terms to confirm', type: 'textarea' },
  { name: 'notes', label: 'Royalty setup notes', type: 'textarea' },
]
