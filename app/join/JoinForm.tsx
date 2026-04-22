'use client'

import { useState } from 'react'
import Link from 'next/link'

const GENRES = ['Fiction', 'Nonfiction', 'Christian / Faith', 'Inspirational', 'Biography / Memoir', 'Self-Help', "Children's", 'Devotional', 'Poetry', 'Business', 'Other']
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

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function JoinForm() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    bookTitle: '', genre: '', goal: '', wordCount: '',
    timezone: '', publishDate: '', message: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const setTag = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email || !form.bookTitle || !form.genre || !form.goal) {
      setErrorMsg('Please fill in all required fields.')
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
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
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
          Thank you, {form.firstName}. We'll review your submission and reach out within 1–2 business days to talk about your book and your vision.
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

  const fieldClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
  const labelClass = "block text-[11px] font-medium tracking-[0.1em] uppercase text-white/40 mb-1.5"

  return (
    <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 backdrop-blur">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

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

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
            Book Title <span className="text-blue-500">*</span>
          </label>
          <input type="text" value={form.bookTitle} onChange={set('bookTitle')} required
            placeholder="Working title is fine" className={fieldClass} />
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
            Genre <span className="text-blue-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {GENRES.map(g => (
              <button key={g} type="button" onClick={() => setTag('genre', g)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                  form.genre === g
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:border-blue-500/40'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>
            Primary Goal <span className="text-blue-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {GOALS.map(g => (
              <button key={g} type="button" onClick={() => setTag('goal', g)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                  form.goal === g
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:border-blue-500/40'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Timezone</label>
          <select value={form.timezone} onChange={set('timezone')} className={fieldClass} style={{ colorScheme: 'dark' }}>
            <option value="">Select your timezone</option>
            {['EST (Eastern)', 'CST (Central)', 'MST (Mountain)', 'PST (Pacific)', 'Other'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Estimated Publishing Date</label>
          <input type="date" value={form.publishDate} onChange={set('publishDate')}
            className={fieldClass} style={{ colorScheme: 'dark' }} />
        </div>

        <div>
          <label className={labelClass} style={{ fontFamily: "'DM Mono', monospace" }}>Tell Us About Your Book</label>
          <textarea value={form.message} onChange={set('message')} rows={4}
            placeholder="What is your book about? Where are you in the writing process? What are your goals as an author?"
            className={`${fieldClass} resize-none`} />
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
