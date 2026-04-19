import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Book Advertising Services — J Merrill Publishing, Inc.',
  description: "Reach readers on Facebook, Instagram, Google, and beyond through our partnership with Ingram iD — the publishing industry's dedicated advertising platform.",
}

const AD_SERVICES = [
  {
    category: 'Social Media',
    icon: '📱',
    items: [
      {
        name: 'Facebook Ads',
        sku: 'JMP-MKT-ADSSET',
        price: 'Starting at $15/day',
        description: 'With more than 190 million users in the U.S. alone, Facebook is a powerful social tool for reaching audiences of all ages and interests. Ads include an image, advertising copy, and a click-through link displayed directly in users\' Facebook feeds.',
        reach: '190M+ US users',
        format: 'Image + copy + URL',
        platform: 'Facebook',
      },
      {
        name: 'Instagram Promoted Ad',
        sku: 'JMP-MKT-ADSSET',
        price: 'Starting at $15/day',
        description: 'Instagram has over 140 million US users with high engagement rates. Using an image, ad copy, and a URL, your book reaches a diverse, active audience through a platform known for visual discovery.',
        reach: '140M+ US users',
        format: 'Image + copy + URL',
        platform: 'Instagram',
      },
    ],
  },
  {
    category: 'Search',
    icon: '🔍',
    items: [
      {
        name: 'Google Search Ads',
        sku: 'JMP-MKT-ADSSET',
        price: 'Starting at $15/day',
        description: 'Google Search has more than 3.5 billion queries every single day. A Google Search Ad puts your book in front of readers actively searching for books like yours. Text-only ad format based on keywords you select.',
        reach: '3.5B+ daily queries',
        format: 'Text / keyword-based',
        platform: 'Google Search',
      },
      {
        name: 'Google Display Ads',
        sku: 'JMP-MKT-ADSSET',
        price: 'Starting at $15/day',
        description: 'The Google Display Network spans more than 2 million websites. Display ads appear in articles, videos, and websites your audience is already visiting — image, copy, and a click-through link.',
        reach: '2M+ websites',
        format: 'Image + copy + URL',
        platform: 'Google Display',
      },
    ],
  },
  {
    category: 'Promotional Email',
    icon: '✉️',
    items: [
      {
        name: 'Promotional Email Campaign',
        sku: 'JMP-MKT-PRESS',
        price: 'Starting at $1,250',
        description: "Effortlessly send a promotional email showcasing up to 5 books to tens of thousands of readers via Ingram's network of consumer brands. Direct access to Ingram's established reader audience.",
        reach: 'Tens of thousands of readers',
        format: 'Up to 5 books per send',
        platform: 'Ingram Network',
      },
    ],
  },
  {
    category: 'Premium',
    icon: '⭐',
    items: [
      {
        name: 'Premium Email & Custom Packages',
        sku: 'JMP-MKT-LAUNCHKIT',
        price: 'Starting at $4,000',
        description: 'Additional email advertising including featured title listings, email banner ads, and seasonal reading guides. Reach the right audience through Ingram\'s premium reader channels. Contact us for custom packages.',
        reach: 'Targeted reader segments',
        format: 'Featured listings · banners · guides',
        platform: 'Ingram iD Premium',
      },
    ],
  },
]

export default function AdvertisingPage() {
  return (
    <div className="pt-[76px] bg-[#070710] min-h-screen">

      {/* HERO */}
      <div className="relative bg-[#002C54] overflow-hidden px-8 md:px-12 py-20 border-b border-white/5">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 80% 40%, rgba(30,144,255,0.12) 0%, transparent 60%)' }} />
        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#F4B400]" />
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#A3C4DC]"
              style={{ fontFamily: "'DM Mono', monospace" }}>In Partnership with Ingram iD</span>
          </div>
          <h1 className="text-white mb-5"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Reach readers<br />
            <em className="not-italic text-[#1E90FF]">where they are.</em>
          </h1>
          <p className="text-[17px] font-light text-white/45 leading-[1.8] max-w-[540px] mb-10">
            Through our partnership with Ingram iD, J Merrill authors access targeted advertising on Facebook, Instagram, Google, and Ingram's own reader networks — managed by our team.
          </p>
          <div className="flex flex-wrap gap-3">
            {[['190M+','Facebook US users'],['140M+','Instagram US users'],['3.5B+','Google daily queries'],['2M+','Display network sites']].map(([n,l]) => (
              <div key={l} className="bg-white/[0.06] border border-white/8 rounded-xl px-5 py-4 text-center">
                <div className="text-white font-bold mb-1"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '22px', letterSpacing: '-0.02em' }}>{n}</div>
                <div className="text-[11px] text-white/30" style={{ fontFamily: "'DM Mono', monospace" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AD SERVICES */}
      <div className="max-w-[1280px] mx-auto px-8 md:px-12 py-16">

        <div className="flex items-start gap-4 px-6 py-5 bg-[#F4B400]/8 border border-[#F4B400]/20 rounded-2xl mb-12">
          <span className="text-[24px] flex-shrink-0">🤝</span>
          <div>
            <div className="text-[14px] font-semibold text-white mb-1">Ingram iD — Publishing Industry Advertising</div>
            <p className="text-[13px] text-white/45 font-light leading-[1.7]">
              Ingram iD is Ingram Content Group's dedicated book advertising platform. As a J Merrill author, you gain access to these advertising channels at competitive rates, with campaign setup and guidance included. Advertising is available as an add-on to any publishing package.
            </p>
          </div>
        </div>

        {AD_SERVICES.map(cat => (
          <div key={cat.category} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[20px]">{cat.icon}</span>
              <h2 className="text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', fontWeight: 700 }}>{cat.category}</h2>
              <span className="flex-1 h-px bg-white/6" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {cat.items.map(item => (
                <div key={item.name} className="bg-white/[0.03] border border-white/8 rounded-2xl p-7 flex flex-col gap-4 hover:border-white/15 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-white font-semibold text-[17px] leading-[1.25]"
                      style={{ fontFamily: "'Libre Baskerville', serif" }}>{item.name}</h3>
                    <span className="text-[11px] px-2.5 py-1 rounded-full border flex-shrink-0 font-medium text-blue-300 bg-blue-500/10 border-blue-500/20">
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-[14px] text-white/45 font-light leading-[1.75]">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="px-3 py-2.5 bg-white/[0.03] border border-white/6 rounded-xl">
                      <div className="text-[10px] text-white/20 uppercase tracking-[0.08em] mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Reach</div>
                      <div className="text-[13px] text-white/55 font-light">{item.reach}</div>
                    </div>
                    <div className="px-3 py-2.5 bg-white/[0.03] border border-white/6 rounded-xl">
                      <div className="text-[10px] text-white/20 uppercase tracking-[0.08em] mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Format</div>
                      <div className="text-[13px] text-white/55 font-light">{item.format}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/6">
                    <div>
                      <div className="text-[10px] text-white/20 uppercase tracking-[0.08em] mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>Pricing</div>
                      <div className="text-[15px] font-semibold text-[#F4B400]">{item.price}</div>
                    </div>
                    <span className="text-[11px] text-white/20 font-mono">{item.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* How it works */}
        <div className="bg-white/[0.02] border border-white/6 rounded-2xl p-8">
          <h3 className="text-white mb-6"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '22px', fontWeight: 700 }}>
            How It Works
          </h3>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Choose Your Campaign',  body: "Select platforms and budget that match your goals. We'll advise on the right mix for your title and audience." },
              { n: '02', title: 'We Set It Up',           body: 'J Merrill configures your campaign through Ingram iD — creative specs, targeting, keyword selection, and launch.' },
              { n: '03', title: 'Track & Optimize',       body: 'Monitor performance through Ingram iD reporting. Monthly ad guidance available (JMP-MKT-ADSMGT, $250/mo).' },
            ].map(s => (
              <div key={s.n} className="flex flex-col gap-3">
                <div className="text-[11px] text-white/20 font-mono">{s.n}</div>
                <div className="text-[15px] font-semibold text-white">{s.title}</div>
                <div className="text-[13px] text-white/40 font-light leading-[1.7]">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/5 bg-[#002C54] px-8 md:px-12 py-16 text-center">
        <h3 className="text-white mb-3"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Ready to launch your campaign?
        </h3>
        <p className="text-[15px] text-white/40 mb-8 max-w-[420px] mx-auto leading-[1.7]">
          Advertising is available as an add-on to any J Merrill publishing package.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/join"
            className="inline-flex items-center gap-2 bg-[#1E90FF] text-white text-[13px] font-semibold tracking-[0.04em] uppercase px-8 py-4 rounded-full hover:bg-blue-500 transition-all hover:-translate-y-0.5">
            Get Started →
          </Link>
          <a href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            className="inline-flex items-center gap-2 border border-white/15 text-white/55 text-[13px] px-8 py-4 rounded-full hover:border-[#1E90FF]/40 hover:text-[#A3C4DC] transition-all">
            Schedule a Consultation
          </a>
        </div>
        <p className="mt-5 text-[12px] text-white/20">
          Advertising via Ingram iD · pricing shown is platform minimums · contact us for custom packages
        </p>
      </div>
    </div>
  )
}
