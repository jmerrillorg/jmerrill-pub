import type { Metadata } from 'next'
import Link from 'next/link'
import { division } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'About — J Merrill Publishing, Inc.',
  description: 'J Merrill Publishing, Inc. is a full-service publisher founded by Jackie Smith, Jr. in Columbus, OH. Part of the J Merrill One enterprise system.',
}

export default function AboutPage() {
  return (
    <div className="pt-[76px]">

      {/* Hero */}
      <div
        className="relative px-12 py-28 overflow-hidden"
        style={{ background: '#0F1C2E' }}
      >
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(30,144,255,0.12) 0%, transparent 65%)' }}
        />
        {/* Ghost text */}
        <div
          className="absolute -bottom-8 -right-4 pointer-events-none select-none"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '200px', fontWeight: 700, color: 'transparent', WebkitTextStroke: '1px rgba(255,255,255,0.03)', whiteSpace: 'nowrap', letterSpacing: '-0.05em' }}
        >
          Our Story
        </div>
        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-400">About JMP</span>
          </div>
          <h1
            className="text-white mb-5 max-w-[700px]"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            What you write<br />
            <em className="not-italic italic text-blue-500">should not disappear.</em>
          </h1>
          <p className="text-[18px] font-light text-white/45 max-w-[580px] leading-[1.75]">
            J Merrill Publishing exists because authors deserve a publisher that believes in them — not just a service that processes their manuscript.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="px-12 py-20 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-24 items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-blue-500 block" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Our Mission</span>
            </div>
            <h2
              className="text-charcoal mb-6"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,44px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}
            >
              Helping Authors<br />
              <em className="not-italic italic text-blue-500">Help Themselves.</em>
            </h2>
            <p className="text-[16px] font-light text-gray-500 leading-[1.85] mb-5">
              J Merrill Publishing, Inc. is a full-service, author-focused publishing company committed to excellence, empowerment, and inclusivity. Founded by {division.founder} in {division.established}, our mission is to give every author access to professional-grade publishing — without the gatekeeping.
            </p>
            <p className="text-[16px] font-light text-gray-500 leading-[1.85] mb-5">
              We believe every author deserves a publishing home — not just a transaction. We walk with our authors through every stage of their journey: from manuscript evaluation through publication, launch, and long-term career building.
            </p>
            <p className="text-[16px] font-light text-gray-500 leading-[1.85]">
              We believe in transparency, high standards, and publishing solutions that evolve with technology — from AI-powered production to the enterprise-grade distribution infrastructure of the Ingram Content Group, giving our authors access to 450+ distribution channels that most independent publishers can't offer.
            </p>
            <p className="text-[16px] font-light text-gray-500 leading-[1.85]">
              Founded in December 2018 by Jackie Smith Jr. after publishing his first two books, J Merrill Publishing was built on a simple conviction: that authors deserve a true partner — not just a vendor. Authors retain full ownership of their intellectual property. We retain no rights to any manuscript, title, or creative work published through our services. 70% of royalties stay with the author.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {[
              { label: 'Why We Exist',    value: division.why },
              { label: 'Brand Truth',     value: division.tagline },
              { label: 'Theme',           value: division.theme },
              { label: 'Division',        value: `Division ${division.number} — ${division.name}` },
              { label: 'Domain',          value: division.domain },
              { label: 'Parent System',   value: 'J Merrill One Enterprise' },
              { label: 'Headquarters',    value: division.established },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[180px_1fr] gap-4 py-4 border-b border-gray-100">
                <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-gray-400">{item.label}</div>
                <div className="text-[15px] text-charcoal font-light">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 border-y border-gray-200 px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { n: division.stats.titles,    l: 'Published Titles',     sub: 'Across multiple genres and formats' },
            { n: division.stats.services,  l: 'Services Offered',     sub: 'Across 16 categories' },
            { n: division.stats.categories,l: 'Service Categories',   sub: 'Full-spectrum publishing support' },
            { n: division.stats.reach,     l: 'Distribution Reach',   sub: 'Ingram + CoreSource infrastructure' },
          ].map((stat) => (
            <div key={stat.l} className="text-center">
              <div
                className="text-charcoal mb-1"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '52px', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}
              >
                {stat.n}
              </div>
              <div className="text-[15px] font-semibold text-charcoal mb-1">{stat.l}</div>
              <div className="text-[12px] text-gray-400 font-light">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="px-12 py-20 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-blue-500 block" />
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">What We Believe</span>
          </div>
          <h2
            className="text-charcoal mb-14"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(28px,3vw,44px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            The principles that<br />
            <em className="not-italic italic text-blue-500">govern everything we do</em>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Accessibility',   body: 'Professional publishing should not be gatekept. Every author deserves access to the same quality standards and infrastructure as traditionally published authors.' },
              { n: '02', title: 'Ownership',       body: 'Authors own their intellectual property. Full stop. We help you publish your work, not take a piece of what you built.' },
              { n: '03', title: 'Transparency',    body: 'Clear pricing. Clear timelines. Clear deliverables. No surprises, no hidden fees, no scope creep that catches authors off guard.' },
              { n: '04', title: 'Family Culture',  body: 'You are not a transaction. You are a member of a publishing family. We invest in your success because your success reflects ours.' },
              { n: '05', title: 'Innovation',      body: 'Publishing is evolving. AI tools, blockchain, direct-to-reader sales — we stay ahead of the curve so our authors always have access to what\'s next.' },
              { n: '06', title: 'Legacy',          body: 'We are not building a company. We are building the infrastructure for generational legacy — for authors whose words should outlive the moment.' },
            ].map((v) => (
              <div key={v.n} className="p-7 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-blue-sm transition-all duration-200">
                <div className="font-mono text-[10px] text-gray-300 mb-4">{v.n}</div>
                <div className="text-[17px] font-semibold text-charcoal mb-3">{v.title}</div>
                <div className="text-[13px] font-light text-gray-400 leading-[1.7]">{v.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JM1 System */}
      <div className="bg-[#0A1F33] px-12 py-16">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="font-mono text-[10px] text-blue-400 tracking-[0.1em] uppercase">Part of J Merrill One</span>
            </div>
            <h3
              className="text-white mb-4"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}
            >
              One of four divisions.<br />
              <em className="not-italic italic text-blue-500">One unified system.</em>
            </h3>
            <p className="text-[15px] font-light text-white/45 leading-[1.75] mb-6">
              J Merrill Publishing is Division 01 of the J Merrill One enterprise platform — a unified system that also includes J Merrill Financial, J Merrill Foundation, and J Merrill Productions. Every division shares one data layer, one governance model, and one intelligence infrastructure.
            </p>
            <p className="text-[15px] font-light text-white/45 leading-[1.75] mb-8">
              Authors who publish with JMP have a natural pathway into the broader JM1 ecosystem — estate planning to protect their intellectual property, media production to amplify their message, and community impact to extend their legacy.
            </p>
            <a
              href="https://www.jmerrill.one"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
            >
              Explore J Merrill One ↗
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { num: '01', name: 'Publishing',   domain: 'jmerrill.pub',        active: true },
              { num: '02', name: 'Financial',    domain: 'jmerrill.financial',  active: false },
              { num: '03', name: 'Foundation',   domain: 'jmerrill.foundation', active: false },
              { num: '04', name: 'Productions',  domain: 'productions.jmerrill.one', active: false },
            ].map((div) => (
              <div
                key={div.num}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  div.active
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-white/3 border-white/8 hover:border-white/15'
                }`}
              >
                <div className="font-mono text-[10px] text-white/20 mb-2">{div.num}</div>
                <div className="text-[15px] font-semibold text-white mb-1">{div.name}</div>
                <div className="text-[11px] text-white/30 font-mono">{div.domain}</div>
                {div.active && (
                  <div className="mt-2 inline-block text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-mono">Active</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-charcoal px-12 py-20 text-center">
        <h3
          className="text-white mb-4"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          Ready to join the <em className="not-italic italic text-blue-500">family?</em>
        </h3>
        <p className="text-[16px] text-white/40 mb-8 max-w-[400px] mx-auto leading-[1.7]">Tell us about your book and your vision. We'll build a plan around your goals.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/join" className="bg-blue-500 text-white text-[14px] font-semibold px-9 py-4 rounded-full hover:bg-blue-600 transition-colors tracking-[0.03em]">
            Join the Family →
          </Link>
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            className="border border-white/15 text-white/60 text-[14px] px-9 py-4 rounded-full hover:border-blue-500 hover:text-blue-400 transition-all"
          >
            Schedule a Consultation
          </a>
        </div>
      </div>
    </div>
  )
}
