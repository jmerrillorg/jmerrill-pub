import Link from 'next/link'
import Image from 'next/image'
import { division, footerLinks } from '@/lib/tokens'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'

export function Footer() {
  return (
    <footer className="bg-[#0D0D10] border-t border-white/5">
      <div className="max-w-[1280px] mx-auto px-12 pt-20 pb-10">

        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-16 pb-16 border-b border-white/5 mb-10">

          {/* Brand */}
          <div>
            <div className="mb-5">
              <Image
                src="https://www.jmerrill.pub/logo.jpg"
                alt="J Merrill Publishing"
                width={52}
                height={52}
                className="h-13 w-auto opacity-60 invert"
              />
            </div>
            <p className="font-display italic text-[15px] text-white/30 leading-relaxed mb-6 max-w-[280px]">
              Helping Authors Help Themselves — through innovation, integrity, and a collaborative publishing model.
            </p>
            <div className="flex gap-2.5 mb-6">
              {[
                { label: 'f',  href: 'https://www.facebook.com/jmerrillpub' },
                { label: 'ig', href: 'https://www.instagram.com/jmerrillpub/' },
                { label: 'in', href: 'https://www.linkedin.com/company/jmerrillpub/' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 border border-white/10 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold text-white/30 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/8 transition-all duration-200"
                >
                  {s.label}
                </a>
              ))}
            </div>

            {/* JM1 system badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/8 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="font-mono text-[10px] text-white/25 tracking-[0.1em] uppercase">
                A J Merrill One Company
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <FooterCol title="Services"    links={footerLinks.services} />
            <FooterCol title="Company"     links={footerLinks.company} />
            <FooterCol title="Memberships" links={footerLinks.memberships} />
            <FooterCol title="Enterprise"  links={footerLinks.enterprise} external />
          </div>
        </div>

        <div className="mb-10">
          <NewsletterSignup
            title="Join the flagship mailing list"
            description="Receive new title announcements, author spotlights, publishing insights, and future platform updates from J Merrill Publishing."
          />
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[12px] text-white/15">
            © 2026 J Merrill Publishing, Inc. All rights reserved. ·{' '}
            <Link href="/privacy" className="hover:text-blue-400/60 transition-colors">Privacy</Link>
            {' · '}
            <Link href="/terms" className="hover:text-blue-400/60 transition-colors">Terms</Link>
          </p>
          <a
            href="https://www.jmerrill.one"
            className="font-mono text-[11px] text-white/12 hover:text-white/30 transition-colors tracking-[0.06em] flex items-center gap-1.5"
          >
            <span className="w-3 h-px bg-white/15" />
            JMERRILL.ONE
          </a>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
  external = false,
}: {
  title: string
  links: readonly { label: string; href: string }[]
  external?: boolean
}) {
  return (
    <div>
      <h5 className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-white/20 mb-4">
        {title}
      </h5>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {external || link.href.startsWith('http') ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-light text-white/40 hover:text-sky-300 transition-colors duration-200"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-[13px] font-light text-white/40 hover:text-sky-300 transition-colors duration-200"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
