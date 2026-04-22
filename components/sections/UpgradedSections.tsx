'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { bookCatalog, imprintCatalog } from '@/lib/content'
import { imprints } from '@/lib/tokens'

// ─────────────────────────────────────────────────────────────
// CREDIBILITY STRIP
// ─────────────────────────────────────────────────────────────
export function CredibilityStrip() {
  const [stats, setStats] = useState<{
    inDevelopment: number; inDesign: number; releasedThisWeek: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/live-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ inDevelopment: 3, inDesign: 2, releasedThisWeek: 1 }))
  }, [])

  return (
    <div className="bg-[#0A0A0F] border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-12 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-8 flex-wrap">
          {[
            { n: '101+',     l: 'Titles in print globally' },
            { n: '45,000+',  l: 'Global retail outlets via Ingram' },
            { n: '450+',     l: 'CoreSource digital partners' },
            { n: 'GPO',      l: 'Registered publisher' },
            { n: 'SAM.gov',  l: 'Active entity · UEI EL4RLED5MUW5' },
          ].map(item => (
            <div key={item.n} className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white">{item.n}</span>
              <span className="text-[12px] text-white/25">·</span>
              <span className="text-[12px] text-white/35 font-light">{item.l}</span>
            </div>
          ))}
        </div>
        {stats && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-blue-400 font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>
              Now: {stats.inDevelopment} in editorial · {stats.inDesign} in design
              {stats.releasedThisWeek > 0 && ` · ${stats.releasedThisWeek} released this week`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FIX 1: PUBLISHING SYSTEM — lighter bg, better headline
// ─────────────────────────────────────────────────────────────
export function PublishingSystemSection() {
  const steps = [
    { n: '01', icon: '📝', title: 'Intake',        sub: 'Manuscript evaluation, package selection, onboarding portal' },
    { n: '02', icon: '✏️', title: 'Editorial',     sub: 'Developmental, line, copy editing, AI sensitivity review' },
    { n: '03', icon: '🎨', title: 'Design',        sub: 'Cover design, interior layout, eBook conversion, audiobook' },
    { n: '04', icon: '🌐', title: 'Distribution',  sub: 'IngramSpark, CoreSource, Lightning Source, library channels' },
    { n: '05', icon: '📣', title: 'Launch',        sub: 'ARC campaign, Amazon ads, press release, BookTok video' },
    { n: '06', icon: '📊', title: 'Intelligence',  sub: 'Royalty dashboard, Ingram iQ analytics, metadata optimization' },
  ]

  return (
    // FIX: changed from #0D0D10 → #0F1C2E (blue-dark, warmer, less cave-like)
    <section className="py-[120px] px-12 bg-[#0F1C2E] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(30,144,255,0.06) 0%, transparent 65%)' }} />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <span className="w-8 h-px bg-blue-400 block" />
            <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-400" style={{ fontFamily: "'DM Mono', monospace" }}>
              The Publishing System
            </span>
            <span className="w-8 h-px bg-blue-400 block" />
          </div>
          {/* FIX: "From idea to intelligence" → "One system. Every stage." */}
          <h2 className="text-white reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            One system.<br /><em className="not-italic italic text-blue-400">Every stage.</em>
          </h2>
          <p className="text-[16px] font-light text-white/40 mt-4 max-w-[480px] mx-auto leading-[1.75]">
            One integrated pipeline. Every stage connected. Every output feeding the next.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-white/8 rounded-2xl overflow-hidden reveal reveal-delay-1">
          {steps.map((step, i) => (
            <div key={step.n} className="bg-[#0F1C2E] p-7 group hover:bg-blue-500/10 transition-colors duration-300 relative flex flex-col">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="rgba(30,144,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className="text-[10px] text-white/20 mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>{step.n}</div>
              <div className="text-[20px] mb-3">{step.icon}</div>
              <div className="text-[15px] font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">{step.title}</div>
              <div className="text-[12px] font-light text-white/35 leading-[1.6] flex-1">{step.sub}</div>
              <div className="mt-4 w-full h-px bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          {[
            { icon: '⚡', label: 'Powered by',   value: 'Microsoft Dataverse + Azure AI' },
            { icon: '🔗', label: 'Connected to', value: 'J Merrill One Enterprise System' },
            { icon: '🤖', label: 'AI layer',     value: 'Azure AI Foundry (Phase 3 integration)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-white/8 bg-white/[0.03]">
              <span className="text-[18px]">{item.icon}</span>
              <div>
                <span className="text-[10px] text-white/25 uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Mono', monospace" }}>{item.label}</span>
                <div className="text-[13px] text-white/50 font-light">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FIX 2: FEATURED TITLES — sorted desc by year w/ imprint badges + filter
// ─────────────────────────────────────────────────────────────
export function FeaturedTitlesSection() {
  const [activeImprint, setActiveImprint] = useState<string>('all')
  const [showCount, setShowCount] = useState(24)

  const filtered = activeImprint === 'all'
    ? bookCatalog
    : bookCatalog.filter(b => b.imprint === activeImprint)

  const displayed = filtered.slice(0, showCount)

  const imprintColors: Record<string, string> = {
    'J Merrill Publishing': 'bg-blue-500/25 text-blue-100 border-blue-500/30',
    'JM Little':            'bg-amber-500/25 text-amber-100 border-amber-500/30',
    'JM Verse':             'bg-violet-500/25 text-violet-100 border-violet-500/30',
    'JM Signature':         'bg-sky-500/25 text-sky-100 border-sky-500/30',
    'JM Works':             'bg-teal-500/25 text-teal-100 border-teal-500/30',
  }

  const filters = [
    { id: 'all', label: 'All Titles', count: bookCatalog.length },
    ...imprintCatalog.map((imprint) => ({
      id: imprint.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label: imprint,
      count: bookCatalog.filter((book) => book.imprint === imprint).length,
    })),
  ]

  const imprintIdToName = Object.fromEntries(
    imprintCatalog.map((imprint) => [imprint.toLowerCase().replace(/[^a-z0-9]+/g, '-'), imprint]),
  ) as Record<string, string>

  return (
    <section className="py-[120px] px-12 bg-[#070710] overflow-hidden">
      <div className="max-w-[1280px] mx-auto">

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              {/* FIX: "Proof of Authority" → "Our Catalog" — less self-congratulatory, more inviting */}
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-400" style={{ fontFamily: "'DM Mono', monospace" }}>Our Catalog</span>
            </div>
            <h2 className="text-white reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,4vw,56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {bookCatalog.length}+ titles.<br /><em className="not-italic italic text-blue-500">Across every genre.</em>
            </h2>
          </div>
          <Link href="/books" className="text-[13px] text-white/35 border-b border-white/15 pb-px hover:text-blue-400 hover:border-blue-400 transition-all mt-4 lg:mt-0 mb-2 reveal">
            View full catalog →
          </Link>
        </div>

        {/* Imprint filter tabs */}
        <div className="flex gap-2 flex-wrap mb-8 reveal">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveImprint(f.id); setShowCount(24) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                activeImprint === f.id
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white/[0.03] border-white/10 text-white/40 hover:border-blue-500/40 hover:text-white/70'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeImprint === f.id ? 'bg-white/20' : 'bg-white/5'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Cover wall */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 reveal reveal-delay-1">
          {displayed.map((book, i) => {
            const colorClass = imprintColors[book.imprint] || 'bg-white/10 text-white/40 border-white/15'
            return (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                aria-label={`View ${book.title}`}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#0F1C2E] border border-white/6 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(30,144,255,0.2)] cursor-pointer"
              >
                {book.coverUrl ? (
                  <>
                    <div className="absolute inset-0 bg-[#08101d]" />
                    <div className="absolute inset-2.5 rounded-[14px] bg-white shadow-[0_14px_30px_rgba(0,0,0,0.26)]">
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        unoptimized={book.coverUrl.startsWith('http')}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/35 to-transparent">
                      <div className="text-[10px] font-semibold text-white/80 leading-[1.25] line-clamp-2" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                        {book.title}
                      </div>
                      <div className="mt-1 text-[9px] text-white/35 font-light">{book.authorName}</div>
                    </div>
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
                    style={{
                      background: book.imprint === 'J Merrill Publishing' ? `linear-gradient(135deg, hsl(${210 + (i * 9) % 24}, 40%, 12%) 0%, hsl(${220 + (i * 7) % 18}, 34%, 8%) 100%)` :
                                  book.imprint === 'JM Little'         ? `linear-gradient(135deg, hsl(${34 + (i * 11) % 18}, 40%, 13%) 0%, hsl(${22 + (i * 7) % 12}, 34%, 8%) 100%)` :
                                  book.imprint === 'JM Verse'          ? `linear-gradient(135deg, hsl(${250 + (i * 11) % 28}, 35%, 12%) 0%, hsl(${266 + (i * 7) % 18}, 30%, 8%) 100%)` :
                                  book.imprint === 'JM Signature'      ? `linear-gradient(135deg, hsl(${196 + (i * 11) % 22}, 35%, 12%) 0%, hsl(${208 + (i * 7) % 18}, 30%, 8%) 100%)` :
                                  book.imprint === 'JM Works'          ? `linear-gradient(135deg, hsl(${164 + (i * 13) % 24}, 30%, 10%) 0%, hsl(${176 + (i * 9) % 16}, 25%, 7%) 100%)` :
                                  `linear-gradient(135deg, hsl(${(i * 37) % 360}, 35%, 11%) 0%, hsl(${(i * 37 + 60) % 360}, 30%, 7%) 100%)`
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
                      <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '52px', fontWeight: 700, color: 'white' }}>JM</span>
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-semibold text-white/75 leading-[1.3] mb-1.5 line-clamp-3"
                        style={{ fontFamily: "'Libre Baskerville', serif" }}>
                        {book.title}
                      </div>
                      <div className="text-[9px] text-white/30 font-light">{book.authorName}</div>
                      <div className="text-[9px] text-white/20 font-light mt-0.5">{book.displayYear}</div>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/8 transition-colors duration-300" />

                {/* Hover: imprint badge + formats */}
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/60 to-transparent">
                  <span className={`inline-block text-[8px] font-semibold px-2 py-0.5 rounded-full border ${colorClass} mb-1`}>
                    {book.imprint.replace('J Merrill ', '')}
                  </span>
                  <div className="flex gap-0.5">
                    {book.formats.map((f) => (
                      <span key={f} className="text-[8px] text-white/30 bg-black/40 px-1 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <p className="text-[13px] text-white/25">
            Showing {displayed.length} of {filtered.length} titles
            {activeImprint !== 'all' && ` · ${imprintIdToName[activeImprint] || activeImprint}`}
          </p>
          {displayed.length < filtered.length && (
            <button
              onClick={() => setShowCount(c => c + 24)}
              className="text-[13px] text-blue-400 border-b border-blue-400/30 hover:border-blue-400 transition-colors"
            >
              Load more →
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FIX 3: AI ANALYZER — renamed + reframed as "Find Your Path"
// ─────────────────────────────────────────────────────────────
type AnalysisResult = {
  marketabilityScore: number
  titleStrength: string
  distributionReadiness: string
  primaryInsight: string
  recommendation: string
  packageSuggestion: 'Starter' | 'Professional' | 'Signature'
  packageReason: string
}

export function BookAnalyzerSection() {
  const [form, setForm] = useState({ title: '', genre: '', goal: '', wordCount: '' })
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const genres = ['Fiction', 'Nonfiction', 'Christian / Faith', 'Inspirational', 'Biography / Memoir', 'Self-Help', "Children's", 'Devotional', 'Poetry', 'Business', 'Other']
  const goals = [
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

  const analyze = useCallback(async () => {
    if (!form.title || !form.genre || !form.goal) { setError('Please fill in the required fields.'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setResult(await res.json())
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }, [form])

  const scoreColor = result
    ? result.marketabilityScore >= 80 ? 'text-emerald-400'
    : result.marketabilityScore >= 60 ? 'text-blue-400'
    : 'text-amber-400'
    : ''

  return (
    <section id="analyze" className="py-[120px] px-12 bg-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-20 items-start">

        {/* Left */}
        <div className="lg:sticky lg:top-28">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-500" style={{ fontFamily: "'DM Mono', monospace" }}>
              AI Publishing Intelligence
            </span>
          </div>
          {/* FIX: "Find Your Publishing Path" → "Find Your Publishing Path" */}
          <h2 className="text-charcoal mb-4 reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,4vw,56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Find your<br /><em className="not-italic italic text-blue-500">publishing path</em>
          </h2>
          {/* FIX: reframed benefit copy — clarity and routing, not "analysis" */}
          <p className="text-[16px] font-light text-gray-500 leading-[1.85] mb-3 reveal reveal-delay-2">
            Not sure where to start? Tell us about your book and your goal. In seconds, our publishing intelligence engine maps the right entry point, the right package, and the right next step — specific to your genre, your audience, and your vision.
          </p>
          <p className="text-[14px] font-light text-gray-400 leading-[1.7] mb-8 reveal reveal-delay-2">
            This is not a grammar checker or a quality score. It is a decision engine — built to replace the confusion of "where do I begin?" with a clear, confident direction.
          </p>

          <div className="flex flex-col gap-3 reveal reveal-delay-2">
            {[
              { icon: '🧭', label: 'Publishing Path',          sub: 'Right entry point for your stage and goals' },
              { icon: '📦', label: 'Package Recommendation',   sub: 'Starter / Professional / Signature — and why' },
              { icon: '🌐', label: 'Distribution Readiness',   sub: 'What your title needs to reach its audience' },
              { icon: '💡', label: 'Genre-Specific Insight',   sub: 'Advice tuned to your category, not generic advice' },
              { icon: '➡️', label: 'Your Next Step',           sub: 'One clear action to move forward today' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[18px]">{item.icon}</span>
                <div>
                  <div className="text-[13px] font-semibold text-charcoal">{item.label}</div>
                  <div className="text-[12px] text-gray-400 font-light">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-300 mt-4 font-light reveal">Free · No account required · Results in under 5 seconds</p>
        </div>

        {/* Right */}
        <div>
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 reveal reveal-delay-2">
            <h3 className="text-[17px] font-semibold text-charcoal mb-6">Tell us about your book</h3>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-[11px] font-medium tracking-[0.1em] uppercase text-gray-400 mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                  Book Title <span className="text-blue-500">*</span>
                </label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Finding My Way Back to Purpose"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-charcoal placeholder:text-gray-300 focus:outline-none focus:border-blue-400 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.1em] uppercase text-gray-400 mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Genre <span className="text-blue-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {genres.map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, genre: g }))}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${form.genre === g ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.1em] uppercase text-gray-400 mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Primary Goal <span className="text-blue-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {goals.map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, goal: g }))}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${form.goal === g ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}
            <button onClick={analyze} disabled={loading}
              className="w-full bg-blue-500 text-white text-[14px] font-semibold tracking-[0.04em] uppercase py-4 rounded-full hover:bg-blue-600 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(30,144,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Finding your path...
                </span>
              ) : 'Find My Publishing Path →'}
            </button>
          </div>

          {result && (
            <div className="mt-4 bg-[#0F1C2E] border border-blue-500/25 rounded-3xl p-8 animate-[fadeUp_0.5s_ease_both]">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[12px] text-white/30 uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Mono', monospace" }}>Your Publishing Path</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[11px] text-blue-400" style={{ fontFamily: "'DM Mono', monospace" }}>AI-generated</span>
                </div>
              </div>
              <div className="flex items-start gap-6 mb-6">
                <div className="text-center">
                  <div className={`leading-none ${scoreColor}`} style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '64px', fontWeight: 700, letterSpacing: '-0.03em' }}>
                    {result.marketabilityScore}
                  </div>
                  <div className="text-[10px] text-white/25 uppercase tracking-[0.1em] mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>Readiness Score</div>
                </div>
                <div className="flex flex-col gap-2 flex-1 pt-2">
                  {[
                    { label: 'Title Strength', value: result.titleStrength },
                    { label: 'Distribution Readiness', value: result.distributionReadiness },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/4">
                      <span className="text-[12px] text-white/40">{item.label}</span>
                      <span className="text-[12px] font-semibold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3">
                <div className="text-[11px] text-blue-400 uppercase tracking-[0.1em] mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Insight</div>
                <p className="text-[14px] text-white/70 leading-[1.6]">{result.primaryInsight}</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/6 mb-6">
                <div className="text-[11px] text-white/25 uppercase tracking-[0.1em] mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Your Next Step</div>
                <p className="text-[14px] text-white/60 leading-[1.6]">{result.recommendation}</p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.07]">
                <div className="flex-1">
                  <div className="text-[11px] text-blue-400 uppercase tracking-[0.1em] mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>Recommended Package</div>
                  <div className="text-[18px] font-bold text-white">{result.packageSuggestion}</div>
                  <div className="text-[12px] text-white/40 mt-0.5">{result.packageReason}</div>
                </div>
                <Link href="/packages" className="flex-shrink-0 bg-blue-500 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full hover:bg-blue-600 transition-colors">
                  View Package →
                </Link>
              </div>
              <Link href="/join" className="mt-4 block text-center text-[13px] text-blue-400 border-b border-blue-400/20 pb-px hover:border-blue-400 transition-colors w-fit mx-auto">
                Ready to start? Join the Family →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// SCROLL-DRIVEN AUTHOR JOURNEY (unchanged — working well)
// ─────────────────────────────────────────────────────────────
export function AuthorJourneySection() {
  const [activeStep, setActiveStep] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  const steps = [
    { n: '01', title: 'Join the Family',     body: 'Discovery call, manuscript evaluation, package selection.', detail: 'We assess your manuscript, understand your goals, and map the right package and publishing pathway.', icon: '🤝' },
    { n: '02', title: 'Editorial & Design',  body: 'Professional editing at every level. Cover and interior that make your book undeniable.', detail: 'Developmental guidance, line editing, copy editing, and proofreading — plus custom cover and interior typesetting.', icon: '✏️' },
    { n: '03', title: 'Publish & Distribute',body: 'ISBN, metadata, and global distribution through IngramSpark, CoreSource, and Lightning Source.', detail: 'Print default through IngramSpark. eBook through CoreSource to Apple Books, Kobo, Amazon, and library platforms.', icon: '🌐' },
    { n: '04', title: 'Launch & Market',     body: 'ARC campaigns, Amazon advertising, press, BookTok, and author platform.', detail: 'Pre-launch, launch-week, and post-launch strategy your title deserves.', icon: '📣' },
    { n: '05', title: 'Build Your Career',   body: 'Membership plans, royalty dashboard, community, and long-term author support.', detail: 'One book is the beginning. We support your next title, your backlist, and your long-term career.', icon: '🚀' },
  ]

  useEffect(() => {
    const observers = stepRefs.current.map((ref, i) => {
      if (!ref) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i) },
        { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
      )
      obs.observe(ref); return obs
    })
    return () => observers.forEach(obs => obs?.disconnect())
  }, [])

  return (
    <section className="py-[120px] px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-blue-500 block" />
          <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-500 reveal" style={{ fontFamily: "'DM Mono', monospace" }}>The Author Journey</span>
        </div>
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          <div className="lg:sticky lg:top-28">
            <h2 className="text-charcoal mb-8 reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,4vw,54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              What you will<br /><em className="not-italic italic text-blue-500">experience</em>
            </h2>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 transition-all duration-500" key={activeStep}>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-[22px]">{steps[activeStep].icon}</div>
                <div>
                  <div className="text-[10px] text-gray-300 uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Mono', monospace" }}>{steps[activeStep].n}</div>
                  <div className="text-[20px] font-semibold text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif" }}>{steps[activeStep].title}</div>
                </div>
              </div>
              <p className="text-[15px] text-gray-600 leading-[1.75] mb-4">{steps[activeStep].body}</p>
              <p className="text-[14px] text-gray-400 font-light leading-[1.7]">{steps[activeStep].detail}</p>
            </div>
            <div className="flex gap-2 mt-5">
              {steps.map((_, i) => (
                <button key={i} onClick={() => stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeStep ? 'w-8 bg-blue-500' : 'w-1.5 bg-gray-200'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-0">
            {steps.map((step, i) => (
              <div key={step.n} ref={el => { stepRefs.current[i] = el }}
                className={`grid grid-cols-[56px_1fr] gap-6 py-10 border-b border-gray-100 group cursor-default transition-all duration-300 ${i === 0 ? 'border-t border-gray-100' : ''} ${i === activeStep ? 'opacity-100' : 'opacity-35'}`}
                onClick={() => setActiveStep(i)}>
                <div className={`w-12 h-12 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-300 self-center ${i === activeStep ? 'bg-blue-500 border-blue-500' : 'border-gray-200 group-hover:border-blue-300'}`}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', fontWeight: 500, color: i === activeStep ? 'white' : '#8A8F9A' }}>
                  {step.n}
                </div>
                <div>
                  <div className={`text-[18px] font-semibold mb-2 transition-colors duration-300 ${i === activeStep ? 'text-blue-500' : 'text-charcoal group-hover:text-blue-400'}`} style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    {step.title}
                  </div>
                  <div className="text-[14px] font-light text-gray-400 leading-[1.7]">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FIX 4: IMPRINTS SECTION — replaces Faith section entirely
// ─────────────────────────────────────────────────────────────
export function ImprintsSection() {
  return (
    <section className="py-[120px] px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">

        <div className="grid lg:grid-cols-2 gap-16 items-end mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-500 reveal" style={{ fontFamily: "'DM Mono', monospace" }}>
                A Multi-Imprint Publishing System
              </span>
            </div>
            <h2 className="text-charcoal reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,4vw,54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Five official imprints.<br /><em className="not-italic italic text-blue-500">One flagship system.</em>
            </h2>
          </div>
          <p className="text-[16px] font-light text-gray-500 leading-[1.85] pb-2 reveal reveal-delay-2">
            J Merrill Publishing, Inc. operates a full-spectrum, multi-imprint publishing system. One infrastructure. One standard of excellence. Five official publishing identities — so every title is routed into the right home.
          </p>
        </div>

        {/* Imprint cards — 5 across, equal weight */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 reveal reveal-delay-1">
          {imprints.map((imp, i) => (
            <Link
              key={imp.id}
              href={imp.href}
              className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-100 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              {/* Color band top */}
              <div className="h-1.5 w-full" style={{ background: imp.color }} />

              {/* Dark header */}
              <div className="px-5 pt-5 pb-4" style={{ background: imp.bg }}>
                <div className="text-[10px] font-medium tracking-[0.1em] uppercase mb-2 text-white/25" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-[16px] font-bold text-white mb-1" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {imp.name}
                </div>
                <div className="text-[11px] font-light leading-[1.5] text-white/45 italic" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                  {imp.tagline}
                </div>
              </div>

              {/* Light body */}
              <div className="flex-1 bg-white px-5 py-4 border-t border-gray-100">
                <p className="text-[12px] text-gray-500 font-light leading-[1.65] mb-3">{imp.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {imp.genres.map(g => (
                    <span key={g} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold" style={{ color: imp.color }}>{imp.titleCount} titles</span>
                  <span className="text-[11px] text-gray-300 group-hover:text-blue-500 transition-colors">Explore →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Note on existing catalog */}
        <div className="mt-8 flex items-start gap-3 px-5 py-4 bg-gray-50 rounded-xl border border-gray-100 reveal">
          <span className="text-[16px] mt-0.5">ℹ️</span>
          <p className="text-[13px] font-light text-gray-400 leading-[1.7]">
            <span className="font-semibold text-gray-600">Distribution imprint:</span> All titles are distributed under J Merrill Publishing, Inc. — the official publisher of record at IngramSpark, CoreSource, and Lightning Source. Imprint names above are the brand identity layer, not a change to distribution metadata.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// JM1 SYSTEM SECTION (unchanged)
// ─────────────────────────────────────────────────────────────
export function JM1SystemSection() {
  return (
    <section className="py-[120px] px-12 bg-[#070710] relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,144,255,0.06) 0%, transparent 65%)' }} />
      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-[10px] text-blue-400 tracking-[0.1em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Built on the JM1 System</span>
          </div>
          <h2 className="text-white reveal reveal-delay-1" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,4vw,56px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            The infrastructure<br /><em className="not-italic italic text-blue-500">that runs it all</em>
          </h2>
          <p className="text-[16px] font-light text-white/40 mt-4 max-w-[520px] mx-auto leading-[1.75]">
            J Merrill Publishing is Division 01 of the J Merrill One enterprise platform — sharing one data layer, one AI system, and one governance model across four divisions.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12 reveal reveal-delay-1">
          {[
            { layer: 'DV', title: 'Unified Data Layer',     body: 'Microsoft Dataverse as the single source of truth. One author record. One relationship model. Every title, transaction, and touchpoint tracked enterprise-wide.', items: ['One contact across all divisions', 'Shared relationship intelligence', 'Lifetime value visible to all divisions'] },
            { layer: 'AI', title: 'AI Orchestration',       body: 'Governed AI agents supporting Publishing, Financial, Marketing, and Executive decisions. Canon-aligned. Azure AI Foundry integration in Phase 3.', items: ['Publishing AI analysis agent', 'Marketing intelligence layer', 'Executive decision support'] },
            { layer: 'PA', title: 'Cross-Division Execution', body: 'Power Automate routing detects cross-brand opportunities in real time. Authors publishing with JMP are natural Financial candidates — the system routes them automatically.', items: ['Publishing → Financial routing', 'Productions amplifies all divisions', 'Real-time opportunity detection'] },
          ].map(card => (
            <div key={card.layer} className="bg-white/[0.03] border border-white/6 rounded-2xl p-8 hover:border-blue-500/25 transition-all duration-300">
              <div className="w-10 h-10 bg-blue-500/15 border border-blue-500/30 rounded-xl flex items-center justify-center mb-5">
                <span className="text-[13px] font-bold text-blue-400" style={{ fontFamily: "'DM Mono', monospace" }}>{card.layer}</span>
              </div>
              <h3 className="text-[17px] font-semibold text-white mb-3">{card.title}</h3>
              <p className="text-[13px] font-light text-white/40 leading-[1.7] mb-4">{card.body}</p>
              <ul className="flex flex-col gap-2">
                {card.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-[12px] text-white/35">
                    <span className="text-blue-500 text-[11px]">→</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 reveal reveal-delay-2">
          {[
            { num: '01', name: 'Publishing',  domain: 'jmerrill.pub',             active: true,  href: 'https://www.jmerrill.pub' },
            { num: '02', name: 'Financial',   domain: 'jmerrill.financial',       active: false, href: 'https://www.jmerrill.financial' },
            { num: '03', name: 'Foundation',  domain: 'jmerrill.foundation',      active: false, href: 'https://www.jmerrill.foundation' },
            { num: '04', name: 'Productions', domain: 'productions.jmerrill.one', active: false, href: 'https://productions.jmerrill.one' },
          ].map(div => (
            <a key={div.num} href={div.href} className={`p-5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${div.active ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/6 hover:border-white/12'}`}>
              <div className="text-[10px] text-white/20 mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>{div.num}</div>
              <div className="text-[15px] font-semibold text-white mb-1">{div.name}</div>
              <div className="text-[11px] text-white/25" style={{ fontFamily: "'DM Mono', monospace" }}>{div.domain}</div>
              {div.active && <div className="mt-2 inline-block text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-mono tracking-wide">You are here</div>}
            </a>
          ))}
        </div>

        <div className="text-center mt-8 reveal">
          <a href="https://www.jmerrill.one" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] text-white/30 border border-white/8 rounded-full px-6 py-3 hover:border-blue-500/40 hover:text-blue-400 transition-all duration-200">
            Explore J Merrill One ↗
          </a>
        </div>
      </div>
    </section>
  )
}

// Pull quote
export function PullQuote({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <div className="bg-blue-500 py-16 px-12 overflow-hidden relative">
      <div className="max-w-[900px] mx-auto text-center relative z-10">
        <div className="text-[80px] leading-none text-white/20 mb-[-20px]" style={{ fontFamily: "'Libre Baskerville', serif" }}>"</div>
        <blockquote className="text-white reveal" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(22px,3vw,36px)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.45, letterSpacing: '-0.01em' }}>
          {quote}
        </blockquote>
        <div className="mt-6 flex items-center justify-center gap-3 reveal reveal-delay-1">
          <span className="w-8 h-px bg-white/40 block" />
          <span className="text-[12px] text-white/60 uppercase tracking-[0.1em]" style={{ fontFamily: "'DM Mono', monospace" }}>{attribution}</span>
        </div>
      </div>
    </div>
  )
}
