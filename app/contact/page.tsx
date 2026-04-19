import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { CTASection } from '@/components/content/CTASection'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'
import { JMP_CONTACT } from '@/lib/distribution-data'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact J Merrill Publishing for consultations, publishing inquiries, media requests, and flagship brand communication.',
}

const contactCards = [
  {
    label: 'Publishing inquiries',
    value: JMP_CONTACT.email,
    href: JMP_CONTACT.emailHref,
    description: 'General publishing, package, and service questions.',
  },
  {
    label: 'Consultation booking',
    value: 'Schedule a consultation',
    href: JMP_CONTACT.booking,
    description: 'Choose a time to talk through your book and your goals.',
  },
  {
    label: 'Phone',
    value: JMP_CONTACT.phone,
    href: JMP_CONTACT.phoneHref,
    description: 'For direct flagship publishing contact during business hours.',
  },
]

export default function ContactPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Contact J Merrill Publishing"
        ghost="Contact"
        title={
          <>
            Reach the flagship team
            <br />
            <em className="not-italic italic text-blue-500">the right way</em>
          </>
        }
        description="Use this contact surface for consultations, publishing questions, media inquiries, and flagship communication. If you are ready to begin your publishing path, Join the Family remains the primary onboarding route."
        actions={[
          { label: 'Join the Family', href: '/join' },
          { label: 'Schedule a Consultation', href: JMP_CONTACT.booking, external: true },
        ]}
      />

      <PageSection
        eyebrow="Direct Paths"
        title={
          <>
            Clear routes for
            <br />
            <em className="not-italic italic text-blue-500">every kind of inquiry</em>
          </>
        }
        description="The contact page should clarify the difference between general communication and publishing onboarding so the flagship brand feels organized, responsive, and premium."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {contactCards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              target={card.href.startsWith('http') ? '_blank' : undefined}
              rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="rounded-[26px] border border-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_50px_rgba(8,35,71,0.08)]"
            >
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">{card.label}</div>
              <div className="text-[22px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                {card.value}
              </div>
              <p className="mt-3 text-[14px] font-light leading-[1.8] text-gray-500">{card.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
              Office context
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-gray-500">
              {JMP_CONTACT.address.display}. Business hours are structured for both daytime and evening
              author conversations, with consultations available by appointment.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {JMP_CONTACT.hours.map((slot) => (
                <div key={slot.days} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <span className="text-[13px] text-charcoal">{slot.days}</span>
                  <span className="text-[12px] text-gray-400">{slot.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/publishing" className="text-[13px] font-medium text-blue-500 transition-colors hover:text-blue-700">
                Explore the publishing model -&gt;
              </Link>
            </div>
          </div>
          <NewsletterSignup
            surface="light"
            title="Stay in the loop"
            description="Subscribe for new releases, author spotlights, publishing insights, and flagship updates from J Merrill Publishing."
          />
        </div>
      </PageSection>

      <CTASection
        eyebrow="Primary Onboarding"
        title={
          <>
            Ready to talk about
            <br />
            your book?
          </>
        }
        description="If you’re an author exploring publication, the strongest next step is the flagship onboarding route. We’ll gather the right context and move the conversation forward from there."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Schedule a Consultation', href: JMP_CONTACT.booking, external: true }}
        dark={false}
      />
    </div>
  )
}
