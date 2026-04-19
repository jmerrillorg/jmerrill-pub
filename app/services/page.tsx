import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { CTASection } from '@/components/content/CTASection'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'
import { ServiceCategorySection } from '@/components/content/ServiceCategorySection'
import { serviceCatalog, serviceInnovationPipeline } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Publishing Services',
  description:
    'Full-spectrum publishing services across editorial, design, AI, marketing, distribution, and author growth infrastructure.',
}

export default function ServicesPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Publishing Services"
        ghost="Services"
        title={
          <>
            Everything your book
            <br />
            <em className="not-italic italic text-blue-500">needs to succeed</em>
          </>
        }
        description="Full-spectrum services across editorial, production, audiobook, AI publishing intelligence, marketing, distribution, and author platform growth. Every service is structured to support a flagship publishing relationship, not a one-time transaction."
        actions={[
          { label: 'Join the Family', href: '/join' },
          { label: 'Schedule a Consultation', href: 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled', external: true },
        ]}
      />

      <div className="border-b border-blue-100 bg-blue-50 px-6 py-5 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] font-light text-blue-900/60">
            Looking for package pricing? Review the three structured publishing tiers and then come back here for deeper capability detail.
          </p>
          <Link href="/publishing" className="text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-800">
            Explore publishing pathways -&gt;
          </Link>
        </div>
      </div>

      <div className="sticky top-[76px] z-40 overflow-x-auto border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur sm:px-12">
        <div className="mx-auto flex max-w-[1280px] gap-4 whitespace-nowrap">
          {serviceCatalog.map((category) => (
            <a
              key={category.anchor}
              href={`#${category.anchor}`}
              className="text-[12px] font-medium tracking-[0.02em] text-gray-400 transition-colors hover:text-blue-500"
            >
              {category.title}
            </a>
          ))}
        </div>
      </div>

      <PageSection
        eyebrow="Capability Catalog"
        title={
          <>
            A data-driven service layer
            <br />
            <em className="not-italic italic text-blue-500">built for growth</em>
          </>
        }
        description="Every category below now comes from a reusable service model so JMP can scale the site, package logic, and future Dataverse content without rewriting the presentation layer."
      >
        {serviceCatalog.map((category) => (
          <ServiceCategorySection key={category.anchor} category={category} />
        ))}
      </PageSection>

      <PageSection
        eyebrow="Innovation Pipeline"
        title={
          <>
            Visible now because the brand
            <br />
            <em className="not-italic italic text-blue-500">is building ahead</em>
          </>
        }
        description="These future service layers are intentionally visible to signal where the flagship platform is heading."
        surface="dark"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {serviceInnovationPipeline.map((item) => (
            <div key={item.name} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-1 text-[13px] font-semibold text-white">{item.name}</div>
              <div className="text-[12px] font-light leading-[1.65] text-white/40">{item.desc}</div>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-400">
                Coming soon
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
              Why this matters
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/50">
              A flagship publisher should not look static. Showing the service roadmap makes it clear
              that J Merrill Publishing is building toward a larger platform: richer author tools,
              deeper analytics, and smarter publishing infrastructure.
            </p>
          </div>
          <NewsletterSignup
            title="Get service and platform updates"
            description="Join the mailing list for new publishing capabilities, author growth tools, and flagship announcements."
          />
        </div>
      </PageSection>

      <CTASection
        eyebrow="Start the Relationship"
        title={
          <>
            Every author project
            <br />
            deserves the right system
          </>
        }
        description="Tell us about your book, your goals, and your timeline. We’ll scope the right services and route you into the strongest publishing path."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Schedule a Consultation', href: 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled', external: true }}
      />
    </div>
  )
}
