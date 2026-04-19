import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { platformRoadmap } from '@/lib/site-architecture'

export const metadata: Metadata = {
  title: 'Platform Roadmap',
  description:
    'A strategic view of the future J Merrill Publishing platform spanning Dataverse, Dynamics, Power BI, and AI-driven publishing operations.',
}

const promises = [
  'Structured content and relationship data across authors, titles, packages, imprints, and lifecycle milestones.',
  'Dynamics-driven inquiry routing and onboarding orchestration for a higher-touch front-end experience.',
  'Dashboard-ready catalog intelligence for team operations, executive oversight, and future author reporting.',
  'Governed AI assistance that improves speed and insight without weakening human editorial judgment.',
]

export default function PlatformPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Enterprise Roadmap"
        ghost="Platform"
        title={
          <>
            The future publishing stack
            <br />
            for <em className="not-italic italic text-blue-500">J Merrill Publishing</em>
          </>
        }
        description="The flagship website is only the visible layer. The next platform phase connects web content to Dataverse records, Dynamics workflows, BI reporting, and governed AI agents so the publishing experience can scale without losing polish."
        actions={[
          { label: 'Return to Home', href: '/' },
          { label: 'Join the Family', href: '/join' },
        ]}
      />

      <PageSection
        eyebrow="Roadmap Modules"
        title={
          <>
            Four implementation phases.
            <br />
            <em className="not-italic italic text-blue-500">One operating direction.</em>
          </>
        }
        description="These are the architectural modules the web experience is being prepared to support."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {platformRoadmap.map((module) => (
            <div key={module.name} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
                  {module.phase}
                </span>
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <h3 className="mb-3 text-[22px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {module.name}
              </h3>
              <p className="mb-5 text-[14px] font-light leading-[1.75] text-gray-500">
                {module.description}
              </p>
              <div className="border-t border-gray-200 pt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-300">
                  Outcome
                </div>
                <p className="text-[13px] font-light leading-[1.7] text-gray-400">{module.outcome}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="What the site must support"
        title={
          <>
            The web layer is now prepared
            <br />
            <em className="not-italic italic text-blue-500">for deeper systems integration</em>
          </>
        }
        description="This architecture makes room for content, forms, and journeys that can later be powered by enterprise systems instead of static assumptions."
        surface="dark"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {promises.map((promise) => (
            <div
              key={promise}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] px-6 py-5 text-[14px] font-light leading-[1.75] text-white/45"
            >
              {promise}
            </div>
          ))}
        </div>
      </PageSection>

      <section className="bg-white px-6 py-20 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[660px]">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
              Next build implication
            </div>
            <p className="text-[16px] font-light leading-[1.8] text-gray-500">
              The homepage and route architecture now have dedicated places for catalog, onboarding,
              platform, and relationship content. That gives the future data layer somewhere clean to
              land when live integrations begin.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/author-journey"
              className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600"
            >
              See the author journey
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-gray-300 px-8 py-3.5 text-[14px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500"
            >
              Review live capabilities
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
