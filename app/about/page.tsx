import type { Metadata } from 'next'
import { CTASection } from '@/components/content/CTASection'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { division } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'About — J Merrill Publishing, Inc.',
  description:
    'J Merrill Publishing exists to help authors protect, prepare, publish, and support the work that matters most while keeping rights, legacy, and authorship at the center.',
}

const beliefs = [
  'Publishing should strengthen the author’s voice, not replace it.',
  'Every manuscript deserves professional care before it reaches readers.',
  'Books should be prepared for the people they were written for, not just uploaded and left alone.',
  'The author should remain visible, respected, and protected through the entire process.',
]

const authorsKeep = [
  'You remain at the center of the work.',
  'Your rights and ownership matter.',
  'Your voice is preserved through the process.',
  'Your book is supported, not absorbed.',
]

const authorsGain = [
  'Editorial care',
  'Cover and interior design',
  'Publishing guidance',
  'Distribution setup',
  'Launch and visibility support',
  'Long-term author relationship',
]

const imprints = [
  {
    name: 'J Merrill Publishing',
    body: 'The flagship publishing home for authors whose work lives directly under the primary J Merrill brand.',
  },
  {
    name: 'JM Little',
    body: 'A home for children’s voices, family stories, and books shaped for younger readers.',
  },
  {
    name: 'JM Verse',
    body: 'A home for poetry, lyrical work, and voices that move through rhythm, reflection, and art.',
  },
  {
    name: 'JM Signature',
    body: 'A selective home for books that call for elevated positioning, premium presentation, or signature treatment.',
  },
  {
    name: 'JM Works',
    body: 'A home for mission-driven, practical, leadership, and impact-focused books with a strong message to carry.',
  },
]

const carePrinciples = [
  'We communicate clearly.',
  'We guide the author through the process.',
  'We protect the integrity of the work.',
  'We prepare books for the marketplace.',
  'We think beyond one release.',
]

const proofPoints = [
  '125+ titles',
  'Five official imprints',
  "Global distribution through Ingram's retail and library network",
  'Registered publisher',
  'Author-first publishing model',
]

export default function AboutPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="About J Merrill Publishing"
        ghost="About"
        title={
          <>
            A publishing home
            <br />
            <em className="not-italic italic text-blue-500">for authors whose work matters.</em>
          </>
        }
        description="J Merrill Publishing exists because authors deserve more than a transaction. Your book carries your name, your story, your message, and your legacy. Our role is to help protect, prepare, publish, and support the work without taking the heart of it away from you."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'See How Publishing Works', href: '/publishing' },
        ]}
      />

      <PageSection
        eyebrow="The Belief"
        title={
          <>
            We believe the author
            <br />
            <em className="not-italic italic text-blue-500">should never disappear behind the process.</em>
          </>
        }
        description="Publishing should strengthen the author’s voice, not replace it. Whether the work is faith-based, inspirational, children’s, poetry, memoir, business, or general trade, the goal is the same: honor the message, prepare the book professionally, and help it reach the people it was written for."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {beliefs.map((belief) => (
            <div key={belief} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <p className="text-[16px] font-light leading-[1.9] text-gray-500">{belief}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="What Authors Keep"
        title={
          <>
            Your name.
            <br />
            <em className="not-italic italic text-blue-500">Your voice. Your rights.</em>
          </>
        }
        description="Publishing with JMP is built to support the author without erasing the person behind the work."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-[16px] font-light leading-[1.9] text-white/70">
              Your book should not cost you your authorship. We help strengthen the work, prepare it professionally, and move it toward readers while keeping your identity, your message, and your ownership at the center.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <ul className="flex flex-col gap-4">
              {authorsKeep.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-white/80">
                  <span className="mt-0.5 text-blue-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>

      <PageSection
        eyebrow="What Authors Gain"
        title={
          <>
            Professional guidance
            <br />
            <em className="not-italic italic text-blue-500">without losing ownership.</em>
          </>
        }
        description="Authors come to JMP because they want professional publishing care without giving up the message or the meaning of the work."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {authorsGain.map((item) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-white p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <h3
                className="text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700, lineHeight: 1.18 }}
              >
                {item}
              </h3>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Our Publishing Family"
        title={
          <>
            A family of imprints
            <br />
            <em className="not-italic italic text-blue-500">for different kinds of voices.</em>
          </>
        }
        description="Different books need different homes. Our imprints help us position books according to voice, audience, and purpose without turning the author’s work into a technical matrix."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {imprints.map((imprint) => (
            <div key={imprint.name} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <h3
                className="mb-3 text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.14 }}
              >
                {imprint.name}
              </h3>
              <p className="text-[14px] font-light leading-[1.8] text-white/70">{imprint.body}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Our Standard Of Care"
        title={
          <>
            Care, clarity,
            <br />
            <em className="not-italic italic text-blue-500">and professional standards.</em>
          </>
        }
        description={`Founded by ${division.founder} in ${division.established}, J Merrill Publishing was built on the conviction that authors deserve a true publishing home, not just a vendor. That conviction shapes how we communicate, guide, and support every project.`}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {carePrinciples.map((item, index) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-[16px] font-light leading-[1.8] text-gray-500">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Proof & Credibility"
        title={
          <>
            Built on trust.
            <br />
            <em className="not-italic italic text-blue-500">Backed by real publishing proof.</em>
          </>
        }
        description="Authors need more than warm words. They need signs that the house is real, active, and prepared to help the work reach readers well."
        surface="dark"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {proofPoints.map((item) => (
            <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-3 text-[18px] text-blue-400">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-white/80">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <CTASection
        eyebrow="Next Step"
        title={
          <>
            Ready to see where
            <br />
            your book <em className="not-italic italic text-blue-500">could belong?</em>
          </>
        }
        description="Tell us about your book, your goals, and where you are in the journey. We will help you understand the next step."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Publish With Us', href: '/publishing' }}
      />
    </div>
  )
}
