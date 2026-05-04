import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'JM Prestige — Premium Publishing Imprint | J Merrill Publishing',
  description: "JM Prestige is J Merrill Publishing's premium imprint for serious authors. Application-based. End-to-end production. Global distribution. Starting at $750/month.",
}

const distinctionCards = [
  {
    icon: '✓',
    title: 'Application-Based',
    body: 'JM Prestige is not open enrollment. Every author is reviewed. Every title is evaluated. We accept authors we believe in.',
  },
  {
    icon: '▣',
    title: 'End-to-End Support',
    body: "Editorial. Layout. Cover design. Distribution. Marketing. Audiobook. Every stage of your book's journey is supported by the full JMP production pipeline.",
  },
  {
    icon: '◉',
    title: 'Published Under JM Prestige',
    body: 'Your book carries the JM Prestige imprint — registered with Bowker and distributed through our Ingram Content partnership to readers worldwide.',
  },
]

const includedColumns = [
  {
    title: 'Production',
    items: [
      'Stage 0 Editorial Diagnostic',
      'Full editorial review (developmental, line, copy, or proof — based on manuscript)',
      'Professional interior layout',
      'Professional cover design',
      'Up to 3 revision rounds per stage',
      'Final approval gate before distribution',
    ],
  },
  {
    title: 'Distribution',
    items: [
      'ISBN assignment (print, ebook, audiobook)',
      'Distribution through our Ingram Content partnership',
      '45,000+ retailers, libraries, bookstores, and distribution channels worldwide',
      'Global retail availability (Amazon, Barnes & Noble, libraries, international)',
      'Metadata optimization (BISAC, keywords, description)',
    ],
  },
  {
    title: 'Author Services',
    items: [
      'Author profile page on jmerrill.pub',
      'Marketing Core Kit (social, caption kit, 14-day launch script)',
      '30/60/90-day post-launch monitoring',
      'Quarterly royalty reporting',
      'Annual publishing review',
    ],
  },
  {
    title: 'Prestige Additions',
    items: [
      'Priority production scheduling',
      'Dedicated author communication cadence',
      'Access to JM Prestige Growth Pipeline (audiobook, hardcover, relaunch)',
      'Early access to new JMP services and imprint opportunities',
      'Invitation to JMP Author Community',
    ],
  },
]

const pricingCards = [
  {
    badge: 'Most Popular',
    title: 'JM Prestige Standard',
    price: '$750',
    cadence: '/ month',
    annual: 'or $8,000/year — save $1,000',
    features: [
      'Full production pipeline',
      'One title per year',
      'Standard production scheduling',
      'Author profile page',
      'Marketing Core Kit',
      'Quarterly royalty reporting',
    ],
    cta: 'Apply for Standard →',
  },
  {
    badge: 'Full Partnership',
    title: 'JM Prestige Premium',
    price: '$1,250',
    cadence: '/ month',
    annual: 'or $13,500/year — save $1,500',
    features: [
      'Everything in Standard',
      'Up to two titles per year',
      'Priority production scheduling',
      'Dedicated author communication',
      'Growth Pipeline access',
      'Author Community invitation',
      'Early access to new JMP services',
    ],
    cta: 'Apply for Premium →',
  },
]

const trustIndicators = [
  '📚 Bowker Registered Imprint',
  '🌐 Ingram Content Distribution Partner',
  '📖 45,000+ Global Distribution Points',
]

const rightForYou = [
  'Have a manuscript that is complete or nearly complete',
  'Are ready to invest in professional publishing — not just printing',
  'Want their book in retail stores, libraries, and global distribution',
  'Are building a platform, a brand, or a legacy — not just a book',
  'Are committed to the full production process, not a shortcut',
  'Want a publisher who will be invested in their success',
]

const bookingUrl = 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-400/70 mb-4"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {children}
    </p>
  )
}

export default function PublishingPartnerPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E] relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-24">
        <section className="text-center max-w-[900px] mx-auto mb-20 sm:mb-24">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span
              className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              JM Prestige — Now Accepting Applications
            </span>
          </div>

          <h1
            className="text-white mb-6"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(38px,6vw,76px)',
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
            }}
          >
            Publishing for authors<br />
            who are ready.
          </h1>

          <p className="text-[16px] font-light text-white/45 leading-[1.75] max-w-[720px] mx-auto">
            JM Prestige is J Merrill Publishing&apos;s premium imprint — selective, supported, and built for authors who are serious about their work and their legacy.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/publishing-partner/apply"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
            >
              Apply for JM Prestige →
            </Link>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
            >
              Not sure yet? Start with a free consultation ↗
            </a>
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <div className="max-w-[860px] mb-10">
            <SectionLabel>What Is JM Prestige</SectionLabel>
            <p className="text-[15px] font-light leading-[1.8] text-white/60">
              JM Prestige is not a standard publishing offering. It is a publishing imprint — the same imprint that appears on the cover, in the distributor catalog, and in every retailer listing. When you publish under JM Prestige, you are not a client purchasing services. You are an author publishing under a house that believes in your work.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {distinctionCards.map((card) => (
              <div key={card.title} className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
                <div className="w-10 h-10 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-400 text-[18px] mb-5">
                  {card.icon}
                </div>
                <h2
                  className="text-white mb-3"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.2 }}
                >
                  {card.title}
                </h2>
                <p className="text-[14px] font-light leading-[1.8] text-white/45">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>What JM Prestige Includes</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-10">
            Everything in J Merrill Publishing&apos;s standard production pipeline, plus:
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {includedColumns.map((column) => (
              <div key={column.title} className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
                <h2
                  className="text-white mb-5"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}
                >
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-3">
                  {column.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] font-light leading-[1.7] text-white/55">
                      <span className="text-blue-400 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>Investment</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-10">
            JM Prestige is an annual publishing partnership. Two options. One commitment.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {pricingCards.map((card) => (
              <div key={card.title} className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 flex flex-col">
                <div className="inline-flex self-start rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 mb-6">
                  <span
                    className="text-[10px] text-blue-400 font-medium tracking-[0.12em] uppercase"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {card.badge}
                  </span>
                </div>

                <h2
                  className="text-white mb-2"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
                >
                  {card.title}
                </h2>

                <div className="mb-1">
                  <span
                    className="text-white"
                    style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '48px', fontWeight: 700, letterSpacing: '-0.03em' }}
                  >
                    {card.price}
                  </span>
                  <span className="text-[13px] text-white/30 ml-1">{card.cadence}</span>
                </div>

                <p className="text-[12px] text-blue-400/70 mb-6" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {card.annual}
                </p>

                <div className="w-full h-px bg-white/8 mb-6" />

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {card.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[14px] font-light leading-[1.7] text-white/55">
                      <span className="text-blue-400 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/publishing-partner/apply"
                  className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
                >
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] text-white/25 mt-6">
            Both annual options require a 1-year commitment and renew automatically. Single-pay annual pricing reflects a savings versus monthly.
          </p>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>A Real Imprint. A Real Catalog.</SectionLabel>
          <div className="max-w-[860px]">
            <p className="text-[15px] font-light leading-[1.8] text-white/60">
              JM Prestige is a registered publishing imprint under J Merrill Publishing, Inc. — recognized by Bowker and distributed through our partnership with Ingram Content, the world&apos;s largest book distributor. Every JM Prestige title reaches readers through 45,000+ retailers, libraries, bookstores, and distribution channels worldwide. This is not a label. It is a publishing home.
            </p>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-center gap-4">
            {trustIndicators.map((indicator) => (
              <div
                key={indicator}
                className="rounded-full border border-white/8 bg-white/[0.04] px-5 py-3 text-[12px] text-white/55 tracking-[0.08em] uppercase text-center"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {indicator}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>Is JM Prestige Right For You?</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-8">
            JM Prestige is built for authors who:
          </p>

          <div className="grid gap-3 max-w-[900px]">
            {rightForYou.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white/[0.04] border border-white/8 rounded-3xl px-5 py-4">
                <span className="text-blue-400 mt-0.5">✓</span>
                <span className="text-[15px] font-light leading-[1.7] text-white">{item}</span>
              </div>
            ))}
          </div>

          <p
            className="text-[15px] font-light italic text-white/30 mt-8"
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            If that&apos;s you — we&apos;d love to review your application.
          </p>
        </section>

        <section className="bg-white/[0.04] border border-blue-500/20 rounded-3xl px-6 sm:px-10 py-12 text-center">
          <h2
            className="text-white mb-4"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px,5vw,44px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to publish under<br />
            <em className="not-italic italic text-blue-500">JM Prestige?</em>
          </h2>

          <p className="text-[15px] font-light leading-[1.75] text-white/40 max-w-[640px] mx-auto">
            Applications are reviewed on a rolling basis. We respond within 3–5 business days.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/publishing-partner/apply"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
            >
              Apply Now →
            </Link>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
            >
              Questions? Schedule a free consultation ↗
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
