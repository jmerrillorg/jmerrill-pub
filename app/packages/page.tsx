import type { Metadata } from 'next'
import Link from 'next/link'
import { packages } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Publishing Packages — Flexible Payment Plans | J Merrill Publishing',
  description: 'Three full-service publishing packages from $1,999. Pay in full or choose 2, 4, 8, or 12-month autopay plans. Editorial, design, distribution, and eBook included.',
}

const matrix = [
  { feature: 'BASICS',                    starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Price',                      starter: '$1,999',          pro: '$4,500',            sig: '$7,500' },
  { feature: 'Word count',                 starter: 'Up to 50K',       pro: 'Up to 75K',         sig: 'Up to 100K' },
  { feature: 'Primary format',             starter: 'PB + eBook',      pro: 'PB + eBook',        sig: 'PB + HC + eBook' },
  { feature: 'Author Profile Page',        starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'ISBN assignment',            starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Distribution setup',         starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Copyright registration',     starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Library of Congress',        starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Delivery (standard)',        starter: '8–10 weeks',      pro: '10–12 weeks',       sig: '12–14 weeks' },
  { feature: 'EDITORIAL',                  starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Editorial review',           starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Light line editing',         starter: '✓',               pro: '—',                 sig: '—' },
  { feature: 'Full line editing',          starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Copy editing',               starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Proofreading',               starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Structural editorial review',starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Developmental guidance',     starter: '—',               pro: '—',                 sig: '✓' },
  { feature: 'Editorial consultation',     starter: '—',               pro: '—',                 sig: '✓' },
  { feature: 'DESIGN',                     starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Cover design',               starter: 'Professional',    pro: 'Enhanced',          sig: 'Premium' },
  { feature: 'Interior layout',            starter: 'Standard',        pro: 'Advanced',          sig: 'Advanced' },
  { feature: 'eBook conversion',           starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Hardcover edition',          starter: '—',               pro: 'Optional add-on',   sig: '✓' },
  { feature: 'Metadata optimization',      starter: 'Basic',           pro: 'Advanced',          sig: 'Advanced' },
  { feature: 'LAUNCH & MARKETING',         starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Launch planning session',    starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Marketing guidance',         starter: '—',               pro: '✓',                 sig: '✓' },
  { feature: 'Full marketing strategy',    starter: '—',               pro: '—',                 sig: '✓' },
  { feature: 'Author strategy consultation',starter: '—',              pro: '—',                 sig: '✓' },
  { feature: 'Ongoing publishing support', starter: '—',               pro: '—',                 sig: '✓' },
  { feature: 'CONSULTATIONS',              starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Publishing consultation',    starter: '30 min × 1',      pro: '60 min × 1',        sig: '60 min × 2' },
  { feature: 'Dedicated consultant',       starter: '—',               pro: '—',                 sig: '✓' },
  { feature: 'DISTRIBUTION',              starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Ingram Content setup',       starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'Digital distribution',       starter: '✓',               pro: '✓',                 sig: '✓' },
  { feature: 'BISAC / metadata',           starter: 'Basic',           pro: 'Advanced',          sig: 'Advanced' },
  { feature: 'Library distribution',       starter: 'Add-on',          pro: 'Add-on',            sig: 'Add-on' },
  { feature: 'AUDIOBOOK',                  starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Audiobook',                  starter: 'Add-on ($699)',   pro: 'AI narration included', sig: 'AI narration included' },
  { feature: 'AUTHOR COPIES',             starter: '',                pro: '',                  sig: '',                  head: true },
  { feature: 'Complimentary paperbacks',   starter: '5 copies',        pro: '10 copies',         sig: '15 copies' },
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

const addOnGuide = [
  { goal: 'Launch my book well',               addons: 'JMP-MKT-LAUNCH + JMP-MKT-ARC + JMP-AI-MARKETING' },
  { goal: 'Sell at church / ministry events',  addons: 'JMP-DIST-CHURCH + JMP-DIST-CONFERENCE + JMP-DIST-BULK' },
  { goal: 'Get into libraries',                addons: 'JMP-DIST-LIBRARY + JMP-ACCESS-EPUB + JMP-CAT-METADATA' },
  { goal: 'Build my author platform',          addons: 'JMP-AUTH-BRAND + JMP-AUTH-MEDIA + JMP-AUTH-WEB' },
  { goal: 'Sell direct to readers',            addons: 'JMP-AUTH-DTC + JMP-AUTH-FUNNEL + JMP-AUTH-EMAIL' },
  { goal: 'Reach the faith market',            addons: 'JMP-DIST-FAITH + JMP-EDU-BIBLESTUDY + JMP-DES-DEVOTIONAL' },
  { goal: 'Produce an audiobook',              addons: 'JMP-AUDIO-AI (budget) or JMP-AUDIO-PRO (premium)' },
  { goal: 'Expand a backlist title',           addons: 'JMP-CAT-METADATA + JMP-CAT-REVISION + JMP-DIST-LSI-UPGRADE' },
  { goal: 'Speak and be booked',              addons: 'JMP-AUTH-MEDIA + JMP-EDU-WORKSHOP + JMP-MKT-PRESS' },
  { goal: 'Update an existing published book', addons: 'JMP-DIST-TRANSFER + JMP-CAT-REVISION + JMP-CAT-METADATA' },
]

export default function PackagesPage() {
  return (
    <div className="pt-[76px]">
      {/* Hero */}
      <div className="bg-[#0F1C2E] px-12 py-20 border-b border-white/5">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">Publishing Packages</span>
          </div>
          <h1
            className="text-white mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Choose your<br />
            <em className="not-italic italic text-blue-500">publishing path</em>
          </h1>
          <p className="text-[17px] font-light text-white/45 max-w-[560px] leading-[1.75]">
            Three tiers. Every tier includes baseline editorial, professional design, ISBN, and global distribution. No hidden fees, no gatekeeping.
          </p>
        </div>
      </div>

      {/* Package cards */}
      <div className="bg-[#0D0D10] px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-3 gap-px bg-white/8 rounded-3xl overflow-hidden">
          {packages.map((pkg) => (
            <div
              key={pkg.sku}
              className={`relative flex flex-col p-10 ${pkg.featured ? 'bg-blue-500/8' : 'bg-white/[0.03]'}`}
            >
              {pkg.featured && (
                <div className="absolute top-5 right-5 bg-blue-500 text-white text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-white/30 mb-3">{pkg.sku}</div>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{pkg.tier}</div>
              <div style={{ fontSize: '48px', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '4px' }}>
                <sup style={{ fontSize: '22px', fontWeight: 400, opacity: 0.6, marginRight: '2px' }}>$</sup>
                {pkg.price.toLocaleString()}
              </div>
              <div className="font-mono text-[11px] text-white/30 mb-8">Up to {pkg.wordLimit} words</div>
              <div className="w-full h-px bg-white/8 mb-6" />
              <ul className="flex flex-col gap-3 flex-1 mb-8">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] font-light text-white/55 leading-[1.5]">
                    <span className="text-blue-500 flex-shrink-0 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href="/join"
                className={`block text-center py-3.5 rounded-xl text-[13px] font-semibold tracking-[0.04em] uppercase transition-all duration-200 border-[1.5px] mt-auto ${
                  pkg.featured
                    ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                    : 'border-white/15 text-white/60 hover:border-blue-500 hover:text-blue-400'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Payment options */}
      <div className="px-12 py-20 bg-white border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Flexible Payment Options</span>
          </div>
          <h2
            className="text-charcoal mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Flexible payment options for every<br />
            <em className="not-italic italic text-blue-500">publishing path</em>
          </h2>
          <p className="text-[15px] font-light text-gray-500 max-w-[760px] leading-[1.8] mb-10">
            All packages are available in pay-in-full or installment plans. Pay-in-full saves 7%. Installment plans run on Stripe autopay, with the author&apos;s card saved at signing and payments processed automatically. Payment 1 gates production start.
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            {paymentOptions.map((plan) => (
              <div key={plan.package} className="rounded-[26px] border border-gray-200 bg-[#F7F8FA] overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500 mb-2">{plan.package}</div>
                  <div className="text-[26px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
                    {plan.base}
                  </div>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-b border-gray-200 pb-3 mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400">Option</div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400 text-right">Per Payment</div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-gray-400 text-right">Total</div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {plan.rows.map((row) => (
                      <div key={row.option} className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 items-start">
                        <div className="text-[13px] font-medium text-charcoal leading-[1.5]">{row.option}</div>
                        <div className="text-[13px] text-right text-gray-500">{row.perPayment}</div>
                        <div className="text-[13px] text-right text-gray-500">{row.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ghostwriting bundle */}
      <div className="px-12 pb-10 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="rounded-[28px] border border-blue-200 bg-blue-50 px-8 py-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500 mb-3">
              Ghostwriting + Publishing Bundle
            </div>
            <p className="text-[16px] font-light text-gray-600 leading-[1.8] max-w-[940px]">
              Commission your manuscript with JMP and publish it here — your publishing package is 10% off when contracted together or within 90 days of ghostwriting completion.
            </p>
            <Link href="/services#ghostwriting" className="inline-flex mt-4 text-[14px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Learn more about ghostwriting →
            </Link>
          </div>
        </div>
      </div>

      {/* Comparison matrix */}
      <div className="px-12 pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Full Comparison</span>
          </div>
          <h2
            className="text-charcoal mb-12"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            What's included — <em className="not-italic italic text-blue-500">feature by feature</em>
          </h2>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_160px_160px_160px] bg-charcoal">
              <div className="p-4 text-[13px] font-semibold text-white/60">Feature</div>
              {['Starter', 'Professional', 'Signature'].map((t) => (
                <div key={t} className="p-4 text-center">
                  <div className="text-[14px] font-semibold text-white">{t}</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            {matrix.map((row, i) => {
              if ((row as any).head) {
                return (
                  <div key={i} className="grid grid-cols-[1fr_160px_160px_160px] bg-gray-50 border-t border-gray-200">
                    <div className="p-3 px-4 col-span-4 font-mono text-[10px] tracking-[0.12em] uppercase text-gray-400">{row.feature}</div>
                  </div>
                )
              }
              return (
                <div key={i} className={`grid grid-cols-[1fr_160px_160px_160px] border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <div className="p-3.5 px-4 text-[14px] text-gray-600">{row.feature}</div>
                  {[row.starter, row.pro, row.sig].map((val, vi) => (
                    <div key={vi} className="p-3.5 text-center">
                      <span className={`text-[13px] font-medium ${
                        val === '✓' ? 'text-blue-500' :
                        val === '—' ? 'text-gray-300' :
                        'text-charcoal'
                      }`}>{val}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add-on guide */}
      <div className="px-12 py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Popular Add-Ons</span>
          </div>
          <h2
            className="text-charcoal mb-10"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            What to add based on<br />
            <em className="not-italic italic text-blue-500">your author goals</em>
          </h2>
          <div className="grid gap-3">
            {addOnGuide.map((item) => (
              <div key={item.goal} className="grid sm:grid-cols-[280px_1fr] gap-4 items-start p-5 rounded-xl bg-white border border-gray-200 hover:border-blue-200 transition-colors">
                <div className="text-[15px] font-semibold text-charcoal">{item.goal}</div>
                <div className="font-mono text-[12px] text-gray-400">{item.addons}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-[14px] text-gray-400 mb-6">Not sure which package is right for you?</p>
            <div className="flex gap-4 justify-center">
              <Link href="/join" className="bg-blue-500 text-white text-[14px] font-semibold px-8 py-3.5 rounded-full hover:bg-blue-600 transition-colors">
                Tell Us About Your Book →
              </Link>
              <a
                href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
                className="border border-gray-300 text-gray-600 text-[14px] px-8 py-3.5 rounded-full hover:border-blue-500 hover:text-blue-500 transition-all"
              >
                Schedule a Free Consultation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
