import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — J Merrill Publishing, Inc.',
}

export default function PrivacyPage() {
  return (
    <div className="pt-[76px] bg-white min-h-screen">
      <div className="max-w-[800px] mx-auto px-12 py-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-px bg-blue-500 block" />
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-blue-500">Legal</span>
        </div>
        <h1 className="text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '40px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Privacy Policy
        </h1>
        <p className="text-[13px] text-gray-400 font-mono mb-12">Effective: March 2026 · J Merrill Publishing, Inc.</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] font-light text-gray-600 leading-[1.85]">

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>1. Information We Collect</h2>
            <p>J Merrill Publishing, Inc. collects information you provide directly when you submit an inquiry, join our author family, apply for the Publishing Partner Program, or communicate with us. This includes your name, email address, phone number, and information about your book project.</p>
            <p className="mt-3">We also collect standard web analytics data (page views, referral sources, browser type) through privacy-respecting analytics tools. We do not use cookies for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>2. How We Use Your Information</h2>
            <p>Information you provide is used to respond to your inquiry, manage your publishing project, communicate about your services, and improve our offerings. We store author and project data in Microsoft Dataverse as part of the J Merrill One enterprise infrastructure.</p>
            <p className="mt-3">We do not sell, rent, or share your personal information with third parties for marketing purposes. We do not run advertising on this site, and we do not allow advertisers to access author data.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>3. Data Storage & Security</h2>
            <p>Your data is stored in Microsoft Azure and Microsoft Dataverse infrastructure — enterprise-grade, SOC 2 compliant, and governed by the J Merrill One data architecture. We take reasonable technical and organizational measures to protect your personal information against unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>4. Your Rights</h2>
            <p>You have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact us at <a href="mailto:publishing@jmerrill.one" className="text-blue-500 border-b border-blue-200 hover:border-blue-500">publishing@jmerrill.one</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>5. Third-Party Services</h2>
            <p>We use Microsoft Bookings for consultation scheduling. We distribute titles through the Ingram Content Group (IngramSpark, CoreSource, Lightning Source) and their associated retail partners. These services operate under their own privacy policies.</p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold text-charcoal mb-3" style={{ fontFamily: "'Libre Baskerville', serif" }}>6. Contact</h2>
            <p>J Merrill Publishing, Inc. · Columbus, OH · <a href="mailto:publishing@jmerrill.one" className="text-blue-500 border-b border-blue-200 hover:border-blue-500">publishing@jmerrill.one</a></p>
            <p className="mt-3">For questions about this policy or the J Merrill One enterprise data practices, contact us directly.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
          <Link href="/terms" className="text-[13px] text-blue-500 border-b border-blue-200 hover:border-blue-500">Terms of Service</Link>
          <Link href="/" className="text-[13px] text-gray-400 border-b border-gray-200 hover:border-gray-400">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
