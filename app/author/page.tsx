import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Author Hub | J Merrill Publishing',
  description: 'Private author and staff hub for J Merrill Publishing forms, portal links, Q&A, and author operations.',
  robots: {
    index: false,
    follow: false,
  },
}

const primaryLinks = [
  {
    eyebrow: 'Public front door',
    title: 'Join the Family',
    body: 'The public inquiry form for new authors, manuscript review requests, and first conversations.',
    href: '/join',
    cta: 'Start inquiry',
  },
  {
    eyebrow: 'Private intake',
    title: 'Author Onboarding',
    body: 'Structured author, title, manuscript, rights, design, and marketing foundation intake for approved or invited projects.',
    href: '/author/onboarding',
    cta: 'Open onboarding',
  },
  {
    eyebrow: 'Controlled setup',
    title: 'Financial Setup',
    body: 'Gated payee, tax-document status, payment preference, and secure follow-up routing for active authors.',
    href: '/author/financial-setup',
    cta: 'Open financial setup',
  },
  {
    eyebrow: 'Royalty readiness',
    title: 'Royalty Setup',
    body: 'Gated title coverage, reporting preference, royalty contact, agreement status, and future dashboard readiness.',
    href: '/author/royalty-setup',
    cta: 'Open royalty setup',
  },
]

const resourceLinks = [
  { label: 'Author Portal', body: 'Coming soon: author dashboard, royalty visibility, title status, and documents.', href: '#author-portal', status: 'Future' },
  { label: 'Books Catalog', body: 'Review live title pages, covers, metadata, and purchase-link presentation.', href: '/books', status: 'Live' },
  { label: 'Authors Directory', body: 'Review public author profiles and current author-title relationships.', href: '/authors', status: 'Live' },
  { label: 'Publishing Services', body: 'Reference current publishing categories, packages, and support areas.', href: '/services', status: 'Live' },
  { label: 'Contact Publishing', body: 'Reach the publishing team directly for support, corrections, or routing.', href: '/contact', status: 'Live' },
]

const qaItems = [
  {
    question: 'Which form should a new author use first?',
    answer: 'Use Join the Family first. It stays the public front-door inquiry form before any private onboarding or financial setup is triggered.',
  },
  {
    question: 'When should financial and royalty setup be used?',
    answer: 'Only after a project is active, approved, contracted, or specifically invited by J Merrill Publishing staff.',
  },
  {
    question: 'Can authors enter bank account numbers or SSNs here?',
    answer: 'No. These website forms intentionally avoid direct collection of SSNs, EIN values, routing numbers, and bank account numbers. Secure follow-up should happen through a restricted payment, SharePoint, Dataverse, or processor workflow.',
  },
  {
    question: 'Is this connected to Dataverse now?',
    answer: 'The site is Dataverse-ready through API routes and Power Automate endpoints. Final Dataverse table writes depend on production flow configuration.',
  },
]

export default function AuthorHubPage() {
  return (
    <div className="min-h-screen bg-[#070710] pt-[76px] text-white">
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-20 sm:px-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 72% 70% at 22% 18%, rgba(30,144,255,0.2) 0%, transparent 62%), radial-gradient(ellipse 45% 50% at 82% 8%, rgba(106,90,205,0.18) 0%, transparent 60%)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

        <div className="relative z-10 mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Author + Staff Hub</span>
            </div>
            <h1
              className="max-w-[820px]"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(42px, 6vw, 82px)',
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.035em',
              }}
            >
              One place for author operations.
            </h1>
            <p className="mt-6 max-w-[720px] text-[17px] font-light leading-[1.85] text-white/48">
              A controlled doorway for J Merrill Publishing authors and staff: inquiry, onboarding, financial setup,
              royalty readiness, author portal preparation, and practical Q&A without mixing public lead capture with
              private operational intake.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
            <Image
              src="/logo.jpg"
              alt="J Merrill Publishing"
              width={180}
              height={90}
              className="mb-8 h-auto w-[160px] rounded bg-white p-3"
              priority
            />
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/35">Recommended flow</div>
            <div className="mt-4 space-y-3">
              {['Join form', 'Review + approval', 'Contract + payment', 'Onboarding', 'Financial setup', 'Royalty system ready'].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 font-mono text-[11px] text-blue-300">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[13px] text-white/62">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue-300">Forms + workflow</div>
              <h2
                className="mt-3"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em' }}
              >
                Start in the right lane.
              </h2>
            </div>
            <p className="max-w-[420px] text-[14px] font-light leading-[1.75] text-white/35">
              Public inquiry stays simple. Private onboarding and royalty setup stay gated, structured, and ready for Dataverse.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[32px] border border-white/8 bg-white/[0.04] p-7 transition-all hover:-translate-y-1 hover:border-blue-500/35 hover:bg-white/[0.06]"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">{item.eyebrow}</div>
                <h3
                  className="mt-4"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.1 }}
                >
                  {item.title}
                </h3>
                <p className="mt-4 min-h-[76px] text-[14px] font-light leading-[1.75] text-white/38">{item.body}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-300">
                  {item.cta}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="author-portal" className="border-y border-white/5 bg-white/[0.025] px-6 py-16 sm:px-12">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue-300">Author portal</div>
            <h2
              className="mt-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.08 }}
            >
              Built as a doorway now. Ready for the dashboard next.
            </h2>
            <p className="mt-5 text-[14px] font-light leading-[1.8] text-white/38">
              When the author portal is built, this page can become the entry point for status, royalties, documents,
              title metadata, and support routing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {resourceLinks.map((item) => (
              <Link key={item.label} href={item.href} className="rounded-3xl border border-white/8 bg-black/20 p-6 transition-colors hover:border-blue-500/30">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[16px] font-semibold">{item.label}</h3>
                  <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">{item.status}</span>
                </div>
                <p className="mt-3 text-[13px] font-light leading-[1.7] text-white/35">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue-300">Q&A</div>
            <h2
              className="mt-3"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em' }}
            >
              Author operations, without the fog.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {qaItems.map((item) => (
              <div key={item.question} className="rounded-3xl border border-white/8 bg-white/[0.035] p-6">
                <h3 className="text-[16px] font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-[13px] font-light leading-[1.8] text-white/38">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
