import type { Metadata } from 'next'
import { CTASection } from '@/components/content/CTASection'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'

export const metadata: Metadata = {
  title: 'Author Journey',
  description:
    'Follow the J Merrill Publishing author journey from first conversation through editorial preparation, production, publication, and long-term support.',
}

const emotionalPromises = [
  'You will not be left guessing.',
  'Your voice remains central.',
  'Your rights and ownership matter.',
  'Your book is prepared professionally.',
  'The relationship can continue after release.',
]

const stages = [
  {
    step: '01',
    title: 'Discover',
    body: 'We learn about your book, your goals, your audience, your manuscript stage, and what kind of support the work may need.',
  },
  {
    step: '02',
    title: 'Prepare',
    body: 'We review the manuscript and help identify the right editorial, design, package, and production path.',
  },
  {
    step: '03',
    title: 'Produce',
    body: 'Your book moves through the needed professional work: editing, cover design, interior layout, formatting, and production preparation.',
  },
  {
    step: '04',
    title: 'Publish',
    body: 'We prepare the ISBN, metadata, files, and distribution setup so your book can enter the marketplace professionally.',
  },
  {
    step: '05',
    title: 'Grow',
    body: 'After publication, we help you think about visibility, future titles, author support, and the long-term opportunity around your work.',
  },
]

const youCanExpect = [
  'Clear communication',
  'Honest guidance',
  'Editorial and design professionalism',
  'Respect for the author’s voice',
  'Care with rights, metadata, and presentation',
  'Guidance beyond launch where appropriate',
]

const weNeedFromYou = [
  'Your manuscript or book idea',
  'Your goals for the work',
  'Your intended audience',
  'Your availability for decisions and approvals',
  'Your openness to professional guidance',
  'Your long-term vision, if you have one',
]

const whereItLeads = [
  'Future titles',
  'Author platform growth',
  'Speaking, ministry, or business extensions where relevant',
  'Memberships or long-term support where available',
  'Catalog-building and legacy-building',
]

const faq = [
  {
    question: 'Do I need a finished manuscript before reaching out?',
    answer: 'No. Some authors come with a completed draft, while others come with an idea, an outline, or a work that still needs shaping. We can help you understand the right next step from where you are.',
  },
  {
    question: 'Will I keep the rights to my book?',
    answer: 'Yes. Your rights and ownership matter. Our role is to help prepare, publish, and support the work without taking your authorship away from you.',
  },
  {
    question: 'How do I know which package fits?',
    answer: 'We look at the manuscript, the goals, the stage of the work, and the level of guidance needed. You do not have to sort that out alone before reaching out.',
  },
  {
    question: 'Can you help if my book still needs editing?',
    answer: 'Yes. Many books need editorial work before they are ready for publication. Part of the journey is identifying what kind of editorial care the manuscript needs.',
  },
  {
    question: 'What happens after the book is published?',
    answer: 'Publication is not always the end of the relationship. Depending on your goals, the journey can continue through visibility support, future titles, memberships, and long-term author growth.',
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
            A clear path
            <br />
            <em className="not-italic italic text-blue-500">from manuscript to marketplace.</em>
          </>
        }
        description="Publishing should not feel confusing or lonely. At J Merrill Publishing, we walk with authors through a clear process from the first conversation to editorial preparation, design, distribution, launch, and long-term support."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'Publish With Us', href: '/publishing' },
        ]}
      />

      <PageSection
        eyebrow="What The Journey Should Feel Like"
        title={
          <>
            You should know where you are,
            <br />
            <em className="not-italic italic text-blue-500">what comes next, and who is walking with you.</em>
          </>
        }
        description="Authors often arrive with a manuscript, an idea, a message, or a story they have carried for years. The publishing process should bring clarity, not confusion. This page explains how we help move the work forward with care."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {emotionalPromises.map((item) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="The Five Stages Of Publishing With JMP"
        title={
          <>
            The publishing journey,
            <br />
            <em className="not-italic italic text-blue-500">step by step.</em>
          </>
        }
        description="From first conversation to life after launch, we help authors move forward in a way that feels clear, professional, and supported."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage) => (
            <div key={stage.step} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-blue-400">{stage.step}</div>
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700, lineHeight: 1.14 }}
              >
                {stage.title}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-white/70">{stage.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="What You Can Expect From Us"
        title={
          <>
            What you can
            <br />
            <em className="not-italic italic text-blue-500">expect from us.</em>
          </>
        }
        description="A publishing relationship should feel steady, respectful, and professionally handled. These are the standards we bring to the journey."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {youCanExpect.map((item) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-white p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="What We’ll Need From You"
        title={
          <>
            What we’ll need
            <br />
            <em className="not-italic italic text-blue-500">from you.</em>
          </>
        }
        description="You do not need to arrive with everything figured out. But a publishing journey works best when we can understand the work, the hopes behind it, and the decisions that will shape it."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weNeedFromYou.map((item) => (
            <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-7">
              <div className="mb-4 text-[20px] text-blue-400">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-white/80">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Where The Journey Can Lead"
        title={
          <>
            One book can become
            <br />
            <em className="not-italic italic text-blue-500">the beginning of something larger.</em>
          </>
        }
        description="A single title can open the door to future books, stronger author identity, broader reach, and a longer publishing relationship. We do not promise fame. We do help authors think beyond one release."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {whereItLeads.map((item) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Common Author Questions"
        title={
          <>
            The questions authors
            <br />
            <em className="not-italic italic text-blue-500">usually ask first.</em>
          </>
        }
        description="A little clarity up front can remove a lot of uncertainty. These are some of the questions authors bring into the conversation most often."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {faq.map((item) => (
            <div key={item.question} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-8">
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, lineHeight: 1.14 }}
              >
                {item.question}
              </h3>
              <p className="text-[15px] font-light leading-[1.85] text-white/70">{item.answer}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <CTASection
        eyebrow="Next Step"
        title={
          <>
            Ready to take
            <br />
            <em className="not-italic italic text-blue-500">the next step?</em>
          </>
        }
        description="Tell us about your book, where you are in the journey, and what you hope the work will become. We will help you understand the publishing path that fits."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Explore Packages', href: '/packages' }}
      />
    </div>
  )
}
