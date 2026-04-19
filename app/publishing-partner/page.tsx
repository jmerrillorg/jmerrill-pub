import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Publishing Partner Program — J Merrill Publishing, Inc.',
  description: 'The J Merrill Publishing Partner Program is a structured, high-touch publishing pathway for authors building a body of work — not just a single title. Application-based. Priority access.',
}

const tiers = [
  {
    name:     'Partner',
    tagline:  'For the author with momentum.',
    titles:   'Up to 2 titles per year',
    price:    '$9,000',
    period:   'annually',
    alt:      '$750/mo on retainer',
    features: [
      'Priority editorial queue — no waitlist',
      'Dedicated publishing consultant',
      'Strategic publishing roadmap session',
      '2 titles per year (manuscript-ready)',
      'Advanced metadata + distribution setup',
      'Launch strategy session per title',
      'Imprint assignment + catalog positioning',
      'Royalty reporting dashboard included',
    ],
    ideal: 'Coaches, speakers, and ministry leaders with 2 titles ready or in development.',
    cta:   'Apply for Partnership',
  },
  {
    name:     'Signature Author',
    tagline:  'For the author building a legacy catalog.',
    titles:   'Up to 3 titles per year',
    price:    '$15,000',
    period:   'annually',
    alt:      '$1,250/mo on retainer',
    featured: true,
    features: [
      'Everything in Partner tier',
      '3 titles per year (manuscript-ready)',
      'Dedicated editorial lane — guaranteed timelines',
      'Full marketing program per title',
      'Series strategy + imprint development',
      'Author brand build-out included',
      'Quarterly strategic planning sessions',
      'First access to new JMP services and AI tools',
    ],
    ideal: 'Authors actively building a series, body of work, or ministry content pipeline.',
    cta:   'Apply for Signature',
  },
]

const qualifications = [
  { icon: '✓', label: 'Coaches and speakers with a content pipeline' },
  { icon: '✓', label: 'Ministry leaders publishing teaching or devotional series' },
  { icon: '✓', label: 'Authors with a clear multi-title vision and timeline' },
  { icon: '✓', label: 'Authors who have already published at least one title' },
  { icon: '✓', label: 'Authors with manuscript-ready or near-ready content' },
]

const disqualifications = [
  { icon: '✗', label: 'First-time authors still validating their concept' },
  { icon: '✗', label: '"I might write 3 books someday" energy' },
  { icon: '✗', label: 'Authors needing heavy hand-holding through the writing process' },
  { icon: '✗', label: 'Projects without a clear completion timeline' },
]

const guardrails = [
  { n: '01', title: 'Manuscript Readiness Required', body: 'Every title must pass our intake review before entering production. No slot is reserved for an unwritten manuscript.' },
  { n: '02', title: 'Milestone Enforcement',         body: 'Each title moves through defined milestones. Missing a milestone triggers a timeline review — not an automatic rollover.' },
  { n: '03', title: 'No Unused Slot Abuse',          body: 'Unused annual slots expire or convert to service credits. There is no infinite carryover.' },
  { n: '04', title: 'Separate Editorial Bandwidth',  body: 'Partner clients receive a dedicated editorial lane — priority queue access, not unlimited revisions.' },
]

export default function PublishingPartnerPage() {
  return (
    <div className="pt-[76px]">

      {/* Hero */}
      <div className="relative bg-[#0F1C2E] px-12 py-24 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 20% 50%, rgba(30,144,255,0.12) 0%, transparent 60%)' }} />
        <div
          className="absolute -bottom-8 right-0 pointer-events-none select-none"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '200px', fontWeight: 700, color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.025)', whiteSpace: 'nowrap', letterSpacing: '-0.05em' }}
        >
          Partner
        </div>

        <div className="max-w-[1280px] mx-auto relative z-10">
          {/* Application-only badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-2 mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-400"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Application-Based · Limited Availability
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h1 className="text-white mb-5"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                The Publishing<br />
                <em className="not-italic italic text-blue-500">Partner Program</em>
              </h1>
              <p className="text-[18px] font-light text-white/45 leading-[1.75] max-w-[520px]">
                For authors building a body of work — not just a single title. A structured, high-touch publishing pathway with priority access, dedicated support, and a roadmap built around your vision.
              </p>
            </div>

            {/* Positioning statement */}
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8">
              <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-blue-400 mb-4"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                What This Is
              </div>
              <blockquote className="text-white/70 text-[16px] font-light leading-[1.8]"
                style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
                "Our Publishing Partner Program is designed for authors building a body of work — not just a single title. This is a structured, high-touch pathway for those committed to consistent publishing and long-term impact."
              </blockquote>
              <div className="mt-5 pt-5 border-t border-white/8 flex items-center gap-3">
                <div className="w-8 h-px bg-blue-500" />
                <span className="text-[12px] text-white/30 uppercase tracking-[0.08em]"
                  style={{ fontFamily: "'DM Mono', monospace" }}>
                  Jackie Smith, Jr. · Founder & CEO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Not a subscription — the repositioning */}
      <div className="bg-white px-12 py-16 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="p-8 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-gray-400 mb-4"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              What it is NOT
            </div>
            <div className="text-[20px] font-light text-gray-400 line-through leading-[1.5]"
              style={{ fontFamily: "'Libre Baskerville', serif" }}>
              "Buy multiple books<br />and save money"
            </div>
          </div>
          <div className="p-8 rounded-2xl border border-blue-200 bg-blue-50">
            <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-blue-600 mb-4"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              What it IS
            </div>
            <div className="text-[20px] font-semibold text-charcoal leading-[1.5]"
              style={{ fontFamily: "'Libre Baskerville', serif" }}>
              "Enter a structured publishing system with priority access and a roadmap built around your catalog."
            </div>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="bg-[#0D0D10] px-12 py-20 border-b border-white/5">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center gap-3 justify-center mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-400"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Program Tiers
              </span>
              <span className="w-8 h-px bg-blue-500 block" />
            </div>
            <h2 className="text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Two pathways.<br />
              <em className="not-italic italic text-blue-500">One standard of excellence.</em>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 max-w-[900px] mx-auto">
            {tiers.map(tier => (
              <div key={tier.name}
                className={`relative flex flex-col rounded-3xl overflow-hidden border ${
                  tier.featured
                    ? 'border-blue-500/40 bg-blue-500/[0.07]'
                    : 'border-white/8 bg-white/[0.03]'
                }`}>
                {tier.featured && (
                  <div className="bg-blue-500 text-white text-[10px] font-bold tracking-[0.12em] uppercase text-center py-2.5">
                    Signature Tier — Most Comprehensive
                  </div>
                )}
                <div className="p-10 flex flex-col flex-1">
                  <div className="text-[10px] text-white/25 uppercase tracking-[0.12em] mb-3"
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    {tier.titles}
                  </div>
                  <div className="text-white mb-1"
                    style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700 }}>
                    {tier.name}
                  </div>
                  <div className="text-white/40 text-[14px] font-light italic mb-6"
                    style={{ fontFamily: "'Libre Baskerville', serif" }}>
                    {tier.tagline}
                  </div>

                  <div className="mb-1">
                    <span className="text-white font-bold"
                      style={{ fontSize: '48px', letterSpacing: '-0.03em', fontFamily: "'Libre Baskerville', serif" }}>
                      {tier.price}
                    </span>
                    <span className="text-white/30 text-[13px] ml-1">/{tier.period}</span>
                  </div>
                  <div className="text-[12px] text-white/25 mb-8"
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    or {tier.alt}
                  </div>

                  <div className="w-full h-px bg-white/8 mb-7" />

                  <ul className="flex flex-col gap-3 flex-1 mb-8">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px] font-light text-white/55 leading-[1.5]">
                        <span className="text-blue-400 flex-shrink-0 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="px-4 py-3 rounded-xl bg-white/4 border border-white/6 mb-6">
                    <div className="text-[10px] text-white/20 uppercase tracking-[0.1em] mb-1"
                      style={{ fontFamily: "'DM Mono', monospace" }}>Ideal for</div>
                    <div className="text-[13px] text-white/45 font-light leading-[1.6]">{tier.ideal}</div>
                  </div>

                  <Link href="/publishing-partner/apply"
                    className={`block text-center py-4 rounded-full text-[13px] font-semibold tracking-[0.05em] uppercase transition-all duration-200 ${
                      tier.featured
                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_4px_20px_rgba(30,144,255,0.4)]'
                        : 'border-[1.5px] border-white/15 text-white/60 hover:border-blue-500 hover:text-blue-400'
                    }`}>
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[13px] text-white/20 mt-8">
            Pricing above reflects annual commitment. Monthly retainer pricing available for qualified applicants.{' '}
            All tiers are per-title services — books beyond tier limit priced individually at standard package rates.
          </p>
        </div>
      </div>

      {/* Who qualifies */}
      <div className="bg-white px-12 py-20">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-16">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-500"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Who This Is For
              </span>
            </div>
            <h2 className="text-charcoal mb-8"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              We accept authors<br />
              <em className="not-italic italic text-blue-500">with a pipeline.</em>
            </h2>
            <div className="flex flex-col gap-3">
              {qualifications.map(q => (
                <div key={q.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-blue-500 font-bold text-[16px] flex-shrink-0">{q.icon}</span>
                  <span className="text-[14px] text-charcoal font-light">{q.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-gray-300 block" />
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-gray-400"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Not the Right Fit
              </span>
            </div>
            <h2 className="text-charcoal mb-8"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Some authors are better<br />
              <em className="not-italic italic text-gray-400">served elsewhere.</em>
            </h2>
            <div className="flex flex-col gap-3">
              {disqualifications.map(q => (
                <div key={q.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-300 font-bold text-[16px] flex-shrink-0">{q.icon}</span>
                  <span className="text-[14px] text-gray-500 font-light">{q.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-[13px] text-gray-500 font-light leading-[1.7]">
                Not ready for the Partner Program?{' '}
                <Link href="/packages" className="text-blue-500 border-b border-blue-200 hover:border-blue-500 transition-colors">
                  Start with a standard publishing package →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational guardrails */}
      <div className="bg-gray-50 border-y border-gray-200 px-12 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-500"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              How It Works
            </span>
          </div>
          <h2 className="text-charcoal mb-10"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,42px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Structured by design.<br />
            <em className="not-italic italic text-blue-500">Not a loophole.</em>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {guardrails.map(g => (
              <div key={g.n} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-[10px] text-gray-300 mb-3"
                  style={{ fontFamily: "'DM Mono', monospace" }}>{g.n}</div>
                <div className="text-[15px] font-semibold text-charcoal mb-2">{g.title}</div>
                <div className="text-[13px] font-light text-gray-400 leading-[1.65]">{g.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Imprint connection */}
      <div className="bg-[#0F1C2E] px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-400 block" />
              <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-400"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Imprint Routing
              </span>
            </div>
            <h3 className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Partner Program feeds<br />
              <em className="not-italic italic text-blue-400">the imprint ecosystem.</em>
            </h3>
            <p className="text-[15px] font-light text-white/45 leading-[1.75]">
              Every Partner Program author is assigned to the right official JMP imprint based on their audience, positioning, and publishing strategy — feeding a repeat-author pipeline into a structured catalog.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Flagship release',  imprint: 'J Merrill Publishing', color: '#1E90FF' },
              { label: 'Children\'s author', imprint: 'JM Little',           color: '#F4B400' },
              { label: 'Poet / verse writer', imprint: 'JM Verse',           color: '#6A5ACD' },
              { label: 'Trade / inspirational author', imprint: 'JM Works',  color: '#4AA3A2' },
            ].map(item => (
              <div key={item.label} className="p-5 rounded-xl bg-white/[0.03] border border-white/8">
                <div className="text-[12px] text-white/35 mb-2">{item.label}</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[13px] font-semibold text-white">{item.imprint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application CTA */}
      <div className="bg-charcoal px-12 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            Applications reviewed on a rolling basis
          </span>
        </div>
        <h2 className="text-white mb-4"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,4vw,56px)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Ready to build your<br />
          <em className="not-italic italic text-blue-500">body of work?</em>
        </h2>
        <p className="text-[16px] text-white/40 mb-10 max-w-[440px] mx-auto leading-[1.7]">
          Tell us about your publishing vision — your current titles, your pipeline, and your goals. We'll review your application and reach out within 3–5 business days.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/publishing-partner/apply"
            className="inline-flex items-center gap-2.5 bg-blue-500 text-white text-[14px] font-semibold tracking-[0.05em] uppercase px-10 py-4 rounded-full hover:bg-blue-600 transition-all hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(30,144,255,0.4)]">
            Apply for Partnership →
          </Link>
          <a href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            className="inline-flex items-center gap-2 border border-white/15 text-white/60 text-[14px] px-10 py-4 rounded-full hover:border-blue-500 hover:text-blue-400 transition-all hover:-translate-y-0.5">
            Schedule a Discovery Call
          </a>
        </div>
        <p className="text-[12px] text-white/20 mt-6">
          Not ready for the Partner Program?{' '}
          <Link href="/packages" className="text-blue-400/50 hover:text-blue-400 transition-colors">
            Explore our standard publishing packages →
          </Link>
        </p>
      </div>
    </div>
  )
}
