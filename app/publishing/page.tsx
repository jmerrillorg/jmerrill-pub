import type { Metadata } from 'next'
import Link from 'next/link'
import { CTASection } from '@/components/content/CTASection'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { publishingPackages } from '@/lib/marketing-content'

export const metadata: Metadata = {
  title: 'Publishing',
  description:
    'Publishing with J Merrill Publishing means professional guidance, retained rights, and a clear path from manuscript to marketplace.',
}

const bookingUrl = 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled'

const trustPillars = [
  {
    title: 'You keep your name and ownership at the center',
    body: 'We help you publish professionally without asking you to surrender the heart of your story, your message, or your long-term authorship.',
  },
  {
    title: 'You are not left to manage the process alone',
    body: 'We guide you through editorial decisions, design choices, production steps, and release preparation with a human publishing relationship.',
  },
  {
    title: 'Your book is prepared for readers and the marketplace',
    body: 'We help shape the manuscript, presentation, and metadata so the work is ready to meet readers with professionalism and care.',
  },
  {
    title: 'The relationship can continue beyond one release',
    body: 'One title may begin the journey, but our goal is to support the author, the message, and the future opportunities that follow.',
  },
]

const relationshipPillars = [
  {
    title: 'Discernment before production',
    body: 'We start by understanding what you are writing, why it matters, who it is for, and what level of support the work truly needs.',
  },
  {
    title: 'Editorial and design guidance',
    body: 'Your manuscript, cover, and interior are shaped with professional input so the final book feels worthy of the work behind it.',
  },
  {
    title: 'Professional distribution setup',
    body: 'We prepare the files, metadata, and publishing details needed for a professional release into the marketplace.',
  },
  {
    title: 'Launch and visibility support',
    body: 'We help you think through launch timing, release presentation, and the first steps of getting the book in front of readers.',
  },
  {
    title: 'Long-term author care',
    body: 'Publishing with JMP is built to support future titles, future growth, and the ongoing life of your work beyond one moment of release.',
  },
]

const outcomes = [
  'A stronger manuscript',
  'A professional cover and interior',
  'Marketplace-ready files and metadata',
  "Distribution access through Ingram's retail and library network",
  'Launch and author-platform support',
  'A long-term publishing relationship',
]

const publishingPath = [
  {
    step: '01',
    title: 'Tell us about your book',
    body: 'Share where you are in the journey, what you are writing, and what kind of help you believe the work needs.',
  },
  {
    step: '02',
    title: 'Match the right publishing path',
    body: 'We help determine the level of editorial, design, production, and release support that best fits the manuscript and your goals.',
  },
  {
    step: '03',
    title: 'Prepare the manuscript',
    body: 'The work moves through the right editorial and refinement process so the book is strong before it reaches production.',
  },
  {
    step: '04',
    title: 'Design and produce the book',
    body: 'Cover design, interior layout, formatting, and production details come together in a way that respects the work and the reader.',
  },
  {
    step: '05',
    title: 'Publish and distribute',
    body: 'We prepare the ISBN, metadata, files, and release setup so your title can enter the marketplace professionally.',
  },
  {
    step: '06',
    title: 'Grow beyond launch',
    body: 'After release, we help you think about visibility, next steps, future titles, and how the publishing relationship can continue.',
  },
]

const packageCopy: Record<
  string,
  {
    summary: string
    bullets: string[]
    ctaLabel: string
    href: string
    badge?: string
  }
> = {
  Starter: {
    summary: 'For authors ready for a focused professional publishing path with clear guidance, strong presentation, and a confident release foundation.',
    bullets: [
      'Focused editorial and production support',
      'Professional presentation for a first or early title',
      'A clear path from manuscript to marketplace',
    ],
    ctaLabel: 'Explore Starter',
    href: '/packages',
  },
  Professional: {
    summary: 'For authors who need deeper editorial, design, and launch support to bring a more developed manuscript into the world professionally.',
    bullets: [
      'Expanded editorial and design guidance',
      'Stronger release preparation and support',
      'Built for authors seeking a more developed publishing path',
    ],
    ctaLabel: 'Explore Professional',
    href: '/packages',
    badge: 'Most Popular',
  },
  Premier: {
    summary: 'A larger-scope path for works that need expanded editorial care, production planning, or a more complex publishing journey without losing the author at the center.',
    bullets: [
      'Extended editorial and production planning',
      'Expanded guidance across the publishing path',
      'Support for books that need more than a standard full-service release',
    ],
    ctaLabel: 'Explore Premier',
    href: '/join',
  },
}

const authorKeeps = [
  'Your name on the front',
  'Your rights and ownership',
  'Your voice and message at the center',
  'Your long-term authorship and future opportunities',
]

export default function PublishingPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Publishing With J Merrill"
        ghost="Publishing"
        title={
          <>
            Publishing that honors the work
            <br />
            <em className="not-italic italic text-blue-500">and the author behind it.</em>
          </>
        }
        description="You wrote something that matters. J Merrill Publishing helps you bring it into the world with professional editing, design, distribution, and guidance while your name, your rights, and your legacy stay at the center."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'Explore Publishing Options', href: '#publishing-options' },
        ]}
      />

      <PageSection
        eyebrow="Why Publishing With JMP Is Different"
        title={
          <>
            Authors should not have to choose
            <br />
            <em className="not-italic italic text-blue-500">between professional standards and ownership.</em>
          </>
        }
        description="Traditional major publishing often makes authors feel they must choose between being taken seriously and keeping ownership of their work. J Merrill Publishing exists to challenge that tradeoff with structure, care, and guidance that respects the author's voice."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {trustPillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
              <h3
                className="mb-3 text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.12 }}
              >
                {pillar.title}
              </h3>
              <p className="text-[15px] font-light leading-[1.85] text-gray-500">{pillar.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {[
            '125+ titles',
            'Five official imprints',
            "Global distribution through Ingram's retail and library network",
            'Registered publisher',
          ].map((proof) => (
            <div key={proof} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] text-blue-700">
              {proof}
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="The Publishing Relationship"
        title={
          <>
            A guided relationship
            <br />
            <em className="not-italic italic text-blue-500">from manuscript to marketplace.</em>
          </>
        }
        description="Publishing with JMP is not a file upload and it is not a cold production queue. We learn what you are writing, why it matters, who it is meant to reach, and what kind of support the book needs. Then we help guide the work through the right editorial, design, production, and distribution path."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          {relationshipPillars.map((pillar) => (
            <div key={pillar.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.16 }}
              >
                {pillar.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-white/70">{pillar.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="What We Help You Build"
        title={
          <>
            More than a book file.
            <br />
            <em className="not-italic italic text-blue-500">A professional publishing foundation.</em>
          </>
        }
        description="We help authors build the pieces that make a book stronger, more publishable, and more ready to meet readers with confidence."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {outcomes.map((outcome) => (
            <div key={outcome} className="rounded-[24px] border border-gray-200 bg-white p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <h3
                className="text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700, lineHeight: 1.18 }}
              >
                {outcome}
              </h3>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="How The Publishing Path Works"
        title={
          <>
            Clear steps.
            <br />
            <em className="not-italic italic text-blue-500">Guided all the way through.</em>
          </>
        }
        description="Publishing should not feel confusing. We walk with you through a clear path from first conversation to finished book and beyond launch."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publishingPath.map((item) => (
            <div key={item.step} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-7">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-blue-400">{item.step}</div>
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.12 }}
              >
                {item.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-white/70">{item.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <div id="publishing-options">
        <PageSection
          eyebrow="Publishing Options"
          title={
            <>
              Publishing options
              <br />
              <em className="not-italic italic text-blue-500">for serious authors.</em>
            </>
          }
          description="Every book does not need the same level of support. Our publishing paths are designed to match the manuscript, the author's goals, and the level of guidance needed to bring the work into the world professionally."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {publishingPackages.map((pkg) => {
              const details = packageCopy[pkg.tier]

              return (
                <div
                  key={pkg.sku}
                  className={`relative flex h-full flex-col rounded-[28px] border p-8 ${
                    pkg.featured ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {details.badge && (
                    <div className="absolute right-6 top-6 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      {details.badge}
                    </div>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">{pkg.sku}</div>
                  <h3
                    className="mt-4 text-charcoal"
                    style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }}
                  >
                    {pkg.tier}
                  </h3>
                  <div className="mt-2 text-[44px] font-bold leading-none text-charcoal">
                    ${pkg.price.toLocaleString()}
                  </div>
                  <p className="mt-1 text-[12px] text-gray-400">{pkg.editionSlots} edition slots</p>
                  <p className="mt-5 text-[14px] font-light leading-[1.8] text-gray-500">{details.summary}</p>
                  <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-gray-100 pt-6">
                    {details.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-[13px] font-light leading-[1.6] text-gray-500">
                        <span className="mt-0.5 text-blue-500">✓</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex gap-3">
                    <Link
                      href={details.href}
                      className="rounded-full bg-charcoal px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                      {details.ctaLabel}
                    </Link>
                    <Link
                      href="/packages"
                      className="rounded-full border border-gray-200 px-5 py-3 text-[13px] text-gray-500 transition-all hover:border-blue-500 hover:text-blue-500"
                    >
                      Full details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </PageSection>
      </div>

      <PageSection
        eyebrow="What Authors Keep"
        title={
          <>
            Your name belongs on the front.
            <br />
            <em className="not-italic italic text-blue-500">Your rights stay with you.</em>
          </>
        }
        description="Your book carries your name, your story, your message, and your legacy. Our role is to help strengthen, prepare, publish, and support the work, not take it away from you."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-[16px] font-light leading-[1.9] text-white/70">
              Publishing with J Merrill means professional support without losing your voice. We work to preserve the identity of the author, protect the integrity of the message, and help the work reach readers with strength, clarity, and care.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <ul className="flex flex-col gap-4">
              {authorKeeps.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-white/80">
                  <span className="mt-0.5 text-blue-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>

      <CTASection
        eyebrow="Ready When You Are"
        title={
          <>
            Ready to talk
            <br />
            about <em className="not-italic italic text-blue-500">your book?</em>
          </>
        }
        description="Tell us where you are in the journey: idea, manuscript, edited draft, or ready-to-publish work. We will help you understand the right next step."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Talk With Our Publishing Team', href: bookingUrl, external: true }}
      />
    </div>
  )
}
