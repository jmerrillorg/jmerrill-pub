'use client'

import Link from 'next/link'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'

const WORK_TYPES = [
  'Full-length Book',
  'Novella',
  "Children's Picture Book",
  'Poetry Collection',
  'Devotional',
  'Workbook / Journal',
  'Short Story Collection',
  'Multi-volume Series',
  'Other',
]

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

const MANUSCRIPT_STATUS = [
  'Idea / Concept Only',
  'Outline Complete',
  'First Draft In Progress',
  'First Draft Complete',
  'Partially Edited',
  'Fully Written — Needs Editing',
  'Previously Published — Seeking Reprint or New Edition',
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
  'Build a publishing catalog over time',
  'Other',
]

const PUBLISH_TIMELINES = [
  'Within 3 Months',
  'Within 6 Months',
  'Within 1 Year',
  'Within 2 Years',
  'No Set Timeline',
]

const PARTNER_TIERS = [
  'JM Prestige Standard — $750/month or $8,000/year',
  'JM Prestige Premium — $1,250/month or $13,500/year',
  'Not sure yet — I want guidance',
]

const AUDIENCE_SIZES = [
  'Under 1,000',
  '1,000–5,000',
  '5,000–10,000',
  '10,000–50,000',
  '50,000+',
  'I am building my platform',
]

const TIMEZONES = [
  'EST (Eastern)',
  'CST (Central)',
  'MST (Mountain)',
  'PST (Pacific)',
  'Other',
]

const REFERRAL_SOURCES = [
  'Google Search',
  'Social Media',
  'Referred by Another Author',
  'Attended a JMP Event',
  'J Merrill Publishing Website',
  'Word of Mouth',
  'Other',
]

type Status = 'idle' | 'submitting' | 'success' | 'error'

type PartnerApplyFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthday: string
  city: string
  stateProvince: string
  country: string
  timezone: string
  authorName: string
  profession: string
  ministry: string
  website: string
  socialPrimary: string
  returningAuthor: boolean
  priorTitles: string
  hasPublishedElsewhere: boolean
  priorPublications: string
  backlist: string
  bookTitle: string
  workType: string
  genre: string
  manuscriptStatus: string
  wordCount: string
  seriesPlanned: boolean
  seriesDetails: string
  primaryAudience: string
  audienceSize: string
  emailListSize: string
  comparableBooks: string
  goals: string
  publishTimeline: string
  partnerTier: string
  whyPartner: string
  whatYouBring: string
  needsBranding: boolean
  needsMarketing: boolean
  needsAudiobook: boolean
  needsChildrensIllustration: boolean
  allowAiEditing: boolean
  budgetConfirmed: boolean
  readyToStart: string
  referredBy: string
  additionalNotes: string
  consentToContact: boolean
  consentToTerms: boolean
}

const INITIAL_FORM: PartnerApplyFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthday: '',
  city: '',
  stateProvince: '',
  country: 'United States',
  timezone: '',
  authorName: '',
  profession: '',
  ministry: '',
  website: '',
  socialPrimary: '',
  returningAuthor: false,
  priorTitles: '',
  hasPublishedElsewhere: false,
  priorPublications: '',
  backlist: '',
  bookTitle: '',
  workType: '',
  genre: '',
  manuscriptStatus: '',
  wordCount: '',
  seriesPlanned: false,
  seriesDetails: '',
  primaryAudience: '',
  audienceSize: '',
  emailListSize: '',
  comparableBooks: '',
  goals: '',
  publishTimeline: '',
  partnerTier: '',
  whyPartner: '',
  whatYouBring: '',
  needsBranding: false,
  needsMarketing: false,
  needsAudiobook: false,
  needsChildrensIllustration: false,
  allowAiEditing: false,
  budgetConfirmed: false,
  readyToStart: '',
  referredBy: '',
  additionalNotes: '',
  consentToContact: false,
  consentToTerms: false,
}

function splitMultiValue(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function PartnerApplyForm() {
  const [form, setForm] = useState<PartnerApplyFormState>(INITIAL_FORM)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set =
    (field: keyof PartnerApplyFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }))

  const setTag = (field: keyof PartnerApplyFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const toggleBooleanField = (
    field:
      | 'returningAuthor'
      | 'hasPublishedElsewhere'
      | 'seriesPlanned'
      | 'needsBranding'
      | 'needsMarketing'
      | 'needsAudiobook'
      | 'needsChildrensIllustration'
      | 'allowAiEditing',
  ) =>
    setForm((current) => {
      const next = !current[field]

      if (field === 'returningAuthor' && !next) {
        return { ...current, returningAuthor: next, priorTitles: '' }
      }

      if (field === 'hasPublishedElsewhere' && !next) {
        return { ...current, hasPublishedElsewhere: next, priorPublications: '' }
      }

      if (field === 'seriesPlanned' && !next) {
        return { ...current, seriesPlanned: next, seriesDetails: '' }
      }

      return { ...current, [field]: next }
    })

  const toggleGoals = (value: string) =>
    setForm((current) => {
      const existing = splitMultiValue(current.goals)
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value]

      return {
        ...current,
        goals: next.join(', '),
      }
    })

  const hasGoal = (value: string) => splitMultiValue(form.goals).includes(value)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.phone ||
      !form.bookTitle ||
      !form.genre ||
      !form.manuscriptStatus ||
      !form.goals ||
      !form.whyPartner ||
      !form.whatYouBring ||
      !form.partnerTier ||
      !form.budgetConfirmed ||
      !form.consentToContact ||
      !form.consentToTerms ||
      (form.returningAuthor && !form.priorTitles) ||
      (form.hasPublishedElsewhere && !form.priorPublications) ||
      (form.seriesPlanned && !form.seriesDetails)
    ) {
      setErrorMsg('Please complete all required fields before submitting your application.')
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
    } catch (error: unknown) {
      setStatus('error')
      setErrorMsg(error instanceof Error ? error.message : 'Unable to submit the application.')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white/[0.04] border border-blue-500/25 rounded-3xl p-12 text-center">
        <div className="text-[48px] mb-4">✅</div>
        <h2
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700 }}
          className="text-white mb-3"
        >
          JM Prestige application received.
        </h2>
        <p className="text-[15px] text-white/45 leading-[1.7] mb-6">
          Thank you, {form.firstName}. We&apos;ve received your JM Prestige application and will review it carefully. You&apos;ll hear from us within 3–5 business days.
        </p>
        <Link
          href="/publishing-partner"
          className="inline-flex items-center gap-2 text-[13px] text-blue-400 border-b border-blue-400/30 hover:border-blue-400 transition-colors"
        >
          Back to JM Prestige →
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="About You" noBorder>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldGroup label="First Name" required labelClass={labelClass}>
            <input type="text" value={form.firstName} onChange={set('firstName')} required className={fieldClass} />
          </FieldGroup>
          <FieldGroup label="Last Name" required labelClass={labelClass}>
            <input type="text" value={form.lastName} onChange={set('lastName')} required className={fieldClass} />
          </FieldGroup>
        </div>

        <FieldGroup label="Email Address" required labelClass={labelClass}>
          <input type="email" value={form.email} onChange={set('email')} required className={fieldClass} />
        </FieldGroup>

        <FieldGroup label="Phone Number" required labelClass={labelClass}>
          <input type="tel" value={form.phone} onChange={set('phone')} required className={fieldClass} />
        </FieldGroup>

        <FieldGroup label="Date of Birth" labelClass={labelClass}>
          <input type="date" value={form.birthday} onChange={set('birthday')} className={fieldClass} style={{ colorScheme: 'dark' }} />
        </FieldGroup>

        <FieldGroup label="Pen Name / Author Name" labelClass={labelClass}>
          <input
            type="text"
            value={form.authorName}
            onChange={set('authorName')}
            placeholder="If you publish under a different name"
            className={fieldClass}
          />
        </FieldGroup>

        <div className="grid sm:grid-cols-2 gap-4">
          <FieldGroup label="City" labelClass={labelClass}>
            <input type="text" value={form.city} onChange={set('city')} className={fieldClass} />
          </FieldGroup>
          <FieldGroup label="State / Province" labelClass={labelClass}>
            <input type="text" value={form.stateProvince} onChange={set('stateProvince')} className={fieldClass} />
          </FieldGroup>
        </div>

        <FieldGroup label="Country" labelClass={labelClass}>
          <input type="text" value={form.country} onChange={set('country')} className={fieldClass} />
        </FieldGroup>

        <FieldGroup label="Timezone" labelClass={labelClass}>
          <select value={form.timezone} onChange={set('timezone')} className={fieldClass} style={{ colorScheme: 'dark' }}>
            <option value="">Select your timezone</option>
            {TIMEZONES.map((timezone) => (
              <option key={timezone} value={timezone}>{timezone}</option>
            ))}
          </select>
        </FieldGroup>
      </Section>

      <Section title="Your Professional Background">
        <FieldGroup label="Profession / Day Job" labelClass={labelClass}>
          <input
            type="text"
            value={form.profession}
            onChange={set('profession')}
            placeholder="Your profession or professional background"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="Ministry or Faith Community Role" labelClass={labelClass}>
          <input
            type="text"
            value={form.ministry}
            onChange={set('ministry')}
            placeholder="Pastor, ministry leader, deacon, etc. (if applicable)"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="Author Website" labelClass={labelClass}>
          <input
            type="url"
            value={form.website}
            onChange={set('website')}
            placeholder="https://yourwebsite.com"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="Primary Social Platform & Handle" labelClass={labelClass}>
          <input
            type="text"
            value={form.socialPrimary}
            onChange={set('socialPrimary')}
            placeholder="e.g. Instagram @yourhandle, Facebook, LinkedIn"
            className={fieldClass}
          />
        </FieldGroup>
      </Section>

      <Section title="Publishing History">
        <ToggleBinary
          label="Have you published with J Merrill Publishing before?"
          value={form.returningAuthor}
          onSelect={(value) =>
            setForm((current) => ({
              ...current,
              returningAuthor: value,
              priorTitles: value ? current.priorTitles : '',
            }))
          }
          labelClass={labelClass}
          togglePillClass={togglePillClass}
          pillSelectedClass={pillSelectedClass}
          pillUnselectedClass={pillUnselectedClass}
        />

        {form.returningAuthor ? (
          <div className="mt-4">
            <FieldGroup label="Which title(s) did you publish with us?" required labelClass={labelClass}>
              <input
                type="text"
                value={form.priorTitles}
                onChange={set('priorTitles')}
                placeholder="e.g. Damaged, The Fight for the Promiseland"
                className={fieldClass}
              />
            </FieldGroup>
            <p className="text-[11px] text-white/25 mt-1.5">
              This helps us pull up your author record and fast-track your review.
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <ToggleBinary
            label="Have you published elsewhere?"
            value={form.hasPublishedElsewhere}
            onSelect={(value) =>
              setForm((current) => ({
                ...current,
                hasPublishedElsewhere: value,
                priorPublications: value ? current.priorPublications : '',
              }))
            }
            labelClass={labelClass}
            togglePillClass={togglePillClass}
            pillSelectedClass={pillSelectedClass}
            pillUnselectedClass={pillUnselectedClass}
          />
        </div>

        {form.hasPublishedElsewhere ? (
          <div className="mt-4">
            <FieldGroup label="List your prior publications (title, publisher, year)" required labelClass={labelClass}>
              <textarea
                value={form.priorPublications}
                onChange={set('priorPublications')}
                rows={4}
                className={`${fieldClass} resize-none`}
              />
            </FieldGroup>
          </div>
        ) : null}

        <FieldGroup label="Your Current Catalog / Backlist" labelClass={labelClass}>
          <textarea
            value={form.backlist}
            onChange={set('backlist')}
            rows={4}
            placeholder="List all titles you currently have in print or distribution, even self-published."
            className={`${fieldClass} resize-none`}
          />
        </FieldGroup>
      </Section>

      <Section title="Your Current Project">
        <FieldGroup label="Book Title" required labelClass={labelClass}>
          <input
            type="text"
            value={form.bookTitle}
            onChange={set('bookTitle')}
            required
            placeholder="Working title is fine"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="Work Type" labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            {WORK_TYPES.map((workType) => (
              <button
                key={workType}
                type="button"
                onClick={() => setTag('workType', workType)}
                className={`${pillClass} ${form.workType === workType ? pillSelectedClass : pillUnselectedClass}`}
              >
                {workType}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Genre" required labelClass={labelClass}>
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
        </FieldGroup>

        <FieldGroup label="Manuscript Status" required labelClass={labelClass}>
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
        </FieldGroup>

        <FieldGroup label="Estimated Word Count" labelClass={labelClass}>
          <input
            type="number"
            value={form.wordCount}
            onChange={set('wordCount')}
            placeholder="e.g. 60000"
            className={fieldClass}
          />
        </FieldGroup>

        <ToggleBinary
          label="Is this the start of a series?"
          value={form.seriesPlanned}
          onSelect={(value) =>
            setForm((current) => ({
              ...current,
              seriesPlanned: value,
              seriesDetails: value ? current.seriesDetails : '',
            }))
          }
          labelClass={labelClass}
          togglePillClass={togglePillClass}
          pillSelectedClass={pillSelectedClass}
          pillUnselectedClass={pillUnselectedClass}
        />

        {form.seriesPlanned ? (
          <div className="mt-4">
            <FieldGroup label="Tell us about the series" required labelClass={labelClass}>
              <input
                type="text"
                value={form.seriesDetails}
                onChange={set('seriesDetails')}
                className={fieldClass}
              />
            </FieldGroup>
          </div>
        ) : null}
      </Section>

      <Section title="Your Audience & Platform">
        <FieldGroup label="Primary Target Audience" labelClass={labelClass}>
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
        </FieldGroup>

        <FieldGroup label="Estimated Audience Size (Across All Platforms)" labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            {AUDIENCE_SIZES.map((audienceSize) => (
              <button
                key={audienceSize}
                type="button"
                onClick={() => setTag('audienceSize', audienceSize)}
                className={`${pillClass} ${form.audienceSize === audienceSize ? pillSelectedClass : pillUnselectedClass}`}
              >
                {audienceSize}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Email List Size" labelClass={labelClass}>
          <input
            type="text"
            value={form.emailListSize}
            onChange={set('emailListSize')}
            placeholder="e.g. 2,500 subscribers (leave blank if none)"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="Comparable Books" labelClass={labelClass}>
          <textarea
            value={form.comparableBooks}
            onChange={set('comparableBooks')}
            rows={4}
            placeholder="List 2–3 books similar to yours in style, tone, or audience."
            className={`${fieldClass} resize-none`}
          />
        </FieldGroup>
      </Section>

      <Section title="Your Publishing Goals">
        <FieldGroup label="Primary Goals" required labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoals(goal)}
                className={`${pillClass} ${hasGoal(goal) ? pillSelectedClass : pillUnselectedClass}`}
              >
                {goal}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Desired Publishing Timeline" labelClass={labelClass}>
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
        </FieldGroup>

        <FieldGroup label="Partner Tier Preference" required labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            {PARTNER_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTag('partnerTier', tier)}
                className={`${pillClass} ${form.partnerTier === tier ? pillSelectedClass : pillUnselectedClass}`}
              >
                {tier}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/30 mt-2">
            Both tiers are reviewed. Tier preference does not affect your application.
          </p>
        </FieldGroup>
      </Section>

      <Section title="Your Application">
        <FieldGroup label="Why do you want to publish under JM Prestige?" required labelClass={labelClass}>
          <textarea
            value={form.whyPartner}
            onChange={set('whyPartner')}
            required
            rows={6}
            placeholder="Tell us why JM Prestige is the right fit for your publishing goals. What are you hoping to accomplish that a standard publishing package won't achieve?"
            className={`${fieldClass} resize-none min-h-[170px]`}
          />
        </FieldGroup>

        <FieldGroup label="What do you bring to this partnership?" required labelClass={labelClass}>
          <textarea
            value={form.whatYouBring}
            onChange={set('whatYouBring')}
            required
            rows={6}
            placeholder="Tell us about your platform, your audience, your commitment, and what makes you an author J Merrill Publishing should invest in at the Partner level."
            className={`${fieldClass} resize-none min-h-[170px]`}
          />
        </FieldGroup>
      </Section>

      <Section title="Services & Support">
        <FieldGroup label="I'm interested in:" labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              type="button"
              onClick={() => toggleBooleanField('needsBranding')}
              className={`${pillClass} ${form.needsBranding ? pillSelectedClass : pillUnselectedClass}`}
            >
              Author branding support
            </button>
            <button
              type="button"
              onClick={() => toggleBooleanField('needsMarketing')}
              className={`${pillClass} ${form.needsMarketing ? pillSelectedClass : pillUnselectedClass}`}
            >
              Marketing & promotion support
            </button>
            <button
              type="button"
              onClick={() => toggleBooleanField('needsAudiobook')}
              className={`${pillClass} ${form.needsAudiobook ? pillSelectedClass : pillUnselectedClass}`}
            >
              Audiobook production
            </button>
            <button
              type="button"
              onClick={() => toggleBooleanField('needsChildrensIllustration')}
              className={`${pillClass} ${form.needsChildrensIllustration ? pillSelectedClass : pillUnselectedClass}`}
            >
              Children&apos;s book illustration
            </button>
            <button
              type="button"
              onClick={() => toggleBooleanField('allowAiEditing')}
              className={`${pillClass} ${form.allowAiEditing ? pillSelectedClass : pillUnselectedClass}`}
            >
              AI-assisted editing
            </button>
          </div>
        </FieldGroup>
      </Section>

      <Section title="Readiness & Investment">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.budgetConfirmed}
            onChange={(event) => setForm((current) => ({ ...current, budgetConfirmed: event.target.checked }))}
            className="mt-0.5 accent-blue-500"
            required
          />
          <span className="text-[13px] text-white/50 leading-[1.6] group-hover:text-white/70 transition-colors">
            I understand JM Prestige requires a 1-year minimum commitment starting at $750/month ($8,000 when paid annually) and I am applying with that awareness. <span className="text-blue-500">*</span>
          </span>
        </label>

        <FieldGroup label="How soon are you ready to begin?" labelClass={labelClass}>
          <input
            type="text"
            value={form.readyToStart}
            onChange={set('readyToStart')}
            placeholder="e.g. Immediately, After Q3, January 2027"
            className={fieldClass}
          />
        </FieldGroup>

        <FieldGroup label="How did you hear about JM Prestige?" required labelClass={labelClass}>
          <div className="flex flex-wrap gap-2 mt-1">
            {REFERRAL_SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setTag('referredBy', source)}
                className={`${pillClass} ${form.referredBy === source ? pillSelectedClass : pillUnselectedClass}`}
              >
                {source}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="Anything else we should know?" labelClass={labelClass}>
          <textarea
            value={form.additionalNotes}
            onChange={set('additionalNotes')}
            rows={4}
            placeholder="Additional context, questions, or anything that would help us understand your application."
            className={`${fieldClass} resize-none`}
          />
        </FieldGroup>
      </Section>

      <div className="flex flex-col gap-3 pt-2 border-t border-white/8">
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
            onChange={(event) => setForm((current) => ({ ...current, consentToContact: event.target.checked }))}
            className="mt-0.5 accent-blue-500"
            required
          />
          <span className="text-[13px] text-white/50 leading-[1.6] group-hover:text-white/70 transition-colors">
            I consent to J Merrill Publishing contacting me regarding my JM Prestige application and related publishing services. <span className="text-blue-500">*</span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.consentToTerms}
            onChange={(event) => setForm((current) => ({ ...current, consentToTerms: event.target.checked }))}
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

      {errorMsg ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {errorMsg}
        </p>
      ) : null}

      <div className="pt-2">
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
          ) : 'Submit Application →'}
        </button>
        <p className="mt-4 text-center text-[12px] text-white/20">
          Applications reviewed within 3–5 business days. This is not a commitment — it is the beginning of a conversation.
        </p>
      </div>
    </form>
  )
}

function Section({
  title,
  noBorder = false,
  children,
}: {
  title: string
  noBorder?: boolean
  children: ReactNode
}) {
  return (
    <div className={noBorder ? '' : 'border-t border-white/8 pt-6'}>
      <p
        className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-400/70 mb-4"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {title}
      </p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function FieldGroup({
  label,
  required = false,
  labelClass,
  children,
}: {
  label: string
  required?: boolean
  labelClass: string
  children: ReactNode
}) {
  return (
    <div>
      <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
        {label}
        {required ? <span className="text-blue-500"> *</span> : null}
      </label>
      {children}
    </div>
  )
}

function ToggleBinary({
  label,
  value,
  onSelect,
  labelClass,
  togglePillClass,
  pillSelectedClass,
  pillUnselectedClass,
}: {
  label: string
  value: boolean
  onSelect: (value: boolean) => void
  labelClass: string
  togglePillClass: string
  pillSelectedClass: string
  pillUnselectedClass: string
}) {
  return (
    <div>
      <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
        {label}
      </label>
      <div className="flex gap-3 mt-1">
        {['No', 'Yes'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt === 'Yes')}
            className={`${togglePillClass} ${
              (opt === 'Yes' ? value : !value) ? pillSelectedClass : pillUnselectedClass
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
