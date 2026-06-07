import type { Metadata } from 'next'
import Link from 'next/link'
import { CTASection } from '@/components/content/CTASection'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { serviceCatalog } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Publishing Support for Every Stage of the Book | J Merrill Publishing',
  description:
    'Explore author-first publishing support for manuscript care, design, production, distribution preparation, launch planning, and long-term growth.',
}

const bookingUrl = 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled'

type ServiceCard = {
  name: string
  desc: string
}

type PageServiceCategory = {
  num: string
  icon: string
  title: string
  anchor: string
  description: string
  services: readonly ServiceCard[]
}

const fitIndicators = [
  'Manuscript readiness',
  'Genre and format',
  'Editorial needs',
  'Design complexity',
  'Distribution goals',
  'Launch and visibility needs',
  'Long-term author plans',
]

const serviceAreaOverview = [
  {
    title: 'Editorial Support',
    body: 'Strengthening the manuscript while preserving the author’s voice.',
  },
  {
    title: 'Design & Production',
    body: 'Creating a professional cover, interior, and book files ready for publication.',
  },
  {
    title: 'Distribution Preparation',
    body: 'Preparing the book’s metadata, formats, and files for marketplace access.',
  },
  {
    title: 'Marketing & Launch Support',
    body: 'Helping authors think through visibility, readers, messaging, and launch assets.',
  },
  {
    title: 'Audiobook & Expanded Formats',
    body: 'Supporting books that need audio, hardcover, large print, or other formats.',
  },
  {
    title: 'Author Platform Support',
    body: 'Helping authors think beyond one book into audience, visibility, and long-term growth.',
  },
  {
    title: 'Faith, Ministry, and Specialty Publishing Support',
    body: 'Supporting books with faith, ministry, legacy, or community impact.',
  },
]

const categoryOverrides: Record<string, { title?: string; description: string }> = {
  editorial: {
    title: 'Editorial Support',
    description: 'Strengthen the manuscript with professional editorial care that protects the author’s voice while making the work clearer, stronger, and more ready for readers.',
  },
  design: {
    title: 'Design & Production',
    description: 'Prepare the book with professional cover design, interior layout, and production files that feel worthy of the message and ready for publication.',
  },
  audio: {
    title: 'Audiobook & Expanded Formats',
    description: 'Support books that need audio, premium formats, or additional reader-access pathways beyond the standard print-and-eBook release.',
  },
  ai: {
    title: 'Publishing Guidance & Planning Support',
    description: 'Use guided analysis, positioning support, and launch-planning tools to help the book move forward with stronger clarity and decision-making.',
  },
  marketing: {
    title: 'Marketing & Launch Support',
    description: 'Help authors think through visibility, launch timing, messaging, and the practical steps needed to introduce the book well.',
  },
  platform: {
    title: 'Author Platform Support',
    description: 'Support authors who need to strengthen visibility, audience connection, and long-term growth beyond a single release.',
  },
  childrens: {
    title: "Children's Publishing",
    description: 'Support illustrated, youth, and family-centered books with the specialized design, production, and publishing care they require.',
  },
  faith: {
    title: 'Faith, Ministry, and Specialty Publishing Support',
    description: 'Support books shaped for ministry, legacy, curriculum, church distribution, and community impact with publishing care that understands the audience.',
  },
  distribution: {
    title: 'Distribution Preparation',
    description: 'Prepare the book’s metadata, files, and format setup so it can move into the marketplace with professional distribution support.',
  },
  education: {
    title: 'Author Education & Community Support',
    description: 'Give authors added coaching, publishing education, and strategic support when the work calls for more than production alone.',
  },
  ghostwriting: {
    title: 'Ghostwriting Support',
    description: 'Help shape the manuscript when the story, message, ministry, or expertise is clear but the finished book still needs to be written.',
  },
}

const beforePublishingAnchors = ['editorial', 'ghostwriting', 'education'] as const
const duringProductionAnchors = ['design', 'distribution', 'audio', 'childrens', 'faith'] as const
const afterLaunchAnchors = ['marketing', 'platform', 'ai'] as const

const pageServiceCatalog: PageServiceCategory[] = serviceCatalog.map((category) => {
  const override = categoryOverrides[category.anchor]
  return {
    ...category,
    title: override?.title || category.title,
    description: override?.description || category.description,
  }
})

const catalogByAnchor = new Map(pageServiceCatalog.map((category) => [category.anchor, category] as const))
const isPageServiceCategory = (category: PageServiceCategory | undefined): category is PageServiceCategory => Boolean(category)

const beforePublishing: PageServiceCategory[] = beforePublishingAnchors
  .map((anchor) => catalogByAnchor.get(anchor))
  .filter(isPageServiceCategory)

const duringProduction: PageServiceCategory[] = duringProductionAnchors
  .map((anchor) => catalogByAnchor.get(anchor))
  .filter(isPageServiceCategory)

const afterLaunch: PageServiceCategory[] = afterLaunchAnchors
  .map((anchor) => catalogByAnchor.get(anchor))
  .filter(isPageServiceCategory)

const stickyNavCatalog = [
  ...beforePublishing,
  ...duringProduction,
  ...afterLaunch,
]

function LightServiceCategorySection({ category }: { category: PageServiceCategory }) {
  return (
    <section id={category.anchor} className="mb-16 scroll-mt-32">
      <div className="mb-6 flex items-start gap-4 border-b border-gray-200 pb-5">
        <span className="mt-0.5 text-[28px]">{category.icon}</span>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-300">{category.num}</span>
            <h2 className="text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}>
              {category.title}
            </h2>
          </div>
          <p className="text-[14px] font-light text-gray-400">{category.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {category.services.map((service) => (
          <div
            key={service.name}
            className="rounded-xl border border-gray-100 p-5 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="mb-1.5 text-[14px] font-semibold text-charcoal">{service.name}</div>
            <div className="text-[13px] font-light leading-[1.65] text-gray-400">{service.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ServicesPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Publishing Services"
        ghost="Services"
        title={
          <>
            Support for every
            <br />
            <em className="not-italic italic text-blue-500">stage of the book.</em>
          </>
        }
        description="Every author arrives with a different need. Some need help strengthening the manuscript. Some need professional design and production. Some need distribution, launch support, or a long-term author platform. J Merrill Publishing helps match the right services to the work in front of us."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'Explore Packages', href: '/packages' },
        ]}
      />

      <div className="border-b border-blue-100 bg-blue-50 px-6 py-5 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] font-light text-blue-900/60">
            You do not need to know every service your book needs before reaching out. We help identify the right support after we understand the manuscript, the author, and the goal.
          </p>
          <Link href="/packages" className="text-[13px] font-semibold text-blue-600 transition-colors hover:text-blue-800">
            Explore publishing packages →
          </Link>
        </div>
      </div>

      <div className="sticky top-[76px] z-40 overflow-x-auto border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur sm:px-12">
        <div className="mx-auto flex max-w-[1280px] gap-4 whitespace-nowrap">
          {stickyNavCatalog.map((category) => (
            <a
              key={category!.anchor}
              href={`#${category!.anchor}`}
              className="text-[12px] font-medium tracking-[0.02em] text-gray-400 transition-colors hover:text-blue-500"
            >
              {category!.title}
            </a>
          ))}
        </div>
      </div>

      <PageSection
        eyebrow="Start With What Your Book Needs"
        title={
          <>
            The right support
            <br />
            <em className="not-italic italic text-blue-500">depends on the book.</em>
          </>
        }
        description="A children’s book, memoir, devotional, poetry collection, business book, and legacy project do not all need the same path. Our services are designed to support the manuscript, the author’s goals, and the kind of reader the book is meant to reach."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {fitIndicators.map((indicator) => (
            <div key={indicator} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{indicator}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Core Service Areas"
        title={
          <>
            The kinds of support
            <br />
            <em className="not-italic italic text-blue-500">authors may need most.</em>
          </>
        }
        description="These service areas are here to help authors understand what kind of support may strengthen the manuscript, protect the voice, prepare the release, and support the long-term life of the work."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceAreaOverview.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-7">
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.16 }}
              >
                {item.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-white/70">{item.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Before Publishing"
        title={
          <>
            Before publishing:
            <br />
            <em className="not-italic italic text-blue-500">shape the work.</em>
          </>
        }
        description="This stage is about strengthening the manuscript, clarifying the message, and identifying the right path before the book moves into production. The goal is to honor the work before we start building around it."
      >
        {beforePublishing.map((category) => (
          <LightServiceCategorySection key={category.anchor} category={category} />
        ))}
      </PageSection>

      <PageSection
        eyebrow="During Production"
        title={
          <>
            During production:
            <br />
            <em className="not-italic italic text-blue-500">prepare the book professionally.</em>
          </>
        }
        description="Once the manuscript is moving forward, the work shifts into design, formatting, metadata, formats, and distribution preparation that help the book enter the marketplace with professional care."
        surface="dark"
      >
        <div className="space-y-16">
          {duringProduction.map((category) => (
            <div key={category.anchor} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
              <div className="mb-6 flex items-start gap-4 border-b border-white/10 pb-5">
                <span className="mt-0.5 text-[28px]">{category.icon}</span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">{category.num}</span>
                    <h2 className="text-white" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}>
                      {category.title}
                    </h2>
                  </div>
                  <p className="text-[14px] font-light text-white/60">{category.description}</p>
                </div>
              </div>

              <div id={category.anchor} className="grid gap-3 scroll-mt-32 sm:grid-cols-2 lg:grid-cols-3">
                {category.services.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-xl border border-white/8 p-5 transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/[0.05]"
                  >
                    <div className="mb-1.5 text-[14px] font-semibold text-white">{service.name}</div>
                    <div className="text-[13px] font-light leading-[1.65] text-white/60">{service.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="After Launch"
        title={
          <>
            After launch:
            <br />
            <em className="not-italic italic text-blue-500">keep building the author relationship.</em>
          </>
        }
        description="Publication does not have to be the end of the support. This stage is about helping authors think beyond the release itself into visibility, platform, future growth, and continued relationship."
      >
        {afterLaunch.map((category) => (
          <LightServiceCategorySection key={category.anchor} category={category} />
        ))}
      </PageSection>

      <PageSection
        eyebrow="Ghostwriting Support"
        title={
          <>
            Need help writing
            <br />
            <em className="not-italic italic text-blue-500">the book first?</em>
          </>
        }
        description="Some authors have the story, message, ministry, or expertise before they have the finished manuscript. Ghostwriting and manuscript-development support can help shape the work before it enters the publishing path."
        surface="dark"
      >
        <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] px-8 py-7">
          <p className="max-w-[920px] text-[16px] font-light leading-[1.85] text-white/75">
            Ghostwriting remains part of the normal publishing support available through JMP. If the message is clear but the manuscript is not finished yet, we can help you understand whether ghostwriting or manuscript-development support is the right next step.
          </p>
          <Link href="#ghostwriting" className="mt-4 inline-flex text-[14px] font-semibold text-blue-400 transition-colors hover:text-blue-300">
            Explore Ghostwriting Support →
          </Link>
        </div>
      </PageSection>

      <CTASection
        eyebrow="Next Step"
        title={
          <>
            Not sure what support
            <br />
            <em className="not-italic italic text-blue-500">your book needs?</em>
          </>
        }
        description="Tell us about your manuscript, your goals, and where you are in the journey. We will help you understand which services or publishing path fit best."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'View Publishing Packages', href: '/packages' }}
      />
    </div>
  )
}
