import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Author Hub | J Merrill Publishing',
  description: 'Public entry point for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

const hubCards = [
  {
    status: 'Public',
    title: 'Join the Family',
    body: 'Start a new publishing inquiry and share your manuscript for review.',
    href: '/join',
    cta: 'Start inquiry',
    secondary: 'Public',
  },
  {
    status: 'Secure',
    title: 'Author Workspace',
    body: 'Open your private workspace to continue the next step for your project.',
    href: '/author/portal',
    cta: 'Open workspace',
    secondary: 'Invitation required',
  },
  {
    status: 'Public',
    title: 'Books Catalog',
    body: 'Browse the full JMP catalog. Your title will appear here once it is live in distribution.',
    href: '/books',
    cta: 'Browse titles',
    secondary: 'Public',
  },
] as const

const supportLinks = [
  { label: 'Authors Directory', href: '/authors' },
  { label: 'Publishing Services', href: '/services' },
  { label: 'Contact Publishing', href: '/contact' },
] as const

export default function AuthorHubPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0F1C2E] pt-[76px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20 sm:px-8 sm:py-24 lg:px-12">
        <section className="mx-auto mb-16 max-w-[860px] text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            <span
              className="text-[11px] font-medium uppercase tracking-[0.1em] text-blue-400"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Author Hub
            </span>
          </div>
          <h1
            className="mb-4 text-white"
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
          <p className="text-[16px] font-light leading-[1.75] text-white/45">
            Start here whether you are joining the family or returning to your workspace.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {hubCards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/8 bg-white/[0.04] p-8">
              <p
                className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-blue-400/70"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {card.status}
              </p>
              <h2
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
              >
                {card.title}
              </h2>
              <p className="mb-6 text-[14px] font-light leading-[1.8] text-white/45">{card.body}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-2 border-b border-blue-400/30 pb-px text-[13px] text-blue-400 transition-colors hover:border-blue-400"
                >
                  {card.cta} →
                </Link>
                <span className="text-[12px] text-white/25 sm:self-end">{card.secondary}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-16 rounded-3xl border border-white/8 bg-white/[0.04] p-8 sm:p-10">
          <p
            className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-blue-400/70"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Support Links
          </p>
          <h2
            className="mb-3 text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.15 }}
          >
            Additional publishing routes.
          </h2>
          <p className="mb-6 text-[14px] font-light leading-[1.8] text-white/45">
            These remain available as supporting references while your private workspace handles project-specific next steps.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {supportLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 border-b border-blue-400/30 pb-px text-[13px] text-blue-400 transition-colors hover:border-blue-400"
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
