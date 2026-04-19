import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { authorJourneyMilestones } from '@/lib/site-architecture'

export const metadata: Metadata = {
  title: 'Author Journey',
  description:
    'Follow the full J Merrill Publishing author experience from discovery and onboarding through launch, growth, and long-term catalog development.',
}

const checkpoints = [
  {
    label: 'Discovery',
    title: 'Start with clarity',
    body:
      'Authors should understand the path before they commit. We orient package fit, publishing readiness, and service scope before a project is sold.',
  },
  {
    label: 'Onboarding',
    title: 'Join the Family',
    body:
      'Inquiry, consultation, and evaluation create the first real relationship moment. The goal is trust, not friction.',
  },
  {
    label: 'Production',
    title: 'Move through one operating system',
    body:
      'Editorial, design, distribution, and launch are sequenced as one connected publishing engine with real human guidance.',
  },
  {
    label: 'Growth',
    title: 'Turn one book into an author career',
    body:
      'Memberships, partner tiers, and future dashboards support the author after release instead of ending the relationship at publication.',
  },
]

export default function AuthorJourneyPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="The Author Journey"
        ghost="Journey"
        title={
          <>
            A publishing experience
            <br />
            built to <em className="not-italic italic text-blue-500">guide, not confuse</em>
          </>
        }
        description="This is the full author pathway behind J Merrill Publishing. Every page, package, service, and onboarding touchpoint should reinforce a confident journey from first inquiry to long-term catalog growth."
        actions={[
          { label: 'Join the Family', href: '/join' },
          { label: 'Compare Packages', href: '/packages' },
        ]}
      />

      <PageSection
        eyebrow="Journey Architecture"
        title={
          <>
            Four stages.
            <br />
            <em className="not-italic italic text-blue-500">One relationship.</em>
          </>
        }
        description="The flagship site now treats the author relationship like a structured progression instead of a collection of disconnected marketing pages."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.label}
              className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7"
            >
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
                {checkpoint.label}
              </div>
              <h3 className="mb-3 text-[24px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {checkpoint.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.75] text-gray-500">{checkpoint.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Route-by-Route"
        title={
          <>
            The site now mirrors
            <br />
            <em className="not-italic italic text-blue-500">the actual author lifecycle</em>
          </>
        }
        description="Each step of the journey points to a page that carries the next conversation forward."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {authorJourneyMilestones.map((milestone) => (
            <Link
              key={milestone.step}
              href={milestone.destination}
              className="group rounded-[28px] border border-white/8 bg-white/[0.03] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 font-mono text-[12px] text-blue-400">
                  {milestone.step}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/20">
                  Author lifecycle step
                </div>
              </div>
              <h3 className="mb-3 text-[26px] text-white" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {milestone.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.75] text-white/45">
                {milestone.description}
              </p>
              <span className="mt-6 inline-flex text-[13px] font-medium text-blue-400 transition-transform duration-200 group-hover:translate-x-1">
                Open destination -&gt;
              </span>
            </Link>
          ))}
        </div>
      </PageSection>

      <section className="bg-charcoal px-6 py-20 text-center sm:px-12">
        <div className="mx-auto max-w-[760px]">
          <h2
            className="mb-4 text-white"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(34px,4vw,56px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to begin
            <br />
            <em className="not-italic italic text-blue-500">the right way?</em>
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-[16px] leading-[1.75] text-white/45">
            Start with the flagship onboarding experience and we will route you to the right package,
            service mix, and next step.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/join"
              className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600"
            >
              Join the Family -&gt;
            </Link>
            <Link
              href="/packages"
              className="rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400"
            >
              Review package tiers
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
