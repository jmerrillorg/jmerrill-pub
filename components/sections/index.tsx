import Link from 'next/link'
import {
  division,
  packages,
  serviceCategories,
  distribution,
  memberships,
  nav,
} from '@/lib/tokens'

// ─────────────────────────────────────────
// TICKER
// ─────────────────────────────────────────
export function Ticker() {
  const items = [
    'Full-Service Publisher',
    '45,000+ Global Retail Outlets via Ingram',
    'Helping Authors Help Themselves',
    '101+ Published Titles',
    'Editorial · Design · Distribution',
    '450+ CoreSource Digital Partners',
    'AI-Powered Publishing Intelligence',
    'Faith · Inspirational · Children\'s · Memoir',
    'Founded 2018 · Columbus, Ohio',
    'Author Careers Built Here',
  ]
  const doubled = [...items, ...items]

  return (
    <div className="bg-blue-500 h-11 flex items-center overflow-hidden">
      <div
        className="flex items-center gap-0 whitespace-nowrap animate-[ticker_28s_linear_infinite]"
        style={{ willChange: 'transform' }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-6 px-8">
            <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/85">
              {item}
            </span>
            <span className="w-1 h-1 bg-white/40 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// SECTION KICKER
// ─────────────────────────────────────────
function Kicker({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 mb-4 reveal ${light ? '' : ''}`}>
      <span className={`w-8 h-px block flex-shrink-0 ${light ? 'bg-blue-400' : 'bg-blue-500'}`} />
      <span
        className={`text-[10px] font-medium tracking-[0.16em] uppercase ${light ? 'text-blue-400' : 'text-blue-500'}`}
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {children}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────
// ABOUT / AUTHOR JOURNEY
// ─────────────────────────────────────────
export function AboutSection() {
  const steps = [
    { n: '01', title: 'Join the Family',       body: 'Discovery call, manuscript evaluation, package selection — we meet you where you are and build a plan around your goals, timeline, and vision.' },
    { n: '02', title: 'Editorial & Design',    body: 'Professional editing at every level — developmental, line, copy, and proof. Paired with cover design and interior layout that makes your book undeniable.' },
    { n: '03', title: 'Publish & Distribute',  body: 'ISBN, BISAC metadata, and global distribution through our IngramSpark, CoreSource, and Lightning Source infrastructure — publisher-grade channels.' },
    { n: '04', title: 'Launch & Market',       body: 'Launch strategy, ARC campaigns, Amazon advertising, press releases, BookTok packages, and author platform development.' },
    { n: '05', title: 'Build Your Career',     body: 'Ongoing membership plans, royalty reporting dashboard, community access, backlist optimization, and long-term author support.' },
  ]

  return (
    <section className="py-[120px] px-12 bg-white">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[380px_1fr] gap-24 items-start">

        {/* Left — sticky */}
        <div className="lg:sticky lg:top-28">
          <Kicker>Our Story</Kicker>
          <h2
            className="mb-6 text-charcoal reveal reveal-delay-1"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px, 3.5vw, 54px)',
              fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em',
            }}
          >
            We build<br />
            <em className="not-italic italic text-blue-500">author careers,</em><br />
            not just books.
          </h2>
          <p className="text-[16px] font-light leading-[1.85] text-gray-500 mb-4 reveal reveal-delay-2">
            J Merrill Publishing, Inc. is a full-service, author-focused publishing company committed to excellence, empowerment, and inclusivity. Founded by {division.founder}, our mission is simple: {division.tagline}
          </p>
          <p className="text-[16px] font-light leading-[1.85] text-gray-500 mb-8 reveal reveal-delay-2">
            We believe in transparency, high standards, and publishing solutions that evolve with technology — from AI-powered production to global distribution infrastructure most independent authors can't access alone.
          </p>
          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 rounded-2xl border-l-[3px] border-blue-500 reveal reveal-delay-3">
            <div>
              <div className="text-[14px] font-semibold text-charcoal">{division.founder}</div>
              <div className="text-[12px] text-gray-400">{division.founderTitle}</div>
            </div>
          </div>
        </div>

        {/* Right — steps */}
        <div>
          {steps.map((step, i) => (
            <div
              key={step.n}
              className={`grid grid-cols-[56px_1fr] gap-6 py-9 border-b border-gray-100 group cursor-default reveal reveal-delay-${Math.min(i + 1, 4)} ${i === 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl border-[1.5px] border-gray-200 flex items-center justify-center group-hover:bg-blue-500 group-hover:border-blue-500 transition-all duration-200 self-center"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', fontWeight: 500, color: '#8A8F9A' }}
              >
                <span className="group-hover:text-white transition-colors duration-200">{step.n}</span>
              </div>
              <div>
                <div className="text-[18px] font-semibold text-charcoal mb-2 group-hover:text-blue-500 transition-colors duration-200">
                  {step.title}
                </div>
                <div className="text-[14px] font-light text-gray-400 leading-[1.7]">
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// PACKAGES
// ─────────────────────────────────────────
export function PackagesSection() {
  return (
    <section id="packages" className="py-[120px] px-12 bg-[#0D0D10] relative overflow-hidden">
      {/* Ghost text */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
        style={{
          fontFamily: "'Libre Baskerville', serif",
          fontSize: '320px', fontWeight: 700,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.025)',
          whiteSpace: 'nowrap', letterSpacing: '-0.05em',
        }}
      >
        Publish
      </div>
      {/* Top rule */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

      <div className="max-w-[1280px] mx-auto relative z-10">

        {/* Header */}
        <div className="flex justify-between items-end mb-16">
          <div>
            <Kicker light>Publishing Packages</Kicker>
            <h2
              className="text-white reveal reveal-delay-1"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(36px, 3.5vw, 54px)',
                fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em',
              }}
            >
              Choose your<br />
              <em className="not-italic italic text-blue-500">publishing path</em>
            </h2>
          </div>
          <Link
            href="/packages"
            className="text-[13px] text-white/40 border-b border-white/15 pb-px hover:text-blue-400 hover:border-blue-400 transition-all duration-200 mb-2 hidden md:block reveal"
          >
            View full catalog →
          </Link>
        </div>

        {/* Grid */}
        <div className="grid lg:grid-cols-3 gap-px bg-white/8 rounded-3xl overflow-hidden reveal reveal-delay-1">
          {packages.map((pkg) => (
            <div
              key={pkg.sku}
              className={`relative flex flex-col p-11 transition-colors duration-300 ${
                pkg.featured
                  ? 'bg-blue-500/8 hover:bg-blue-500/12'
                  : 'bg-white/[0.03] hover:bg-blue-500/6'
              }`}
            >
              {pkg.featured && (
                <div className="absolute top-6 right-6 bg-blue-500 text-white text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div
                className="text-[10px] tracking-[0.12em] uppercase text-white/30 mb-4"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {pkg.sku}
              </div>
              <div
                className="text-white mb-2"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700 }}
              >
                {pkg.tier}
              </div>
              <div
                className="text-white leading-none mb-1"
                style={{ fontSize: '52px', fontWeight: 900, letterSpacing: '-0.03em' }}
              >
                <sup className="text-2xl font-normal opacity-60 mr-0.5">$</sup>
                {pkg.price.toLocaleString()}
              </div>
              <div
                className="text-[11px] text-white/30 mb-9"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                Up to {pkg.wordLimit} words
              </div>
              <div className="w-full h-px bg-white/8 mb-7" />
              <ul className="flex flex-col gap-3 flex-1 mb-10">
                {pkg.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-[14px] font-light text-white/55 leading-[1.5]">
                    <span className="text-blue-500 text-[14px] mt-0.5 flex-shrink-0">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/join"
                className={`block text-center py-3.5 rounded-xl text-[13px] font-semibold tracking-[0.04em] uppercase transition-all duration-200 border-[1.5px] mt-auto ${
                  pkg.featured
                    ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 shadow-blue-cta'
                    : 'border-white/15 text-white/60 hover:border-blue-500 hover:text-blue-400'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[14px] text-white/25 mt-8 reveal">
          All packages include eBook conversion via CoreSource. Audiobook, children's, large print, and 90+ add-on services available.{' '}
          <Link href="/services" className="text-sky-400/70 hover:text-sky-400 transition-colors">
            View full catalog →
          </Link>
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────
export function ServicesSection() {
  return (
    <section id="services" className="py-[120px] px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">

        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-20 items-end mb-18">
          <div>
            <Kicker>Full-Spectrum Services</Kicker>
            <h2
              className="text-charcoal reveal reveal-delay-1"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(40px, 4vw, 60px)',
                fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em',
              }}
            >
              Everything your book<br />
              <em className="not-italic italic text-blue-500">needs to succeed</em>
            </h2>
          </div>
          <div className="pb-2 reveal reveal-delay-2">
            <p className="text-[15px] font-light text-gray-400 leading-[1.8] mb-4">
              {division.stats.services} services across {division.stats.categories} categories. From first draft to long-term author career — we have the infrastructure, the expertise, and the relationships to support every step.
            </p>
            <div
              className="text-blue-500/20 leading-none"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '64px', fontWeight: 700 }}
            >
              {division.stats.services}
            </div>
          </div>
        </div>

        {/* Services grid — 4 col uniform, accent tiles at 0 and 4 */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden border border-gray-200 bg-gray-200 reveal reveal-delay-1"
        >
          {serviceCategories.map((svc, i) => {
            const isAccent = i === 0 || i === 4
            return (
              <div
                key={svc.num}
                className={[
                  'p-9 transition-colors duration-250 relative group flex flex-col',
                  'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px]',
                  'after:bg-blue-500 after:scale-x-0 after:origin-left after:transition-transform after:duration-300',
                  'hover:after:scale-x-100',
                  isAccent
                    ? 'bg-[#0F1C2E] hover:bg-[#0a1628]'
                    : 'bg-white hover:bg-blue-50',
                ].join(' ')}
              >
                <span
                  className={`block text-[10px] tracking-[0.1em] mb-5 ${isAccent ? 'text-white/20' : 'text-gray-300'}`}
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {svc.num}
                </span>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[20px] mb-4 transition-all duration-200 border flex-shrink-0 ${
                  isAccent
                    ? 'bg-blue-500/15 border-blue-500/30 group-hover:bg-blue-500 group-hover:border-blue-500'
                    : 'bg-blue-50 border-blue-100 group-hover:bg-blue-500 group-hover:border-blue-500'
                }`}>
                  {svc.icon}
                </div>
                <div className={`font-semibold mb-2 transition-colors duration-200 text-[16px] ${
                  isAccent
                    ? 'text-white'
                    : 'text-charcoal group-hover:text-blue-600'
                }`}>
                  {svc.title}
                </div>
                <div className={`text-[13px] font-light leading-[1.65] ${
                  isAccent ? 'text-white/50' : 'text-gray-400'
                }`}>
                  {svc.body}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// DISTRIBUTION BAND
// ─────────────────────────────────────────
export function DistributionBand() {
  return (
    <div className="bg-blue-50 border-y border-blue-100 py-16 px-12">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1fr_2fr] gap-20 items-center">
        <div className="reveal">
          <div
            className="text-[10px] font-medium tracking-[0.16em] uppercase text-blue-900 mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Enterprise Infrastructure
          </div>
          <h3
            className="text-charcoal mb-3"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.2 }}
          >
            Publisher-grade access.<br />Author-friendly pricing.
          </h3>
          <p className="text-[14px] font-light text-gray-500 leading-[1.7]">
            We operate on the same infrastructure as major publishing houses — giving every author in our family access to channels that self-publishing alone can't replicate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 reveal reveal-delay-2">
          {distribution.map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-2.5 bg-white border border-blue-100 rounded-full px-4 py-2.5 hover:border-blue-500 hover:shadow-blue-sm transition-all duration-200 cursor-default group"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              <span className="text-[13px] font-medium text-charcoal">{d.name}</span>
              <span className="text-[11px] text-gray-400 font-light">{d.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// FAITH SECTION
// ─────────────────────────────────────────
export function FaithSection() {
  const cards = [
    { icon: '🏛️', title: 'Church Bookstore Placement',    body: 'We position your title for church resource tables, ministry bookstores, and institutional buyers — with the right metadata and relationships to get there.' },
    { icon: '📖', title: 'Bible Study Kit Creation',       body: 'Transform your book into a complete Bible study or group curriculum with a full leader guide — turning readers into communities.' },
    { icon: '🙏', title: 'Devotional Formatting',          body: 'Structure your content for teaching, ministry, and group use — workbook style, discussion questions, and curriculum alignment included.' },
    { icon: '🌍', title: 'CBA Market Distribution',        body: 'Christian Booksellers Association positioning, LifeWay-ready metadata, and faith retail channel access for titles that belong in every Christian bookstore.' },
  ]

  return (
    <section className="py-[120px] px-12 bg-gray-50">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1fr_480px] gap-20 items-center">
        <div>
          <Kicker>Faith & Ministry Publishing</Kicker>
          <h2
            className="text-charcoal mb-5 reveal reveal-delay-1"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px, 3.5vw, 54px)',
              fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em',
            }}
          >
            Built for voices<br />
            with a <em className="not-italic italic text-blue-500">calling</em>
          </h2>
          <p className="text-[16px] font-light text-gray-500 leading-[1.85] mb-8 max-w-[480px] reveal reveal-delay-2">
            Our catalog runs deep in faith, inspirational, and ministry content. We understand your audience, your mission, and the channels that reach them — from church bookstores to global digital platforms.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2.5 bg-blue-500 text-white text-[14px] font-semibold tracking-[0.04em] uppercase px-9 py-4 rounded-full hover:bg-blue-600 transition-all duration-250 hover:-translate-y-0.5 shadow-blue-cta reveal reveal-delay-3"
          >
            Start Your Journey →
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className={`bg-white border border-gray-200 rounded-2xl p-7 grid grid-cols-[44px_1fr] gap-5 items-start cursor-default group hover:shadow-blue-sm hover:border-blue-100 transition-all duration-200 relative overflow-hidden reveal reveal-delay-${Math.min(i + 1, 4)}`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-200 group-hover:bg-blue-500 transition-colors duration-200 rounded-l-2xl" />
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-[20px] border border-blue-100 group-hover:bg-blue-500 group-hover:border-blue-500 transition-all duration-200">
                {card.icon}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-charcoal mb-1.5">{card.title}</div>
                <div className="text-[13px] font-light text-gray-400 leading-[1.65]">{card.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// MEMBERSHIPS
// ─────────────────────────────────────────
export function MembershipsSection() {
  return (
    <section id="memberships" className="py-[120px] px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-14">
          <div>
            <Kicker>Author Memberships</Kicker>
            <h2
              className="text-charcoal reveal reveal-delay-1"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(36px, 3.5vw, 52px)',
                fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em',
              }}
            >
              Stay connected.<br />
              <em className="not-italic italic text-blue-500">Keep growing.</em>
            </h2>
          </div>
          <p className="text-[14px] font-light text-gray-400 max-w-[380px] leading-[1.7] lg:text-right mt-4 lg:mt-0 reveal reveal-delay-2">
            Ongoing support plans for authors who want more than a one-time publish. Royalty reporting dashboard included in Support, Marketing, and AI tiers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {memberships.map((mem, i) => (
            <div
              key={mem.sku}
              className={[
                'rounded-3xl p-8 border-[1.5px] transition-all duration-250 hover:-translate-y-1',
                `reveal reveal-delay-${Math.min(i + 1, 4)}`,
                mem.highlight
                  ? 'bg-charcoal border-charcoal hover:border-blue-500'
                  : 'border-gray-200 hover:border-blue-500 hover:shadow-blue-md',
              ].join(' ')}
            >
              <div
                className={`text-[9px] font-medium tracking-[0.14em] uppercase mb-4 ${mem.highlight ? 'text-blue-400' : 'text-blue-500'}`}
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {mem.tier}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className={`leading-none ${mem.highlight ? 'text-white' : 'text-charcoal'}`}
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em' }}
                >
                  ${mem.price}
                </span>
                <span className={`text-[13px] font-light ${mem.highlight ? 'text-white/35' : 'text-gray-400'}`}>/month</span>
              </div>
              <div
                className={`text-[16px] font-semibold mb-5 pb-5 border-b ${
                  mem.highlight ? 'text-white border-white/8' : 'text-charcoal border-gray-100'
                }`}
              >
                {mem.name}
              </div>
              <ul className="flex flex-col gap-2.5">
                {mem.features.map((feat) => (
                  <li key={feat} className={`flex items-start gap-2 text-[13px] font-light leading-[1.5] ${mem.highlight ? 'text-white/50' : 'text-gray-500'}`}>
                    <span className="text-blue-500 text-[12px] font-bold flex-shrink-0 mt-0.5">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// JM1 SYSTEM CTA (cross-division awareness)
// ─────────────────────────────────────────
export function SystemCTA() {
  return (
    <div className="bg-[#0A1F33] px-12 py-10 border-t border-white/5">
      <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-500/15 border border-blue-500/30 rounded-lg flex items-center justify-center">
            <span className="text-blue-400 font-mono text-[11px] font-bold">01</span>
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-[0.1em] uppercase text-white/25 mb-0.5">Part of the J Merrill One System</div>
            <div className="text-[14px] text-white/50 font-light">Publishing authors into the full JM1 ecosystem — financial planning, media amplification, and community impact.</div>
          </div>
        </div>
        <a
          href="https://www.jmerrill.one"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-2 text-[13px] text-white/35 border border-white/10 rounded-full px-5 py-2.5 hover:border-blue-500/50 hover:text-blue-400 transition-all duration-200"
        >
          Explore J Merrill One ↗
        </a>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// CLOSING CTA
// ─────────────────────────────────────────
export function ClosingCTA() {
  return (
    <section className="relative bg-charcoal py-36 px-12 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 20% 50%, rgba(30,144,255,0.1) 0%, transparent 65%),
            radial-gradient(ellipse 50% 60% at 80% 50%, rgba(106,90,205,0.08) 0%, transparent 60%)
          `
        }}
      />
      {/* Ghost text */}
      <div
        className="absolute bottom-[-40px] left-[-20px] pointer-events-none select-none"
        style={{
          fontFamily: "'Libre Baskerville', serif",
          fontSize: '220px', fontWeight: 700, letterSpacing: '-0.05em',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.025)',
          whiteSpace: 'nowrap',
        }}
      >
        Join the Family
      </div>

      <div className="relative z-10 max-w-[800px] mx-auto text-center reveal">
        <div
          className="text-[11px] font-medium tracking-[0.16em] uppercase text-blue-400 mb-7"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Ready to publish?
        </div>
        <h2
          className="text-white mb-5"
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: 'clamp(44px, 5vw, 72px)',
            fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em',
          }}
        >
          Your story deserves<br />
          to be <em className="not-italic italic text-blue-500">heard</em>
        </h2>
        <p className="text-[18px] font-light text-white/45 max-w-[520px] mx-auto leading-[1.7] mb-12">
          Tell us about your book and your vision. We'll match you with the right package and walk you through every step — from manuscript to marketplace.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/join"
            className="inline-flex items-center gap-2.5 bg-blue-500 text-white text-[14px] font-semibold tracking-[0.06em] uppercase px-11 py-[18px] rounded-full hover:bg-blue-600 transition-all duration-250 hover:-translate-y-0.5 shadow-blue-cta"
          >
            Complete the Inquiry Form →
          </Link>
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-transparent text-white/60 text-[14px] font-light px-11 py-[18px] rounded-full border-[1.5px] border-white/15 hover:border-blue-500 hover:text-blue-400 transition-all duration-250 hover:-translate-y-0.5"
          >
            Schedule a Call First
          </a>
        </div>
      </div>
    </section>
  )
}
