import type { Metadata } from 'next'
import Link from 'next/link'
import { CTASection } from '@/components/content/CTASection'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { packages } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Publishing Packages — Flexible Payment Plans | J Merrill Publishing',
  description:
    'Three full-service publishing packages from $1,999. Pay in full or choose 2, 4, 8, or 12-month autopay plans. Editorial, design, distribution, and eBook included.',
}

const bookingUrl = 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled'

const matrix = [
  { feature: 'BASICS', starter: '', pro: '', sig: '', head: true },
  { feature: 'Price', starter: '$1,999', pro: '$4,500', sig: '$7,500' },
  { feature: 'Word count', starter: 'Up to 50K', pro: 'Up to 75K', sig: 'Up to 100K' },
  { feature: 'Primary format', starter: 'PB + eBook', pro: 'PB + eBook', sig: 'PB + HC + eBook' },
  { feature: 'Author Profile Page', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'ISBN assignment', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Distribution setup', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Copyright registration', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Library of Congress', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Delivery (standard)', starter: '8–10 weeks', pro: '10–12 weeks', sig: '12–14 weeks' },
  { feature: 'EDITORIAL', starter: '', pro: '', sig: '', head: true },
  { feature: 'Editorial review', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Light line editing', starter: '✓', pro: '—', sig: '—' },
  { feature: 'Full line editing', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Copy editing', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Proofreading', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Structural editorial review', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Developmental guidance', starter: '—', pro: '—', sig: '✓' },
  { feature: 'Editorial consultation', starter: '—', pro: '—', sig: '✓' },
  { feature: 'DESIGN', starter: '', pro: '', sig: '', head: true },
  { feature: 'Cover design', starter: 'Professional', pro: 'Enhanced', sig: 'Premium' },
  { feature: 'Interior layout', starter: 'Standard', pro: 'Advanced', sig: 'Advanced' },
  { feature: 'eBook conversion', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Hardcover edition', starter: '—', pro: 'Optional add-on', sig: '✓' },
  { feature: 'Metadata optimization', starter: 'Basic', pro: 'Advanced', sig: 'Advanced' },
  { feature: 'LAUNCH & MARKETING', starter: '', pro: '', sig: '', head: true },
  { feature: 'Launch planning session', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Marketing guidance', starter: '—', pro: '✓', sig: '✓' },
  { feature: 'Full marketing strategy', starter: '—', pro: '—', sig: '✓' },
  { feature: 'Author strategy consultation', starter: '—', pro: '—', sig: '✓' },
  { feature: 'Ongoing publishing support', starter: '—', pro: '—', sig: '✓' },
  { feature: 'CONSULTATIONS', starter: '', pro: '', sig: '', head: true },
  { feature: 'Publishing consultation', starter: '30 min × 1', pro: '60 min × 1', sig: '60 min × 2' },
  { feature: 'Dedicated consultant', starter: '—', pro: '—', sig: '✓' },
  { feature: 'DISTRIBUTION', starter: '', pro: '', sig: '', head: true },
  { feature: 'Ingram Content setup', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'Digital distribution', starter: '✓', pro: '✓', sig: '✓' },
  { feature: 'BISAC / metadata', starter: 'Basic', pro: 'Advanced', sig: 'Advanced' },
  { feature: 'Library distribution', starter: 'Add-on', pro: 'Add-on', sig: 'Add-on' },
  { feature: 'AUDIOBOOK', starter: '', pro: '', sig: '', head: true },
  { feature: 'Audiobook', starter: 'Add-on ($699)', pro: 'AI narration included', sig: 'AI narration included' },
  { feature: 'AUTHOR COPIES', starter: '', pro: '', sig: '', head: true },
  { feature: 'Complimentary paperbacks', starter: '5 copies', pro: '10 copies', sig: '15 copies' },
]

const paymentOptions = [
  {
    package: 'Starter',
    base: '$1,999',
    rows: [
      { option: 'Pay in Full (7% off)', perPayment: '$1,859', total: '$1,859' },
      { option: '2-Month', perPayment: '~$1,000', total: '$1,999' },
      { option: '4-Month', perPayment: '$500/mo', total: '$1,999' },
      { option: '8-Month', perPayment: '$250/mo', total: '$1,999' },
      { option: '12-Month', perPayment: '$167/mo', total: '$1,999' },
    ],
  },
  {
    package: 'Professional',
    base: '$4,500',
    rows: [
      { option: 'Pay in Full (7% off)', perPayment: '$4,185', total: '$4,185' },
      { option: '2-Month', perPayment: '$2,250/mo', total: '$4,500' },
      { option: '4-Month', perPayment: '$1,125/mo', total: '$4,500' },
      { option: '8-Month', perPayment: '$563/mo', total: '$4,500' },
      { option: '12-Month', perPayment: '$375/mo', total: '$4,500' },
    ],
  },
  {
    package: 'Signature',
    base: '$7,500',
    rows: [
      { option: 'Pay in Full (7% off)', perPayment: '$6,975', total: '$6,975' },
      { option: '2-Month', perPayment: '$3,750/mo', total: '$7,500' },
      { option: '4-Month', perPayment: '$1,875/mo', total: '$7,500' },
      { option: '8-Month', perPayment: '$938/mo', total: '$7,500' },
      { option: '12-Month', perPayment: '$625/mo', total: '$7,500' },
    ],
  },
]

const fitIndicators = [
  'Manuscript length and readiness',
  'Level of editorial support needed',
  'Design and format needs',
  'Launch and visibility goals',
  'Long-term author plans',
]

const packageGuidance: Record<
  string,
  {
    summary: string
    ctaLabel: string
    href: string
    badge?: string
  }
> = {
  Starter: {
    summary:
      'For authors ready for a focused professional publishing path with essential editorial, design, and distribution support.',
    ctaLabel: 'Explore Starter',
    href: '/packages#compare',
  },
  Professional: {
    summary:
      'For authors who need deeper editorial care, stronger design preparation, and more launch guidance.',
    ctaLabel: 'Explore Professional',
    href: '/packages#compare',
    badge: 'Most Popular',
  },
  Signature: {
    summary:
      'A selective publishing path for works that require elevated positioning, expanded guidance, hardcover/prestige presentation, or a higher-touch publishing relationship.',
    ctaLabel: 'Apply for Signature',
    href: '/join',
  },
}

const decisionGuide = [
  'Choose Starter if your manuscript is ready and you need a focused professional path.',
  'Choose Professional if you need deeper editorial, design, and launch support.',
  'Apply for Signature if the work needs elevated positioning, prestige presentation, or expanded guidance.',
]

export default function PackagesPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Publishing Packages"
        ghost="Packages"
        title={
          <>
            Find the publishing path
            <br />
            <em className="not-italic italic text-blue-500">that fits your book.</em>
          </>
        }
        description="Every book does not need the same level of support. Some authors need a focused path to publication. Others need deeper editorial guidance, expanded design support, launch planning, or prestige positioning. Our packages are designed to help you choose the right level of care for the work in your hands."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'Compare Packages', href: '#compare' },
        ]}
      />

      <PageSection
        eyebrow="Package Fit Guidance"
        title={
          <>
            Start with the support
            <br />
            <em className="not-italic italic text-blue-500">your book actually needs.</em>
          </>
        }
        description="The right package depends on your manuscript, your goals, your timeline, and how much guidance you need. We help authors think through fit before moving forward, because publishing should feel clear, not confusing."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {fitIndicators.map((indicator) => (
            <div key={indicator} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 text-[20px] text-blue-500">•</div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{indicator}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Publishing Paths"
        title={
          <>
            Three publishing paths.
            <br />
            <em className="not-italic italic text-blue-500">One goal: the right fit.</em>
          </>
        }
        description="These options are not a hierarchy of author worth. They are different levels of support designed to match the manuscript, the release vision, and the kind of publishing relationship the work needs."
        surface="dark"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {packages.map((pkg) => {
            const details = packageGuidance[pkg.tier]

            return (
              <div
                key={pkg.sku}
                className={`relative flex h-full flex-col rounded-[28px] border p-8 ${
                  pkg.featured ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {details.badge && (
                  <div className="absolute right-6 top-6 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                    {details.badge}
                  </div>
                )}
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">{pkg.sku}</div>
                <h3
                  className="mt-4 text-white"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }}
                >
                  {pkg.tier}
                </h3>
                <div className="mt-2 text-[44px] font-bold leading-none text-white">
                  ${pkg.price.toLocaleString()}
                </div>
                <p className="mt-1 text-[12px] text-white/30">Up to {pkg.wordLimit} words</p>
                <p className="mt-5 text-[14px] font-light leading-[1.8] text-white/70">{details.summary}</p>
                <div className="mt-6 h-px bg-white/8" />
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {pkg.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[14px] font-light leading-[1.6] text-white/60">
                      <span className="mt-0.5 text-blue-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex gap-3">
                  <Link
                    href={details.href}
                    className={`rounded-full px-5 py-3 text-[13px] font-semibold transition-colors ${
                      pkg.featured
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-white text-charcoal hover:bg-blue-50'
                    }`}
                  >
                    {details.ctaLabel}
                  </Link>
                  <Link
                    href="#compare"
                    className="rounded-full border border-white/10 px-5 py-3 text-[13px] text-white/55 transition-all hover:border-blue-500 hover:text-blue-400"
                  >
                    Full details
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </PageSection>

      <div id="compare">
        <PageSection
          eyebrow="Compare What’s Included"
          title={
            <>
              Compare what
              <br />
              <em className="not-italic italic text-blue-500">each path includes.</em>
            </>
          }
          description="Once you understand the level of support your book may need, the details below can help you compare each publishing path more clearly."
        >
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px_160px] bg-charcoal">
              <div className="p-4 text-[13px] font-semibold text-white/60">Feature</div>
              {['Starter', 'Professional', 'Signature'].map((tier) => (
                <div key={tier} className="p-4 text-center">
                  <div className="text-[14px] font-semibold text-white">{tier}</div>
                </div>
              ))}
            </div>

            {matrix.map((row, index) => {
              if (row.head) {
                return (
                  <div key={index} className="grid grid-cols-[1fr_160px_160px_160px] bg-gray-50 border-t border-gray-200">
                    <div className="col-span-4 p-3 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">
                      {row.feature}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={index}
                  className={`grid grid-cols-[1fr_160px_160px_160px] border-t border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  <div className="p-3.5 px-4 text-[14px] text-gray-600">{row.feature}</div>
                  {[row.starter, row.pro, row.sig].map((value, valueIndex) => (
                    <div key={valueIndex} className="p-3.5 text-center">
                      <span
                        className={`text-[13px] font-medium ${
                          value === '✓' ? 'text-blue-500' : value === '—' ? 'text-gray-300' : 'text-charcoal'
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </PageSection>
      </div>

      <PageSection
        eyebrow="Payment Options"
        title={
          <>
            Flexible payment options
            <br />
            <em className="not-italic italic text-blue-500">for serious publishing projects.</em>
          </>
        }
        description="Publishing is an investment in the work. Where available, payment options help authors plan responsibly while moving the project forward with clarity."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {paymentOptions.map((plan) => (
            <div key={plan.package} className="overflow-hidden rounded-[26px] border border-gray-200 bg-[#F7F8FA]">
              <div className="border-b border-gray-200 px-6 py-5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">{plan.package}</div>
                <div
                  className="text-[26px] text-charcoal"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}
                >
                  {plan.base}
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="mb-3 grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-b border-gray-200 pb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400">Option</div>
                  <div className="text-right text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400">Per Payment</div>
                  <div className="text-right text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400">Total</div>
                </div>
                <div className="flex flex-col gap-3">
                  {plan.rows.map((row) => (
                    <div key={row.option} className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 items-start">
                      <div className="text-[13px] font-medium leading-[1.5] text-charcoal">{row.option}</div>
                      <div className="text-[13px] text-right text-gray-500">{row.perPayment}</div>
                      <div className="text-[13px] text-right text-gray-500">{row.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Ghostwriting + Publishing Bundle"
        title={
          <>
            Need help writing
            <br />
            <em className="not-italic italic text-blue-500">the book first?</em>
          </>
        }
        description="Some authors have the message, story, or expertise, but need help turning it into a finished manuscript. The Ghostwriting + Publishing Bundle is for authors who need writing support before the publishing path begins."
        surface="dark"
      >
        <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] px-8 py-7">
          <p className="max-w-[940px] text-[16px] font-light leading-[1.8] text-white/72">
            Commission your manuscript with JMP and publish it here — your publishing package is 10% off when contracted together or within 90 days of ghostwriting completion.
          </p>
          <Link href="/services#ghostwriting" className="mt-4 inline-flex text-[14px] font-semibold text-blue-400 transition-colors hover:text-blue-300">
            Learn more about ghostwriting →
          </Link>
        </div>
      </PageSection>

      <PageSection
        eyebrow="How To Choose"
        title={
          <>
            Not sure
            <br />
            <em className="not-italic italic text-blue-500">which path fits?</em>
          </>
        }
        description="You do not have to decide alone. Tell us about your book, where the manuscript stands, and what you want the book to accomplish. We will help you understand the publishing path that fits best."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {decisionGuide.map((item, index) => (
            <div key={item} className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-7">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-[15px] font-light leading-[1.8] text-gray-500">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/join"
            className="inline-flex rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600"
          >
            Tell Us About Your Book
          </Link>
        </div>
      </PageSection>

      <CTASection
        eyebrow="Final Step"
        title={
          <>
            Ready to find the right
            <br />
            path for <em className="not-italic italic text-blue-500">your book?</em>
          </>
        }
        description="Share your manuscript stage, goals, and publishing needs. We will help you understand which option fits and what the next step should be."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Talk With Our Publishing Team', href: bookingUrl, external: true }}
      />
    </div>
  )
}
