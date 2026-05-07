import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Author Hub | J Merrill Publishing',
  description: 'Private author and staff hub for J Merrill Publishing forms, portal links, Q&A, and author operations.',
  robots: {
    index: false,
    follow: false,
  },
}

const hubCards = [
  {
    status: 'Live',
    title: 'Join the Family',
    body: 'The public inquiry form for new authors, manuscript review requests, and first conversations.',
    href: '/join',
    cta: 'Start inquiry',
    secondary: 'Private intake',
  },
  {
    status: 'Controlled',
    title: 'Author Onboarding',
    body: 'Structured author, title, manuscript, rights, design, and marketing foundation intake for approved or invited projects.',
    href: '/author/onboarding',
    cta: 'Open onboarding',
    secondary: 'Controlled setup',
  },
  {
    status: 'Controlled',
    title: 'Financial Setup',
    body: 'Gated payee, tax-document status, payment preference, and secure follow-up routing for active authors.',
    href: '/author/financial-setup',
    cta: 'Open financial setup',
    secondary: 'Royalty readiness',
  },
  {
    status: 'Controlled',
    title: 'Royalty Setup',
    body: 'Gated title coverage, reporting preference, royalty contact, agreement status, and future dashboard readiness.',
    href: '/author/royalty-setup',
    cta: 'Open royalty setup',
    secondary: 'Author portal',
  },
  {
    status: 'Future',
    title: 'Author Portal',
    body: 'Coming soon: author dashboard, royalty visibility, title status, and documents.',
    href: '#author-portal',
    cta: 'Portal roadmap',
    secondary: 'Future',
  },
  {
    status: 'Live',
    title: 'Books Catalog',
    body: 'Review live title pages, covers, metadata, and purchase-link presentation.',
    href: '/books',
    cta: 'Browse titles',
    secondary: 'Live',
  },
] as const

const supportLinks = [
  { label: 'Authors Directory', href: '/authors' },
  { label: 'Publishing Services', href: '/services' },
  { label: 'Contact Publishing', href: '/contact' },
] as const

export default function AuthorHubPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E] relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 py-20 sm:py-24">
        <section className="text-center max-w-[860px] mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span
              className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Author Hub
            </span>
          </div>
          <h1
            className="text-white mb-4"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px,5vw,60px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Your publishing
            <br />
            <em className="not-italic italic text-blue-500">home base.</em>
          </h1>
          <p className="text-[16px] font-light text-white/45 leading-[1.75]">
            Everything related to your book, your royalties, and your journey with J Merrill Publishing.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {hubCards.map((card) => (
            <div key={card.title} className="bg-white/[0.04] border border-white/8 rounded-3xl p-8">
              <p
                className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-400/70 mb-2"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {card.status}
              </p>
              <h2
                className="text-white mb-3"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
              >
                {card.title}
              </h2>
              <p className="text-[14px] font-light leading-[1.8] text-white/45 mb-6">{card.body}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-2 text-[13px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
                >
                  {card.cta} →
                </Link>
                <span className="text-[12px] text-white/25 sm:self-end">{card.secondary}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-16 text-center max-w-[860px] mx-auto" id="author-portal">
          <h2
            className="text-white mb-4"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(28px,4vw,44px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Built as a doorway now.
            <br />
            <em className="not-italic italic text-blue-500">Ready for the dashboard next.</em>
          </h2>
          <p className="text-[15px] font-light text-white/40 leading-[1.75]">
            When the author portal is built, this page can become the entry point for status, royalties, documents,
            title metadata, and support routing.
          </p>
        </div>

        <section className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 sm:p-10">
          <p
            className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-400/70 mb-2"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Support Links
          </p>
          <h2
            className="text-white mb-3"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
          >
            Additional publishing routes.
          </h2>
          <p className="text-[14px] font-light leading-[1.8] text-white/45 mb-6">
            These stay available as supporting references while the author dashboard and operational routing continue to mature.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {supportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 text-[13px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
