import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { PackageCard } from '@/components/content/PackageCard'
import { CTASection } from '@/components/content/CTASection'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'
import { publishingPackages, serviceCatalog } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Publishing',
  description:
    'Explore the J Merrill Publishing model, package pathways, service architecture, and relationship-driven publishing system.',
}

const publishingPillars = [
  {
    title: 'Relationship-driven by design',
    body: 'JMP is built to feel like a publishing home, not a transactional checkout flow. Every path points back to long-term author growth.',
  },
  {
    title: 'Professional hybrid publishing',
    body: 'Authors keep ownership while gaining professional editorial, design, distribution, and launch infrastructure usually reserved for larger systems.',
  },
  {
    title: 'Prepared for platform scale',
    body: 'The front-end experience now makes room for Dataverse, Dynamics, and future AI-driven publishing workflows without flattening the brand.',
  },
]

export default function PublishingPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Publishing at J Merrill"
        ghost="Publishing"
        title={
          <>
            A flagship publishing model
            <br />
            for <em className="not-italic italic text-blue-500">serious authors</em>
          </>
        }
        description="J Merrill Publishing combines accessible publishing, professional curation, and modern infrastructure in one relationship-driven system. This is where authors understand the path before they enter it."
        actions={[
          { label: 'Join the Family', href: '/join' },
          { label: 'Schedule a Consultation', href: 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled', external: true },
        ]}
      />

      <PageSection
        eyebrow="Core Positioning"
        title={
          <>
            Built for authors who want
            <br />
            <em className="not-italic italic text-blue-500">professional publishing without losing themselves</em>
          </>
        }
        description="This route acts as the publishing overview page for the flagship brand, connecting the why, the how, and the commercial pathways in one premium experience."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {publishingPillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[26px] border border-gray-200 bg-[#F7F8FA] p-7">
              <h3 className="mb-3 text-[24px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                {pillar.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-gray-500">{pillar.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Publishing Packages"
        title={
          <>
            Structured pathways:
            <br />
            <em className="not-italic italic text-blue-500">Starter, Professional, Signature</em>
          </>
        }
        description="These package cards now come from a reusable publishing model that can support both the homepage and future Dataverse-driven pricing or package logic."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {publishingPackages.map((pkg) => (
            <PackageCard key={pkg.sku} pkg={pkg} dark />
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Publishing System"
        title={
          <>
            The service layers behind
            <br />
            <em className="not-italic italic text-blue-500">every successful title</em>
          </>
        }
        description="Packages are the entry points. These capability areas are what allow the flagship brand to support authors across the full publishing lifecycle."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceCatalog.slice(0, 4).map((category) => (
            <div key={category.anchor} className="rounded-[24px] border border-gray-200 bg-white p-6">
              <div className="mb-3 text-[24px]">{category.icon}</div>
              <h3 className="mb-2 text-[22px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                {category.title}
              </h3>
              <p className="text-[13px] font-light leading-[1.75] text-gray-500">{category.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
              Future-ready architecture
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-gray-500">
              The publishing route is intentionally distinct from services, books, and join. That gives
              the flagship site a proper decision page for prospective authors and a clean destination
              for future package, workflow, and CRM integrations.
            </p>
          </div>
          <NewsletterSignup
            surface="light"
            title="Get publishing updates"
            description="Stay close to new package updates, publishing insights, and platform announcements from J Merrill Publishing."
          />
        </div>
      </PageSection>

      <CTASection
        eyebrow="Next Step"
        title={
          <>
            When you’re ready,
            <br />
            join the family
          </>
        }
        description="Tell us about your manuscript, your goals, and your timeline. We’ll route you into the strongest publishing path for your book and your long-term growth."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Browse services', href: '/services' }}
      />
    </div>
  )
}
