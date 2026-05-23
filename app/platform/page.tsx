import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { platformRoadmap } from '@/lib/site-architecture'

export const metadata: Metadata = {
  title: 'Platform — Behind the Publishing Experience | J Merrill Publishing',
  description:
    'A behind-the-scenes view of the J Merrill Publishing platform spanning Dataverse, Dynamics, Power BI, and governed AI operations for strategic readers who want the deeper system story.',
}

const promises = [
  'Structured author, title, package, imprint, and lifecycle records that make publishing follow-through more organized.',
  'Dynamics-driven inquiry routing and onboarding orchestration that support clearer next steps and stronger author follow-up.',
  'Dashboard-ready reporting for team operations, executive oversight, and future author visibility where appropriate.',
  'Governed AI assistance that improves speed and insight without weakening human editorial judgment or replacing the relationship.',
]

export default function PlatformPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Behind The Scenes"
        ghost="Platform"
        title={
          <>
            The system behind
            <br />
            the <em className="not-italic italic text-blue-500">publishing experience</em>
          </>
        }
        description="Most authors do not need to understand the infrastructure behind J Merrill Publishing to trust the process. This page is for partners, stakeholders, advanced authors, and strategic readers who want to see how our publishing work is supported by data, automation, governance, and future-ready systems."
        actions={[
          { label: 'Return to the Author Journey', href: '/author-journey' },
          { label: 'Publish With Us', href: '/publishing' },
        ]}
      />

      <PageSection
        eyebrow="Who This Page Is For"
        title={
          <>
            For readers who want
            <br />
            <em className="not-italic italic text-blue-500">the behind-the-scenes view</em>
          </>
        }
        description="This page exists for strategic partners, enterprise stakeholders, advanced authors who want to understand the system, collaborators evaluating operational maturity, and internal JM1 alignment. First-time authors do not need to understand the platform to publish with us."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            'Strategic partners and stakeholders evaluating publishing infrastructure',
            'Advanced authors who want to understand the system supporting the experience',
            'Collaborators reviewing operational maturity, governance, and future-readiness',
            'Internal JM1 alignment around how publishing operations are being organized',
          ].map((item) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <p className="text-[15px] font-light leading-[1.8] text-gray-600">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Why The Infrastructure Matters"
        title={
          <>
            The technology is not
            <br />
            <em className="not-italic italic text-blue-500">the promise</em>
          </>
        }
        description="The promise to authors is care, clarity, professional guidance, rights respect, and long-term support. The infrastructure exists so those promises can be organized, tracked, improved, and delivered more consistently."
        surface="dark"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {promises.map((promise) => (
            <div
              key={promise}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] px-6 py-5 text-[14px] font-light leading-[1.75] text-white/50"
            >
              {promise}
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="JM1 Publishing Platform"
        title={
          <>
            Four implementation phases.
            <br />
            <em className="not-italic italic text-blue-500">One operating direction.</em>
          </>
        }
        description="These are the platform modules supporting the long-term publishing operation: Dataverse, Dynamics, Power BI, governed AI operations, execution logging, and the author/title lifecycle records needed for durable follow-through."
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
        eyebrow="How This Supports Authors"
        title={
          <>
            The system exists to support
            <br />
            <em className="not-italic italic text-blue-500">the human experience</em>
          </>
        }
        description="Organized records, clearer workflows, better reporting, more consistent onboarding, and governed AI assistance all matter because they make the author experience more dependable over time."
        surface="dark"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {[
            'Organized author and title records that reduce confusion and help the team follow through.',
            'Clearer workflows for inquiries, onboarding, reporting, and post-publication support.',
            'Stronger follow-up and visibility across the author relationship lifecycle.',
            'More consistent onboarding and long-term support as the catalog grows.',
          ].map((promise) => (
            <div
              key={promise}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] px-6 py-5 text-[14px] font-light leading-[1.75] text-white/50"
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
              Return To The Author Journey
            </div>
            <p className="text-[16px] font-light leading-[1.8] text-gray-500">
              The platform explains how the work is supported behind the scenes. If you are ready to
              talk about your book, start with the author journey or publishing page. The technology
              should support the process, not stand in front of it.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/author-journey"
              className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600"
            >
              See the Author Journey
            </Link>
            <Link
              href="/join"
              className="rounded-full border border-gray-300 px-8 py-3.5 text-[14px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500"
            >
              Tell Us About Your Book
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
