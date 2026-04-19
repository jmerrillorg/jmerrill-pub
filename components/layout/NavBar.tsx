'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { nav } from '@/lib/tokens'

export function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={[
        'fixed left-0 right-0 z-50 h-[76px] flex items-center px-12 transition-all duration-300',
        scrolled
          ? 'bg-white/96 border-b border-gray-200 backdrop-blur-xl shadow-sm'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-0 flex-shrink-0">
        <Image
          src="https://www.jmerrill.pub/logo.jpg"
          alt="J Merrill Publishing"
          width={44}
          height={44}
          className="h-11 w-auto object-contain"
          priority
        />
      </Link>

      {/* Center links */}
      <div className="hidden lg:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
        {nav.primary.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={[
              'text-[13.5px] font-normal tracking-[0.01em] relative pb-0.5',
              'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px',
              'after:bg-blue-500 after:scale-x-0 after:origin-left after:transition-transform after:duration-250',
              'hover:text-blue-500 hover:after:scale-x-100 transition-colors duration-200',
              scrolled ? 'text-charcoal' : 'text-charcoal',
            ].join(' ')}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right CTAs */}
      <div className="ml-auto flex items-center gap-4">
        <a
          href={nav.secondary.href}
          className="hidden lg:block text-[13px] text-gray-500 hover:text-blue-500 transition-colors duration-200"
          target="_blank"
          rel="noopener noreferrer"
        >
          {nav.secondary.label}
        </a>
        <Link
          href={nav.cta.href}
          className="bg-charcoal text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-blue-500 transition-all duration-200 hover:-translate-y-0.5 tracking-[0.02em]"
        >
          {nav.cta.label}
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden flex flex-col gap-1.5 w-6"
          aria-label="Toggle menu"
        >
          <span className={`block h-px bg-charcoal transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-px bg-charcoal transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-px bg-charcoal transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg lg:hidden">
          <div className="flex flex-col px-6 py-6 gap-4">
            {nav.primary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] text-charcoal hover:text-blue-500 transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
              <a
                href={nav.secondary.href}
                className="text-[14px] text-gray-500 hover:text-blue-500 transition-colors"
              >
                {nav.secondary.label}
              </a>
              <Link
                href={nav.cta.href}
                onClick={() => setMobileOpen(false)}
                className="bg-blue-500 text-white text-[14px] font-medium px-5 py-2.5 rounded-full text-center hover:bg-blue-600 transition-colors"
              >
                {nav.cta.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
