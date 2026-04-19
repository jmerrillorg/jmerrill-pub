import Link from 'next/link'
import { flagshipExperiencePages, relationshipPages } from '@/lib/site-architecture'

function ArchitectureCard({
  title,
  eyebrow,
  description,
  audience,
  href,
  ctaLabel,
  status,
}: {
  title: string
  eyebrow: string
  description: string
  audience: string
  href: string
  ctaLabel: string
  status: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-[28px] border border-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_50px_rgba(8,35,71,0.08)]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">{eyebrow}</span>
        <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-blue-700">
          {status}
        </span>
      </div>
      <h3 className="mb-3 text-[24px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif" }}>
        {title}
      </h3>
      <p className="text-[14px] font-light leading-[1.75] text-gray-500">{description}</p>
      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-300">
          Primary audience
        </div>
        <p className="text-[13px] font-light leading-[1.7] text-gray-400">{audience}</p>
      </div>
      <span className="mt-6 text-[13px] font-medium text-blue-500 transition-transform duration-200 group-hover:translate-x-1">
        {ctaLabel} -&gt;
      </span>
    </Link>
  )
}

export function HomeArchitectureSection() {
  return (
    <section className="bg-[#F7F8FA] px-6 py-[120px] sm:px-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-16 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-500">
                Multi-Page Flagship Architecture
              </span>
            </div>
            <h2
              className="text-charcoal"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(36px,4vw,56px)',
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
              }}
            >
              One flagship site.
              <br />
              <em className="not-italic italic text-blue-500">Distinct pathways for every decision.</em>
            </h2>
          </div>
          <p className="max-w-[540px] text-[16px] font-light leading-[1.85] text-gray-500">
            The homepage should introduce the entire publishing system, not carry the whole burden
            alone. This architecture gives authors, readers, partners, and future platform teams a
            clear route into the right part of the JMP experience.
          </p>
        </div>

        <div className="mb-14">
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
            Core experience pages
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {flagshipExperiencePages.map((page) => (
              <ArchitectureCard key={page.title} {...page} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
            Relationship and platform pages
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {relationshipPages.map((page) => (
              <ArchitectureCard key={page.title} {...page} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
