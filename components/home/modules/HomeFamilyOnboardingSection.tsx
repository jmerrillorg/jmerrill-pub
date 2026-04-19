import Link from 'next/link'
import { authorJourneyMilestones } from '@/lib/site-architecture'

export function HomeFamilyOnboardingSection() {
  return (
    <section className="bg-[#0D0D10] px-6 py-[120px] sm:px-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-16 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">
                Join the Family Onboarding
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
              Premium onboarding for
              <br />
              <em className="not-italic italic text-blue-500">serious authors</em>
            </h2>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
              Why this matters
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/55">
              The inquiry process should feel like the first chapter of the author relationship. We
              frame package fit, consultation, manuscript readiness, and long-term opportunity as one
              guided system so authors never feel dropped into a generic funnel.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {authorJourneyMilestones.map((milestone) => (
            <Link
              key={milestone.step}
              href={milestone.destination}
              className="group flex h-full flex-col rounded-[24px] border border-white/8 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-blue-500/[0.07]"
            >
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/20">
                Step {milestone.step}
              </div>
              <h3 className="mb-3 text-[22px] text-white" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {milestone.title}
              </h3>
              <p className="flex-1 text-[14px] font-light leading-[1.75] text-white/45">
                {milestone.description}
              </p>
              <span className="mt-6 text-[13px] font-medium text-blue-400 transition-transform duration-200 group-hover:translate-x-1">
                Continue the journey -&gt;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
