import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — J Merrill Publishing, Inc.',
}

export default function TermsPage() {
  return (
    <div className="pt-[76px] bg-white min-h-screen">
      <div className="max-w-[800px] mx-auto px-12 py-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-px bg-blue-500 block" />
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Legal</span>
        </div>
        <h1 className="text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Terms of Service
        </h1>
        <p className="text-[13px] text-gray-400 font-mono mb-12">Effective: March 2026 · J Merrill Publishing, Inc.</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] font-light text-gray-600 leading-[1.85]">

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>1. Services</h2>
            <p>J Merrill Publishing, Inc. ("JMP") provides publishing, editorial, design, distribution, and related author services. All services are governed by individual service agreements and project proposals. Submission of an inquiry or join form does not constitute a contract for services.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>2. Intellectual Property</h2>
            <p>Authors retain full ownership of their intellectual property. J Merrill Publishing, Inc. does not claim ownership of any manuscript, title, or creative work submitted to or published through our services. Distribution rights granted to JMP are limited to the scope defined in the author's service agreement.</p>
            <p className="mt-3">Website content, design, branding, and all materials produced by J Merrill Publishing, Inc. are the property of J Merrill Publishing, Inc. and may not be reproduced without written permission.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>3. Author Responsibilities</h2>
            <p>Authors represent that they hold all rights to the content they submit for publication, that the content does not infringe any third-party intellectual property rights, and that all claims, statements, and representations in the work are truthful to the best of their knowledge.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>4. Payments & Refunds</h2>
            <p>Payment terms are defined in individual service agreements. Deposits and milestone payments are non-refundable once the corresponding work stage has begun. Disputes regarding service quality must be raised within 30 days of delivery.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>5. Limitation of Liability</h2>
            <p>J Merrill Publishing, Inc. is not responsible for sales performance, market reception, or revenue generated from published titles. Publishing services are professional services provided in good faith; results vary based on market conditions, content quality, and author platform.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>6. Governing Law</h2>
            <p>These terms are governed by the laws of the State of Ohio. Any disputes shall be resolved in the courts of Franklin County, Ohio.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>7. Contact</h2>
            <p>J Merrill Publishing, Inc. · Columbus, OH · <a href="mailto:publishing@jmerrill.one" className="text-blue-500 border-b border-blue-200 hover:border-blue-500">publishing@jmerrill.one</a></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
          <Link href="/privacy" className="text-[13px] text-blue-500 border-b border-blue-200 hover:border-blue-500">Privacy Policy</Link>
          <Link href="/" className="text-[13px] text-gray-400 border-b border-gray-200 hover:border-gray-400">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
