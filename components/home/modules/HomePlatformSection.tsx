import Link from 'next/link'
import { platformRoadmap } from '@/lib/site-architecture'

export function HomePlatformSection() {
  return (
    <section className="relative overflow-hidden bg-[#07111F] px-6 py-[120px] sm:px-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 40%, rgba(30,144,255,0.08) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="mb-16 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">
                Dataverse + Dynamics Future State
              </span>
            </div>
            <h2
              className="text-white"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(36px,4vw,56px)',
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
              }}
            >
              Publishing content,
              <br />
              <em className="not-italic italic text-blue-500">run like a platform</em>
            </h2>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
              Strategic direction
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/55">
              The next phase of JMP is not just better web content. It is a governed operating layer
              for author lifecycle data, onboarding workflows, catalog intelligence, and AI-assisted
              publishing decisions backed by Microsoft infrastructure.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {platformRoadmap.map((module) => (
            <div
              key={module.name}
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-7 transition-all duration-300 hover:border-blue-500/30 hover:bg-blue-500/[0.06]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
                  {module.phase}
                </span>
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <h3 className="mb-3 text-[22px] text-white" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {module.name}
              </h3>
              <p className="mb-5 text-[14px] font-light leading-[1.75] text-white/45">
                {module.description}
              </p>
              <div className="border-t border-white/8 pt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/20">
                  Outcome
                </div>
                <p className="text-[13px] font-light leading-[1.7] text-white/35">{module.outcome}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-[13px] text-white/45 transition-all hover:border-blue-500/40 hover:text-blue-400"
          >
            Explore the platform roadmap -&gt;
          </Link>
        </div>
      </div>
    </section>
  )
}
