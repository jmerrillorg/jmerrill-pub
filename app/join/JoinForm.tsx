'use client'

import Link from 'next/link'
import { useState, type ChangeEvent, type FormEvent } from 'react'

const GENRES = [
  'Fiction',
  'Nonfiction',
  'Christian / Faith',
  'Inspirational',
  'Biography / Memoir',
  'Self-Help',
  "Children's",
  'Devotional',
  'Poetry',
  'Business',
  'Other',
]

const WORK_TYPES = [
  'Full-length Book',
  'Novella',
  "Children's Picture Book",
  'Poetry Collection',
  'Devotional',
  'Workbook / Journal',
  'Short Story Collection',
  'Other',
]

const GOALS = [
  'Build my personal brand',
  'Share my story',
  'Become a professional author',
  'Publish and distribute my book',
  'Grow my audience',
  'Establish authority in my field',
  'Create a legacy work',
  'Launch a book-based business',
  'Ministry / faith-based impact',
  'Other',
]

const AUDIENCES = [
  'General Adult',
  'Young Adult (YA)',
  'Children (Ages 4–8)',
  'Children (Ages 9–12)',
  'Christian / Faith Community',
  'Business Professionals',
  'Women',
  'Men',
  'Seniors',
  'Academic / Educational',
  'Other',
]

const MANUSCRIPT_STATUS = [
  'Idea / Concept Only',
  'Outline Complete',
  'First Draft In Progress',
  'First Draft Complete',
  'Partially Edited',
  'Fully Written — Needs Editing',
  'Previously Published — Seeking Reprint',
]

const PUBLISH_TIMELINES = [
  'Within 3 Months',
  'Within 6 Months',
  'Within 1 Year',
  'Within 2 Years',
  'No Set Timeline',
]

const TIMEZONES = [
  'EST (Eastern)',
  'CST (Central)',
  'MST (Mountain)',
  'PST (Pacific)',
  'Other',
]

type Status = 'idle' | 'submitting' | 'success' | 'error'

type JoinFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  bookTitle: string
  genre: string
  wordCount: string
  workType: string
  manuscriptStatus: string
  goal: string
  primaryAudience: string
  comparableBooks: string
  publishTimeline: string
  needsBranding: boolean
  needsMarketing: boolean
  allowAiEditing: boolean
  city: string
  stateProvince: string
  country: string
  authorBio: string
  submissionUrl: string
  existingPlatform: string
  returningAuthor: boolean
  priorTitles: string
  consentToContact: boolean
  consentToTerms: boolean
  timezone: string
  message: string
}

const initialForm: JoinFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  bookTitle: '',
  genre: '',
  wordCount: '',
  workType: '',
  manuscriptStatus: '',
  goal: '',
  primaryAudience: '',
  comparableBooks: '',
  publishTimeline: '',
  needsBranding: false,
  needsMarketing: false,
  allowAiEditing: false,
  city: '',
  stateProvince: '',
  country: 'United States',
  authorBio: '',
  submissionUrl: '',
  existingPlatform: '',
  returningAuthor: false,
  priorTitles: '',
  consentToContact: false,
  consentToTerms: false,
  timezone: '',
  message: '',
}

function splitMultiValue(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function JoinForm() {
  const [form, setForm] = useState<JoinFormState>(initialForm)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set =
    (field: keyof JoinFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: e.target.value }))

  const setTag = (field: keyof JoinFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const toggleBooleanField = (field: 'needsBranding' | 'needsMarketing' | 'allowAiEditing') =>
    setForm((current) => ({ ...current, [field]: !current[field] }))

  const toggleGoal = (value: string) =>
    setForm((current) => {
      const existing = splitMultiValue(current.goal)
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value]

      return {
        ...current,
        goal: next.join(', '),
      }
    })

  const hasGoal = (value: string) => splitMultiValue(form.goal).includes(value)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.bookTitle ||
      !form.genre ||
      !form.goal ||
      !form.workType ||
      !form.manuscriptStatus ||
      !form.consentToContact ||
      !form.consentToTerms ||
      (form.returningAuthor && !form.priorTitles)
    ) {
      setErrorMsg('Please fill in all required fields and confirm consent to continue.')
      return
    }

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white/[0.04] border border-blue-500/25 rounded-3xl p-12 text-center">
        <div className="text-[48px] mb-4">✅</div>
        <h2
          className="text-white mb-3"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700 }}
        >
          Inquiry received.
        </h2>
        <p className="text-[15px] text-white/45 leading-[1.7] mb-6">
          Thank you, {form.firstName}. We received your inquiry about <em>{form.bookTitle}</em> and will be in touch within 1–2 business days to discuss your publishing journey.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-blue-400 border-b border-blue-400/30 hover:border-blue-400 transition-colors"
        >
          Back to J Merrill Publishing →
        </Link>
      </div>
    )
  }

  const fieldClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors'
  const labelClass = 'block text-[11px] font-medium tracking-[0.1em] uppercase text-white/40 mb-1.5'
  const pillClass = 'px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200'
  const pillSelectedClass = 'bg-blue-500 border-blue-500 text-white'
  const pillUnselectedClass = 'bg-white/5 border-white/10 text-white/50 hover:border-blue-500/40'
  const togglePillClass = 'px-5 py-2 rounded-full text-[12px] font-medium border transition-all duration-200'

  return (
    <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 backdrop-blur">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
                First Name <span className="text-blue-500">*</span>
              </label>
              <input type="text" value={form.firstName} onChange={set('firstName')} required className={fieldClass} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
                Last Name <span className="text-blue-500">*</span>
              </label>
              <input type="text" value={form.lastName} onChange={set('lastName')} required className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Email Address <span className="text-blue-500">*</span>
            </label>
            <input type="email" value={form.email} onChange={set('email')} required className={fieldClass} />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Phone Number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className={fieldClass} />
          </div>

        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
            Have you published with J Merrill Publishing before?
          </label>
          <div className="flex gap-3 mt-1">
            {['No', 'Yes'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    returningAuthor: opt === 'Yes',
                    priorTitles: opt === 'No' ? '' : current.priorTitles,
                  }))
                }
                className={`${togglePillClass} ${
                  (opt === 'Yes' ? form.returningAuthor : !form.returningAuthor)
                    ? pillSelectedClass
                    : pillUnselectedClass
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {form.returningAuthor && (
            <div className="mt-4">
              <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
                Which title(s) did you publish with us? <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={form.priorTitles}
                onChange={set('priorTitles')}
                placeholder="e.g. Damaged, The Fight for the Promiseland"
                className={fieldClass}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                This helps us pull up your author record and fast-track your intake.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>City</label>
              <input type="text" value={form.city} onChange={set('city')} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>State / Province</label>
              <input type="text" value={form.stateProvince} onChange={set('stateProvince')} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Country</label>
            <input type="text" value={form.country} onChange={set('country')} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Timezone</label>
            <select value={form.timezone} onChange={set('timezone')} className={fieldClass} style={{ colorScheme: 'dark' }}>
              <option value="">Select your timezone</option>
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Book Title <span className="text-blue-500">*</span>
            </label>
            <input
              type="text"
              value={form.bookTitle}
              onChange={set('bookTitle')}
              required
              placeholder="Working title is fine"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Work Type <span className="text-blue-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WORK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTag('workType', type)}
                  className={`${pillClass} ${form.workType === type ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Genre <span className="text-blue-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setTag('genre', genre)}
                  className={`${pillClass} ${form.genre === genre ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Manuscript Status <span className="text-blue-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MANUSCRIPT_STATUS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTag('manuscriptStatus', option)}
                  className={`${pillClass} ${form.manuscriptStatus === option ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Estimated Word Count</label>
            <input
              type="number"
              value={form.wordCount}
              onChange={set('wordCount')}
              placeholder="e.g. 60000"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
              Primary Goal <span className="text-blue-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={`${pillClass} ${hasGoal(goal) ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Primary Target Audience</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AUDIENCES.map((audience) => (
                <button
                  key={audience}
                  type="button"
                  onClick={() => setTag('primaryAudience', audience)}
                  className={`${pillClass} ${form.primaryAudience === audience ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Comparable Books</label>
            <textarea
              value={form.comparableBooks}
              onChange={set('comparableBooks')}
              rows={4}
              placeholder="List 2–3 books similar to yours in style, tone, or audience. This helps us understand your vision."
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Desired Publishing Timeline</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PUBLISH_TIMELINES.map((timeline) => (
                <button
                  key={timeline}
                  type="button"
                  onClick={() => setTag('publishTimeline', timeline)}
                  className={`${pillClass} ${form.publishTimeline === timeline ? pillSelectedClass : pillUnselectedClass}`}
                >
                  {timeline}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Support Needed</label>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                type="button"
                onClick={() => toggleBooleanField('needsBranding')}
                className={`${pillClass} ${form.needsBranding ? pillSelectedClass : pillUnselectedClass}`}
              >
                I&apos;m interested in branding support
              </button>
              <button
                type="button"
                onClick={() => toggleBooleanField('needsMarketing')}
                className={`${pillClass} ${form.needsMarketing ? pillSelectedClass : pillUnselectedClass}`}
              >
                I&apos;m interested in marketing support
              </button>
              <button
                type="button"
                onClick={() => toggleBooleanField('allowAiEditing')}
                className={`${pillClass} ${form.allowAiEditing ? pillSelectedClass : pillUnselectedClass}`}
              >
                I&apos;m open to AI-assisted editing
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Author Bio / Background</label>
            <textarea
              value={form.authorBio}
              onChange={set('authorBio')}
              rows={4}
              placeholder="Tell us a little about yourself. Ministry background, professional experience, previous writing, anything that gives us context."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Website or Social Media</label>
            <input
              type="text"
              value={form.existingPlatform}
              onChange={set('existingPlatform')}
              placeholder="Your website, Amazon author page, or primary social profile (optional)"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Existing Manuscript or Sample</label>
            <input
              type="url"
              value={form.submissionUrl}
              onChange={set('submissionUrl')}
              placeholder="Link to a Google Doc, Dropbox, or OneDrive file if you'd like to share a sample (optional)"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Tell Us About Your Book</label>
          <textarea
            value={form.message}
            onChange={set('message')}
            rows={4}
            placeholder="What is your book about? Where are you in the writing process? What are your goals as an author?"
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <p
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Consent & Agreement
          </p>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.consentToContact}
              onChange={(e) => setForm((current) => ({ ...current, consentToContact: e.target.checked }))}
              className="mt-0.5 accent-blue-500"
              required
            />
            <span className="text-[13px] text-white/50 leading-[1.6] group-hover:text-white/70 transition-colors">
              I consent to J Merrill Publishing contacting me regarding my submission, publishing services, and related communications. <span className="text-blue-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.consentToTerms}
              onChange={(e) => setForm((current) => ({ ...current, consentToTerms: e.target.checked }))}
              className="mt-0.5 accent-blue-500"
              required
            />
            <span className="text-[13px] text-white/50 leading-[1.6] group-hover:text-white/70 transition-colors">
              I have read and agree to the{' '}
              <a href="/terms" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Privacy Policy
              </a>
              . <span className="text-blue-500">*</span>
            </span>
          </label>
        </div>

        {errorMsg && (
          <p className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-blue-500 text-white text-[14px] font-semibold tracking-[0.04em] uppercase py-4 rounded-full hover:bg-blue-600 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(30,144,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {status === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Submitting...
            </span>
          ) : 'Submit Inquiry →'}
        </button>

        <p className="text-center text-[12px] text-white/25">
          We follow up within 1–2 business days. Your information is never shared.
        </p>
      </form>
    </div>
  )
}
