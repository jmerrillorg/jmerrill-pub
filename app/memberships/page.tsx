import type { Metadata } from 'next'
import Link from 'next/link'
import { memberships } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Author Memberships for Support After Publication | J Merrill Publishing',
  description:
    'Stay connected after launch with practical author support, visibility guidance, resources, and continued care from J Merrill Publishing.',
}

const bookingUrl = 'https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled'

const comparison = [
  { feature: 'JMP author community',          community: true,  support: true,  marketing: true,  ai: true  },
  { feature: 'Quarterly group webinars',       community: true,  support: true,  marketing: true,  ai: true  },
  { feature: 'Monthly author newsletter',      community: true,  support: true,  marketing: true,  ai: true  },
  { feature: 'Private resource library',       community: true,  support: true,  marketing: true,  ai: true  },
  { feature: '30-min monthly consultation',    community: false, support: true,  marketing: true,  ai: true  },
  { feature: 'Manuscript review feedback',     community: false, support: true,  marketing: true,  ai: true  },
  { feature: 'Royalty reporting dashboard',    community: false, support: true,  marketing: true,  ai: true  },
  { feature: 'Monthly marketing session',      community: false, support: false, marketing: true,  ai: true  },
  { feature: 'Campaign guidance',              community: false, support: false, marketing: true,  ai: true  },
  { feature: 'Promotional copy assistance',    community: false, support: false, marketing: true,  ai: true  },
  { feature: 'AI manuscript analysis',         community: false, support: false, marketing: false, ai: true  },
  { feature: 'AI marketing asset generation',  community: false, support: false, marketing: false, ai: true  },
  { feature: 'Early access to AI features',    community: false, support: false, marketing: false, ai: true  },
]

export default function MembershipsPage() {
  return (
    <div className="pt-[76px]">

      {/* Hero */}
      <div className="bg-[#0F1C2E] px-12 py-20 border-b border-white/5">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">Author Memberships</span>
          </div>
          <h1
            className="text-white mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Support after the book<br />
            <em className="not-italic italic text-blue-500">is published.</em>
          </h1>
          <p className="text-[17px] font-light text-white/45 max-w-[560px] leading-[1.75]">
            Publication is not the end of the author journey. After release, authors still need clarity, visibility, support, and encouragement. J Merrill Publishing memberships are designed to help authors stay connected, keep growing, and continue building around the work they have already brought into the world.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
            >
              Talk With Our Publishing Team ↗
            </a>
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-4 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400"
            >
              Tell Us About Your Book
            </Link>
          </div>
        </div>
      </div>

      {/* Why Ongoing Support Matters */}
      <div className="bg-[#0D0D10] px-12 py-16 border-b border-white/5">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-[840px] mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">Why Ongoing Support Matters</span>
            </div>
            <h2
              className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px,4vw,44px)', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              A book may launch once, but the author journey continues.
            </h2>
            <p className="text-[15px] font-light text-white/45 leading-[1.8]">
              Many authors need support after the book is released — help understanding next steps, planning visibility, preparing future content, reviewing ideas, or staying connected to a publishing family. Memberships exist for authors who want a continued relationship instead of one-and-done publishing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              'Post-launch questions, accountability, and encouragement',
              'Visibility and consistency after the initial release window',
              'Future-title planning, resources, and continued author support',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-white/8 bg-white/[0.03] p-7">
                <p className="text-[15px] font-light leading-[1.8] text-white/60">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-[#0D0D10] px-12 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-[760px] mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">Membership Paths</span>
            </div>
            <h2
              className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px,4vw,44px)', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Choose the level of support that matches your next season.
            </h2>
            <p className="text-[15px] font-light text-white/45 leading-[1.8]">
              Membership is not about paying for access to a system. It is about choosing the level of continued support that fits where you are after publication, so the author relationship can keep serving the work after launch.
            </p>
          </div>

          <div className="mb-8 rounded-[24px] border border-blue-500/20 bg-blue-500/[0.06] p-6">
            <p className="text-[14px] font-light leading-[1.8] text-white/58">
              These tiers are support paths, not promises of automatic sales or platform growth. The right fit depends on what kind of guidance, accountability, and continued connection the author needs next.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {memberships.map((mem) => (
            <div
              key={mem.sku}
              className={`rounded-3xl p-8 border-[1.5px] transition-all duration-250 hover:-translate-y-1 ${
                mem.highlight
                  ? 'bg-charcoal border-charcoal hover:border-blue-500'
                  : 'bg-white/[0.03] border-white/8 hover:border-blue-500/50'
              }`}
            >
              <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-blue-400 mb-4">{mem.tier}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className={mem.highlight ? 'text-white' : 'text-white'}
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
                >
                  ${mem.price}
                </span>
                <span className={`text-[13px] font-light ${mem.highlight ? 'text-white/35' : 'text-white/30'}`}>/month</span>
              </div>
              <div className={`text-[16px] font-semibold mb-5 pb-5 border-b ${mem.highlight ? 'text-white border-white/8' : 'text-white border-white/6'}`}>
                {mem.name}
              </div>
              <p className={`text-[13px] font-light leading-[1.65] mb-5 ${mem.highlight ? 'text-white/55' : 'text-white/45'}`}>
                {mem.tier === 'Community'
                  ? 'For authors who want to stay connected and receive ongoing resources.'
                  : mem.tier === 'Support'
                    ? 'For authors who need regular guidance and check-ins after publication.'
                    : mem.tier === 'Marketing'
                      ? 'For authors who want continued help thinking through visibility and promotion.'
                      : 'For authors who want added content, planning, or asset support where appropriate.'}
              </p>
              <ul className="flex flex-col gap-2.5 mb-8">
                {mem.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-[13px] font-light leading-[1.5] ${mem.highlight ? 'text-white/50' : 'text-white/40'}`}>
                    <span className="text-blue-500 text-[12px] font-bold flex-shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/join"
                className={`block text-center py-3 rounded-xl text-[13px] font-semibold tracking-[0.04em] uppercase transition-all duration-200 border-[1.5px] ${
                  mem.highlight
                    ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                    : 'border-white/12 text-white/50 hover:border-blue-500 hover:text-blue-400'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="px-12 py-20 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">What Each Tier Helps With</span>
          </div>
          <h2
            className="text-charcoal mb-10"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            What support looks like — <em className="not-italic italic text-blue-500">tier by tier</em>
          </h2>

          <p className="text-[15px] text-gray-600 leading-[1.8] max-w-[720px] mb-10">
            Community, guidance, manuscript feedback, marketing direction, content help, and visibility tools all matter at different seasons of the author journey. The details below help you compare what kind of continued care each path provides.
          </p>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_130px_130px_130px] bg-charcoal">
              <div className="p-4 text-[13px] font-medium text-white/50">Feature</div>
              {['Community', 'Support', 'Marketing', 'AI Plan'].map((t) => (
                <div key={t} className="p-4 text-center text-[13px] font-semibold text-white">{t}</div>
              ))}
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_130px_130px_130px_130px] border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <div className="p-3.5 px-4 text-[14px] text-gray-600">{row.feature}</div>
                {[row.community, row.support, row.marketing, row.ai].map((v, vi) => (
                  <div key={vi} className="p-3.5 text-center">
                    <span className={`text-[16px] font-semibold ${v ? 'text-blue-500' : 'text-gray-200'}`}>
                      {v ? '✓' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* When Membership Makes Sense */}
      <div className="bg-[#0D0D10] px-12 py-16 border-y border-white/5">
        <div className="max-w-[1280px] mx-auto grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">When Membership Makes Sense</span>
            </div>
            <h2
              className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px,4vw,42px)', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Membership may be right for you if…
            </h2>
            <ul className="flex flex-col gap-3 text-[14px] font-light leading-[1.75] text-white/55">
              {[
                'your book is published and you want ongoing guidance',
                'you are planning your next title',
                'you want help staying visible',
                'you want support interpreting next steps',
                'you want a continued author relationship',
                'you want access to resources and accountability',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-8">
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-blue-400 mb-3">What Authors Can Expect</div>
            <h3
              className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Care, clarity, and continued connection.
            </h3>
            <p className="text-[15px] font-light text-white/45 leading-[1.8]">
              Membership is meant to provide practical support, clear expectations, and a continued author relationship based on the tier you choose. It is not a promise of automatic growth or sales. Authors still remain responsible for their platform, participation, and follow-through.
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border-y border-blue-100 px-12 py-10">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-[560px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-blue-700 mb-2">Royalty Reporting Visibility</div>
            <p className="text-[14px] text-blue-900/60 leading-[1.7]">
              The royalty reporting dashboard is included in the Support, Marketing, and AI plans. It gives authors clearer visibility into title activity and reporting after publication as part of a continued support relationship.
            </p>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-blue-500 text-white text-[14px] font-semibold px-8 py-3.5 rounded-full hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            Talk With Our Publishing Team ↗
          </a>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-[#0F1C2E] px-12 py-16">
        <div className="max-w-[1280px] mx-auto text-center">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400 mb-4">Final CTA</div>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(34px,4.5vw,46px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.08 }}
          >
            Want support beyond
            <br />
            publication?
          </h2>
          <p className="text-[15px] font-light text-white/45 leading-[1.8] max-w-[660px] mx-auto mb-8">
            Tell us where you are in your author journey and what kind of support you need next. We will help you understand whether membership is the right fit.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600"
            >
              Talk With Our Publishing Team ↗
            </a>
            <Link
              href="/publishing"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-4 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400"
            >
              Publish With Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
