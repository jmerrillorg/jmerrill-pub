import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'JM Prestige — Selective Publishing Path | J Merrill Publishing',
  description:
    "JM Prestige is J Merrill Publishing's selective publishing path for serious work. Two tiers starting at $750/month. Application required. Publisher-reviewed.",
}

const distinctionCards = [
  {
    icon: '✓',
    title: 'Selective Fit',
    body: 'JM Prestige is not open enrollment. We review the work, the manuscript stage, the author’s goals, and whether the path truly fits the book.',
  },
  {
    icon: '▣',
    title: 'Elevated Guidance',
    body: 'This path is built for authors who want deeper editorial care, stronger positioning, and a publishing house that stays meaningfully involved in the work.',
  },
  {
    icon: '◉',
    title: 'Prestige Presentation',
    body: 'When a title is accepted, it is handled with elevated presentation, release care, and a longer-range view of what the work can become.',
  },
]

const includedColumns = [
  {
    title: 'Manuscript And Direction',
    items: [
      'A close review of the manuscript, message, and publishing path',
      'Editorial guidance that strengthens the work without flattening the author’s voice',
      'Clear direction on the level of production, positioning, and release care the book needs',
      'Publisher stewardship from planning through final approval',
      'A publishing path shaped around the seriousness of the work',
    ],
  },
  {
    title: 'Presentation And Release',
    items: [
      'Publisher-level cover, interior, and release presentation',
      'Professional preparation across print, digital, and catalog formats',
      'Metadata and publishing details shaped for marketplace readiness',
      'Format and release planning that reflects the standards of the house',
      'A finished book prepared to enter the marketplace with credibility',
    ],
  },
  {
    title: 'Positioning And Growth',
    items: [
      'Distribution preparation through Ingram’s retail and library network',
      'Launch planning that helps position the book with strength and clarity',
      'Author positioning support across catalog, profile, and visibility touchpoints',
      'Quarterly royalty reporting and annual publishing review',
      'A release strategy designed with future opportunity in view',
    ],
  },
  {
    title: 'Long-Term Relationship',
    items: [
      'A higher-touch relationship for authors building more than one release',
      'Priority scheduling and a more dedicated communication cadence',
      'Guidance on future titles, catalog growth, and broader publishing direction',
      'A publishing home that thinks beyond one transaction',
      'A serious path for authors who want the house invested in the work',
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
      'A selective publishing relationship under JM Prestige',
      'Professional editorial, design, and production care for serious work',
      'Release preparation shaped for presentation, discoverability, and readiness',
      'Author positioning, launch support, and publisher guidance through the process',
      'Quarterly royalty reporting and ongoing publishing visibility',
      'A 12-month path structured for authors building intentional momentum',
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
      'A deeper publishing partnership for high-commitment authors',
      'Expanded editorial, production, and release attention for elevated work',
      'Priority guidance, stronger consultation, and a more dedicated cadence',
      'Prestige positioning for launch quality, marketplace presence, and long-range growth',
      'Expanded access to the JM Prestige relationship and future publishing opportunities',
      'A 12-month high-touch path for authors pursuing elevated presentation',
    ],
    cta: 'Apply for Premium →',
  },
]

const trustIndicators = [
  '📚 Bowker Registered Imprint',
  '🌐 Global distribution through Ingram’s retail and library network',
  '✍️ Retained rights and author-centered publishing',
]

const rightForYou = [
  'Have a manuscript that is complete or nearly complete',
  'Carry a message, ministry, expertise, story, or legacy that deserves elevated handling',
  'Want a publishing path shaped around presentation, positioning, and long-term care',
  'Are building a broader platform, body of work, or multi-title future',
  'Need deeper editorial, production, or strategic guidance than a standard path provides',
  'Are open to discernment, preparation, and a serious publishing relationship',
  'Want a house that will stay invested in the work beyond one transaction',
]

const acceptanceCriteria = {
  standard: [
    'A complete or nearly complete manuscript, or at least one previously published title',
    'Work that aligns editorially with the JMP catalog and values',
    'A realistic publishing cadence — 1 to 2 titles per year',
    'An author who is ready for a professional publishing relationship, not a shortcut',
  ],
  premium: [
    'A full year of JM Prestige Standard in good standing, or equivalent track record at Publisher’s discretion',
    'Demonstrated author platform — email list, speaking presence, ministry audience, or social following',
    'Active, performing titles in the JMP catalog',
  ],
}

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
              JM Prestige — Selective Application Path
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
            A selective publishing path<br />
            for serious work.
          </h1>

          <p className="text-[16px] font-light text-white/45 leading-[1.75] max-w-[720px] mx-auto">
            Some books require more than a standard path to publication. JM Prestige is designed for authors whose work needs elevated care, strategic positioning, expanded guidance, and a publishing relationship built for more than one release.
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
              Talk with our publishing team ↗
            </a>
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <div className="max-w-[860px] mb-10">
            <SectionLabel>What Makes JM Prestige Different</SectionLabel>
            <p className="text-[15px] font-light leading-[1.8] text-white/60">
              JM Prestige is not a standard publishing offering. It is a selective publishing imprint and a higher-touch publishing relationship. When you publish under JM Prestige, you are not a client purchasing services. You are an author publishing under a house that believes in your work.
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
          <SectionLabel>Who This Path Is For</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-8">
            This path is for authors who are serious about the work, open to guidance, and ready for a more strategic publishing relationship.
          </p>

          <div className="grid gap-3 max-w-[900px]">
            {rightForYou.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white/[0.04] border border-white/8 rounded-3xl px-5 py-4">
                <span className="text-blue-400 mt-0.5">✓</span>
                <span className="text-[15px] font-light leading-[1.7] text-white">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>What The Relationship Includes</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-10">
            The path is built around author outcomes: stronger preparation, elevated presentation, thoughtful release care, and a publishing relationship designed to grow with the work.
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
          <SectionLabel>Investment And Expectations</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-10">
            Prestige publishing requires time, preparation, communication, and clear expectations. The investment reflects the level of guidance, presentation, and care involved. Two paths. One serious commitment.
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

          <p className="text-center text-[12px] text-white/25 mt-6 max-w-[760px] mx-auto leading-[1.7]">
            Annual pricing saves $1,000 (Standard) or $1,500 (Premium) versus monthly. Both options run on Stripe autopay with a 1-year commitment that renews automatically.
          </p>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>What Authors Keep</SectionLabel>
          <div className="max-w-[860px]">
            <p className="text-[15px] font-light leading-[1.8] text-white/60">
              The elevated path does not mean the author disappears. Your name remains at the center of the work. Our role is to help prepare, position, and support the book while honoring the voice, ownership, and legacy behind it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <p className="text-[15px] font-light leading-[1.85] text-white/70">
                Publishing with J Merrill means professional support without losing your voice. We work to preserve the identity of the author, protect the integrity of the message, and help the work reach readers with strength, clarity, and care.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <ul className="flex flex-col gap-4">
                {[
                  'Your name on the front',
                  'Your rights and ownership',
                  'Your voice and message at the center',
                  'Your long-term authorship and future opportunities',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] font-light leading-[1.7] text-white/70">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-center gap-4">
            {trustIndicators.map((indicator) => (
              <div
                key={indicator}
                className="rounded-full border border-white/8 bg-white/[0.04] px-5 py-3 text-[12px] text-white/70 tracking-[0.08em] uppercase text-center"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {indicator}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20 sm:mb-24">
          <SectionLabel>How We Decide Fit</SectionLabel>
          <p className="text-[15px] font-light leading-[1.75] text-white/45 mb-8 max-w-[860px]">
            Because JM Prestige is selective, the first step is not a checkout. It is a conversation about the work, the author’s goals, the manuscript stage, and whether this path is the right home.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <h2
                className="text-white mb-5"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}
              >
                Standard tier — we consider:
              </h2>
              <ul className="flex flex-col gap-3">
                {acceptanceCriteria.standard.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] font-light leading-[1.7] text-white/55">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <h2
                className="text-white mb-5"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}
              >
                Premium tier — additionally:
              </h2>
              <ul className="flex flex-col gap-3">
                {acceptanceCriteria.premium.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] font-light leading-[1.7] text-white/55">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[14px] font-light italic text-white/30 mt-8 max-w-[900px]">
            Applications are reviewed by the Publisher. Acceptance is at Publisher&apos;s discretion. We respond within 3–5 business days.
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
            Ready to see if<br />
            <em className="not-italic italic text-blue-500">JM Prestige is the right fit?</em>
          </h2>

          <p className="text-[15px] font-light leading-[1.75] text-white/40 max-w-[640px] mx-auto">
            Tell us about the work, where the manuscript stands, and what you believe the book is meant to become. We will review the fit and help you understand the next step.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Link
              href="/publishing-partner/apply"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
            >
              Apply for JM Prestige →
            </Link>
            <Link
              href="/packages"
              className="text-[14px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
            >
              Explore Publishing Options →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
