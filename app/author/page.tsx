import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Author Hub | J Merrill Publishing',
  description: 'Public entry hub for J Merrill Publishing authors.',
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
    status: 'Secure',
    title: 'Author Workspace',
    body: 'Secure workspace access for invited authors. Project-specific setup, status, files, contracts, and royalty information stay behind this gate.',
    href: '/author/portal',
    cta: 'Open workspace',
    secondary: 'Private access',
  },
  {
    status: 'Live',
    title: 'Books Catalog',
    body: 'Browse the full JMP catalog. Your title will appear here once it is live in distribution.',
    href: '/books',
    cta: 'Browse titles',
    secondary: 'Live',
  },
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
            Start a publishing inquiry, enter your secure Author Workspace, or browse the J Merrill Publishing catalog.
          </p>
        </section>

        <section className="max-w-[980px] mx-auto mb-10">
          <div className="rounded-3xl border border-blue-500/15 bg-blue-500/[0.06] px-6 py-5">
            <p
              className="text-[11px] font-medium tracking-[0.12em] uppercase text-blue-300 mb-4"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Public entry
            </p>
            <p className="mb-4 text-[15px] font-light text-white/65">
              Author- and title-specific material stays inside the secured Author Workspace.
            </p>
            <p className="text-[13px] font-light leading-[1.75] text-white/42">
              Setup, editorial, cover, layout, distribution, marketing, files, contracts, royalty, and project status
              modules require workspace authorization before they render.
            </p>
          </div>
          <p className="mt-4 text-[13px] font-light text-white/35 text-center">
            Questions? Contact publishing@jmerrill.one
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
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

        <div className="my-16 text-center max-w-[860px] mx-auto" id="author-workspace">
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
            <em className="not-italic italic text-blue-500">Private work stays private.</em>
          </h2>
          <p className="text-[15px] font-light text-white/40 leading-[1.75]">
            This public hub does not expose title-specific status, files, contracts, financial setup, royalties, or
            production modules. Those surfaces remain behind secure Author Workspace access.
          </p>
        </div>
      </div>
    </div>
  )
}
