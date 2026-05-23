// app/distribution/page.tsx  — CANONICAL
// Data: lib/distribution-data.ts
// Contact: 614.965.6057 | publishing@jmerrill.one

'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  DIGITAL_SALES_PARTNERS, FAITH_CHANNELS,
  PRINT_REGIONS, JMP_CONTACT, type DigitalPartner
} from '@/lib/distribution-data'

type Tab     = 'print' | 'digital' | 'faith'
type Filter  = 'All' | 'Retail' | 'Library' | 'Audio' | 'Worldwide'

const FILTER_LABELS: Filter[] = ['All', 'Retail', 'Library', 'Audio', 'Worldwide']

const FORMAT_COLOR: Record<string, string> = {
  'Ebook':          'text-blue-300   bg-blue-500/10   border-blue-500/20',
  'Audio':          'text-rose-300   bg-rose-500/10   border-rose-500/20',
  'Ebook & Audio':  'text-purple-300 bg-purple-500/10 border-purple-500/20',
}

export default function DistributionPage() {
  const [tab,      setTab]      = useState<Tab>('print')
  const [expanded, setExpanded] = useState<string | null>('United States & Canada')
  const [filter,   setFilter]   = useState<Filter>('All')

  const filtered = useMemo<DigitalPartner[]>(() => {
    switch (filter) {
      case 'Retail':    return DIGITAL_SALES_PARTNERS.filter(p => p.model.includes('Retail'))
      case 'Library':   return DIGITAL_SALES_PARTNERS.filter(p => p.model.includes('Library'))
      case 'Audio':     return DIGITAL_SALES_PARTNERS.filter(p => p.format.includes('Audio'))
      case 'Worldwide': return DIGITAL_SALES_PARTNERS.filter(p => p.territory === 'Worldwide')
      default:          return DIGITAL_SALES_PARTNERS
    }
  }, [filter])

  return (
    <div className="pt-[76px] bg-[#070710] min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative bg-[#002C54] overflow-hidden px-8 md:px-12 py-20 md:py-28 border-b border-white/5">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 80% at 80% 50%, rgba(30,144,255,0.14) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#1E90FF]" />
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Distribution Through Ingram Content
            </span>
          </div>

          <h1 className="text-white mb-5"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,5vw,72px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.025em' }}>
            Helping your book<br />
            reach the <em className="not-italic text-[#1E90FF]">marketplace.</em>
          </h1>
          <p className="text-[16px] font-light text-white/45 leading-[1.8] max-w-[540px] mb-12">
            Publishing does not end when the files are finished. Your book needs to be prepared, positioned, and distributed through the right channels so readers, retailers, libraries, and partners can find it. J Merrill Publishing helps authors move from finished book to marketplace access with clarity.
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              'Global distribution through Ingram’s retail and library network',
              'Print, eBook, audio, wholesale, and library pathways',
              'Professional preparation before marketplace entry',
            ].map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white/55"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-8 md:px-12 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              What Distribution Really Means
            </div>
            <h2 className="text-white mb-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Distribution is access — not a sales guarantee.
            </h2>
            <p className="text-[15px] text-white/45 font-light leading-[1.8]">
              Distribution makes a professionally prepared book available through retail, wholesale, library, and digital channels. It does not automatically guarantee sales, shelf placement, or reader demand. That is why metadata, presentation, launch support, and author visibility still matter.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Global Distribution Through Ingram
            </div>
            <h2 className="text-white mb-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Professional marketplace access beyond upload-only publishing.
            </h2>
            <p className="text-[15px] text-white/45 font-light leading-[1.8]">
              Through our Ingram distribution relationship, eligible titles can be prepared for broad marketplace access across print, eBook, wholesale, and library channels. This gives authors a professional publishing path many cannot unlock alone.
            </p>
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────── */}
      <div className="sticky top-[76px] z-30 bg-[#070710]/96 backdrop-blur border-b border-white/5 px-8 md:px-12 py-4">
        <div className="max-w-[1280px] mx-auto flex gap-2.5 flex-wrap">
          {([
            { id: 'print',   label: 'Print Distribution',    icon: '📚' },
            { id: 'digital', label: 'Digital & Audio',   icon: '🌐' },
            { id: 'faith',   label: 'Faith & Specialty',  icon: '✝️' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${
                tab === t.id
                  ? 'bg-[#1E90FF] border-[#1E90FF] text-white'
                  : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 py-14">

        {/* PRINT */}
        {tab === 'print' && (
          <div>
            <h2 className="text-white mb-2"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Print distribution
            </h2>
            <p className="text-[15px] text-white/40 font-light max-w-[580px] leading-[1.7] mb-10">
              Print distribution helps a professionally prepared book become orderable across retail, wholesale, library, school, and e-commerce pathways. The goal is professional availability, not a promise of automatic placement.
            </p>
            <div className="flex flex-col gap-2.5">
              {PRINT_REGIONS.map(reg => {
                const open = expanded === reg.region
                return (
                  <div key={reg.region}
                    className={`border rounded-2xl overflow-hidden transition-colors ${
                      open ? 'border-[#1E90FF]/30 bg-[#1E90FF]/[0.04]' : 'border-white/7 bg-white/[0.02] hover:border-white/14'
                    }`}>
                    <button onClick={() => setExpanded(open ? null : reg.region)}
                      className="w-full flex items-center justify-between px-6 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <span className="text-[22px] flex-shrink-0">{reg.flag}</span>
                        <div>
                          <div className="text-[16px] font-semibold text-white"
                            style={{ fontFamily: "'Libre Baskerville', serif" }}>{reg.region}</div>
                          <div className="text-[12px] text-white/25 mt-0.5 font-light">{reg.stat}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ml-4 transition-transform ${
                        open ? 'border-[#1E90FF] rotate-180' : 'border-white/15'
                      }`}>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                          <path d="M1 1L5 5L9 1" stroke={open ? '#1E90FF' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </button>
                    {open && (
                      <div className="px-6 pb-6 border-t border-white/6">
                        <p className="text-[14px] text-white/45 font-light leading-[1.75] my-5">{reg.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {reg.channels.map(ch => (
                            <span key={ch} className="px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-[12px] text-white/50">{ch}</span>
                          ))}
                          <span className="px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-[12px] text-white/18 italic">+ thousands more</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-5 text-[12px] text-white/20 leading-[1.7]">
              Distribution via Ingram Content. Retailers, wholesalers, and library partners independently determine whether to list or stock a title.
            </p>
          </div>
        )}

        {/* DIGITAL */}
        {tab === 'digital' && (
          <div>
            <h2 className="text-white mb-2"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              eBook and audiobook pathways
            </h2>
            <p className="text-[15px] text-white/40 font-light max-w-[580px] leading-[1.7] mb-8">
              Different formats take different paths to readers. Digital distribution helps make eBooks and audiobooks available across retail, subscription, education, and library channels when the title is prepared correctly.
            </p>

            <p className="text-[14px] text-white/35 font-light max-w-[760px] leading-[1.75] mb-8">
              All eBook titles distribute exclusively through Ingram Content&apos;s digital distribution network, reaching Apple Books, Kobo, Barnes &amp; Noble Nook, library platforms, and global digital retailers.
            </p>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-8">
              {FILTER_LABELS.map(f => {
                const count = f === 'All' ? DIGITAL_SALES_PARTNERS.length
                  : f === 'Retail'    ? DIGITAL_SALES_PARTNERS.filter(p => p.model.includes('Retail')).length
                  : f === 'Library'   ? DIGITAL_SALES_PARTNERS.filter(p => p.model.includes('Library')).length
                  : f === 'Audio'     ? DIGITAL_SALES_PARTNERS.filter(p => p.format.includes('Audio')).length
                  : DIGITAL_SALES_PARTNERS.filter(p => p.territory === 'Worldwide').length
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                      filter === f
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'border-white/8 text-white/35 hover:border-white/20 hover:text-white/55'
                    }`}>
                    {f} <span className="ml-1 text-white/30">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Partner grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-8">
              {filtered.map(p => (
                <div key={p.name}
                  className={`px-4 py-3.5 rounded-xl border flex flex-col gap-1.5 ${FORMAT_COLOR[p.format] || 'bg-white/[0.03] border-white/8'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14px] font-semibold text-white leading-[1.25]">{p.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${FORMAT_COLOR[p.format]}`}>
                      {p.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/30">
                    <span>{p.model}</span>
                    <span>·</span>
                    <span>{p.hq}</span>
                  </div>
                  <div className="text-[11px] text-white/25 font-light">{p.territory}</div>
                </div>
              ))}
            </div>

            <div className="px-5 py-5 bg-[#1E90FF]/5 border border-[#1E90FF]/20 rounded-2xl">
              <p className="text-[13px] text-white/40 font-light leading-[1.7]">
                <span className="text-white/60 font-medium">These digital pathways matter because they expand availability, not because they guarantee demand.</span> Strong metadata, the right format decisions, launch support, and an active author presence still shape how far a book goes after distribution begins.
              </p>
            </div>
          </div>
        )}

        {/* FAITH */}
        {tab === 'faith' && (
          <div>
            <h2 className="text-white mb-2"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Faith, ministry, and specialty pathways
            </h2>
            <p className="text-[15px] text-white/40 font-light max-w-[580px] leading-[1.7] mb-8">
              Some books are written for churches, ministries, devotional readers, Christian retailers, or specialty audiences. When a title fits those pathways, distribution preparation can help it reach the right market more clearly.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {FAITH_CHANNELS.map(ch => (
                <div key={ch} className="flex items-center gap-3 px-5 py-4 bg-slate-500/10 border border-slate-500/20 rounded-xl">
                  <span className="text-slate-400 text-[14px] flex-shrink-0">✝</span>
                  <span className="text-[14px] text-white/65 font-light">{ch}</span>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="px-5 py-5 bg-white/[0.03] border border-white/7 rounded-2xl">
                <div className="text-[11px] text-white/25 uppercase tracking-[0.1em] mb-3"
                  style={{ fontFamily: "'DM Mono', monospace" }}>Faith Market Add-On Service</div>
                <div className="text-[15px] font-semibold text-white mb-1">JMP-DIST-FAITH</div>
                <p className="text-[13px] text-white/40 font-light leading-[1.7]">
                  Faith Market Distribution — $295. CBA market positioning, LifeWay-ready metadata, Christian retail channel access, and church/conference placement support. Available as an add-on to any publishing package where it fits the work.
                </p>
              </div>
              <div className="px-5 py-5 bg-white/[0.03] border border-white/7 rounded-2xl">
                <div className="text-[11px] text-white/25 uppercase tracking-[0.1em] mb-3"
                  style={{ fontFamily: "'DM Mono', monospace" }}>JM Imprints for Faith Content</div>
                <div className="flex flex-col gap-2">
                  {[
                    { imp: 'J Merrill Publishing', note: 'Faith, devotional, ministry — flagship' },
                    { imp: 'JM Works',             note: 'General trade including inspirational' },
                    { imp: 'JM Verse',             note: 'Poetry including spiritual verse' },
                    { imp: 'JM Signature',          note: 'Prestige — inaugural: The Conquest of Azenga' },
                  ].map(i => (
                    <div key={i.imp} className="flex flex-col">
                      <span className="text-[13px] font-medium text-white/70">{i.imp}</span>
                      <span className="text-[11px] text-white/30 font-light">{i.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              What Authors Should Understand
            </div>
            <h3 className="text-white mb-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              What distribution can — and cannot — do.
            </h3>
            <ul className="flex flex-col gap-3 text-[14px] font-light leading-[1.75] text-white/50">
              {[
                'Distribution helps make the book available through professional channels.',
                'Marketing helps create demand and visibility.',
                'Metadata helps readers, retailers, and libraries understand the book.',
                'Quality production affects confidence and discoverability.',
                'Author platform, audience fit, and effort still matter.',
                'Results vary by book, category, audience, and release strategy.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#1E90FF] mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Distribution Readiness
            </div>
            <h3 className="text-white mb-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Before a book enters the marketplace, it needs to be ready.
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 text-[14px] font-light leading-[1.75] text-white/50">
              {[
                'An edited manuscript',
                'A finished cover and interior',
                'ISBN assignment',
                'Strong metadata and categories',
                'A clear book description',
                'Pricing and format decisions',
                'Distribution setup',
                'A launch and visibility plan',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-[#1E90FF] mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── FOOTER CTA + CONTACT ──────────────────────────────────────── */}
      <div className="border-t border-white/5 bg-[#002C54] px-8 md:px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <h3 className="text-white mb-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Ready to prepare your book<br />
              <em className="not-italic text-[#1E90FF]">for the marketplace?</em>
            </h3>
            <p className="text-[15px] text-white/40 mb-8 leading-[1.75]">
              Tell us about your book and where you are in the publishing process. We will help you understand what your title needs before distribution.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/join"
                className="inline-flex items-center gap-2 bg-[#1E90FF] text-white text-[13px] font-semibold tracking-[0.04em] uppercase px-7 py-3.5 rounded-full hover:bg-blue-500 transition-all hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(30,144,255,0.35)]">
                Tell Us About Your Book →
              </Link>
              <Link href="/publishing"
                className="inline-flex items-center gap-2 border border-white/15 text-white/55 text-[13px] px-7 py-3.5 rounded-full hover:border-[#1E90FF]/40 hover:text-[#A3C4DC] transition-all">
                Publish With Us
              </Link>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-7">
            <div className="text-[11px] text-white/25 uppercase tracking-[0.12em] mb-5"
              style={{ fontFamily: "'DM Mono', monospace" }}>Contact Publishing</div>
            <div className="flex flex-col gap-4 mb-6">
              <a href={JMP_CONTACT.phoneHref}
                className="flex items-center gap-3 text-[15px] text-white/65 hover:text-white transition-colors group">
                <span className="text-[18px] group-hover:scale-110 transition-transform">📞</span>
                {JMP_CONTACT.phone}
              </a>
              <a href={JMP_CONTACT.emailHref}
                className="flex items-center gap-3 text-[15px] text-white/65 hover:text-[#A3C4DC] transition-colors group">
                <span className="text-[18px] group-hover:scale-110 transition-transform">✉</span>
                {JMP_CONTACT.email}
              </a>
            </div>
            <div className="border-t border-white/8 pt-5">
              <div className="text-[11px] text-white/20 uppercase tracking-[0.1em] mb-3"
                style={{ fontFamily: "'DM Mono', monospace" }}>Business Hours (EST)</div>
              <div className="flex flex-col gap-2">
                {JMP_CONTACT.hours.map(h => (
                  <div key={h.days} className="flex items-center justify-between text-[13px]">
                    <span className="text-white/40 font-light">{h.days}</span>
                    <span className={`font-medium ${
                      h.time === 'Closed'          ? 'text-white/20' :
                      h.days.includes('Tuesday')   ? 'text-[#A3C4DC]' : 'text-white/50'
                    }`}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-white/8">
              <a href={JMP_CONTACT.booking}
                className="flex items-center justify-center gap-2 w-full py-3 border border-white/15 text-white/45 text-[13px] rounded-xl hover:border-[#1E90FF]/35 hover:text-[#A3C4DC] transition-all">
                Schedule a Consultation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
