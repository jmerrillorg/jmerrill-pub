'use client'

import { useState } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

type PartnerApplyFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  website: string
  tier: string
  imprint: string
  existingTitles: string
  pipeline: string
  vision: string
}

const INITIAL_FORM: PartnerApplyFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  website: '',
  tier: '',
  imprint: '',
  existingTitles: '',
  pipeline: '',
  vision: '',
}

export function PartnerApplyForm() {
  const [form, setForm] = useState<PartnerApplyFormState>(INITIAL_FORM)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: keyof PartnerApplyFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.firstName || !form.lastName || !form.email || !form.tier || !form.imprint || !form.pipeline || !form.vision) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const response = await fetch('/api/partner-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to submit the application.')

      setStatus('success')
      setForm(INITIAL_FORM)
    } catch (error: unknown) {
      setStatus('error')
      setErrorMsg(error instanceof Error ? error.message : 'Unable to submit the application.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-3xl border border-blue-500/25 bg-white/[0.04] p-10 text-center backdrop-blur">
        <div className="mb-4 text-[48px]">✓</div>
        <h2
          className="text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.15 }}
        >
          Application received.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[15px] font-light leading-[1.8] text-white/45">
          Thank you for applying to the Publishing Partner Program. We sent a confirmation to your email and will review your application within 3–5 business days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldDark label="First Name" value={form.firstName} onChange={set('firstName')} required />
        <FieldDark label="Last Name" value={form.lastName} onChange={set('lastName')} required />
      </div>

      <FieldDark label="Email Address" type="email" value={form.email} onChange={set('email')} required />
      <FieldDark label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
      <FieldDark label="Website or Social Profile URL" type="url" value={form.website} onChange={set('website')} />

      <SelectDark label="Program Tier" value={form.tier} onChange={set('tier')} required>
        <option value="">Select a tier</option>
        <option value="Partner">Partner — Up to 2 titles/year ($9,000 annually)</option>
        <option value="Signature">Signature Author — Up to 3 titles/year ($15,000 annually)</option>
        <option value="Unsure">Not sure yet — help me decide</option>
      </SelectDark>

      <SelectDark label="Primary Imprint" value={form.imprint} onChange={set('imprint')} required>
        <option value="">Select an imprint</option>
        <option value="J Merrill Publishing">J Merrill Publishing — flagship and core catalog</option>
        <option value="JM Little">JM Little — children&apos;s and youth titles</option>
        <option value="JM Verse">JM Verse — poetry, lyrical, and verse-centered work</option>
        <option value="JM Signature">JM Signature — marquee and prestige releases</option>
        <option value="JM Works">JM Works — general trade, inspirational, memoir, and nonfiction</option>
        <option value="Unsure">Not sure — spanning multiple genres</option>
      </SelectDark>

      <FieldDark
        label="Current Published Title(s)"
        value={form.existingTitles}
        onChange={set('existingTitles')}
        hint="List any books you've already published"
      />

      <TextAreaDark
        label="Titles in Your Pipeline"
        value={form.pipeline}
        onChange={set('pipeline')}
        required
        rows={3}
        placeholder="Briefly describe the books you plan to publish over the next 1–2 years — titles, genres, and where each is in the writing process."
      />

      <TextAreaDark
        label="Your Publishing Vision"
        value={form.vision}
        onChange={set('vision')}
        required
        rows={4}
        placeholder="What are you building? What impact do you want your body of work to have? Who is your audience?"
      />

      {errorMsg ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {errorMsg}
        </p>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-full bg-blue-500 py-4 text-[14px] font-semibold uppercase tracking-[0.05em] text-white shadow-[0_4px_24px_rgba(30,144,255,0.4)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === 'submitting' ? 'Submitting Application...' : 'Submit Application →'}
        </button>
        <p className="mt-4 text-center text-[12px] text-white/20">
          Applications reviewed within 3–5 business days. This is not a commitment — it is the beginning of a conversation.
        </p>
      </div>
    </form>
  )
}

function Label({
  children,
  required = false,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label
      className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/40"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {children}
      {required ? <span className="ml-0.5 text-blue-500">*</span> : null}
    </label>
  )
}

function FieldDark({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  hint,
}: {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  required?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label required={required}>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder:text-white/20 transition-colors focus:border-blue-500 focus:outline-none"
      />
      {hint ? <span className="text-[11px] font-light text-white/20">{hint}</span> : null}
    </div>
  )
}

function SelectDark({
  label,
  value,
  onChange,
  required = false,
  children,
}: {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label required={required}>{label}</Label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white transition-colors focus:border-blue-500 focus:outline-none"
        style={{ colorScheme: 'dark' }}
      >
        {children}
      </select>
    </div>
  )
}

function TextAreaDark({
  label,
  value,
  onChange,
  required = false,
  rows,
  placeholder,
}: {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  required?: boolean
  rows: number
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label required={required}>{label}</Label>
      <textarea
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder:text-white/20 transition-colors focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}
