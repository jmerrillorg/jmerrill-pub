import type { Metadata } from 'next'
import Link from 'next/link'
import { memberships } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Author Memberships — Stay Connected. Keep Growing.',
  description: 'Ongoing support plans for authors: Community ($79/mo), Support ($149/mo), Marketing ($199/mo), AI Author Plan ($249/mo). Royalty dashboard included.',
}

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
            Stay connected.<br />
            <em className="not-italic italic text-blue-500">Keep growing.</em>
          </h1>
          <p className="text-[17px] font-light text-white/45 max-w-[560px] leading-[1.75]">
            Ongoing support plans for authors who want more than a one-time publish. Four tiers — from community access to full AI publishing intelligence.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-[#0D0D10] px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Comparison */}
      <div className="px-12 py-20 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Full Comparison</span>
          </div>
          <h2
            className="text-charcoal mb-10"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            What's included — <em className="not-italic italic text-blue-500">tier by tier</em>
          </h2>

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

      {/* Note */}
      <div className="bg-blue-50 border-y border-blue-100 px-12 py-10">
        <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-[560px]">
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-blue-700 mb-2">Royalty Reporting Dashboard</div>
            <p className="text-[14px] text-blue-900/60 leading-[1.7]">
              The royalty reporting dashboard — powered by Microsoft Dataverse and Power BI — is included in the Support, Marketing, and AI plans. It gives authors real-time visibility into sales by title, revenue trends, and platform-level breakdown across all distribution channels.
            </p>
          </div>
          <Link
            href="/join"
            className="flex-shrink-0 bg-blue-500 text-white text-[14px] font-semibold px-8 py-3.5 rounded-full hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  )
}
