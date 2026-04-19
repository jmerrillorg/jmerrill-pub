import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { Cursor } from '@/components/layout/Cursor'
import { ScrollReveal } from '@/components/layout/ScrollReveal'

export const metadata: Metadata = {
  title: {
    template: '%s — J Merrill Publishing, Inc.',
    default:  'J Merrill Publishing, Inc. — Helping Authors Help Themselves',
  },
  description:
    'J Merrill Publishing, Inc. is a full-service publisher helping authors own their intellectual property and reach readers worldwide. 101+ titles in print. 45,000+ global retail outlets via Ingram. Founded 2018, Columbus, Ohio. A J Merrill One company.',
  keywords: [
    'full-service publisher',
    'book publishing',
    'self publishing',
    'J Merrill Publishing',
    'helping authors help themselves',
    'book editing',
    'book design',
    'audiobook production',
    'faith publishing',
    'Christian publishing',
    'Columbus Ohio publisher',
  ],
  authors:   [{ name: 'Jackie Smith, Jr.' }],
  creator:   'J Merrill Publishing, Inc.',
  publisher: 'J Merrill Publishing, Inc.',
  metadataBase: new URL('https://jmerrill.pub'),
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         'https://jmerrill.pub',
    siteName:    'J Merrill Publishing, Inc.',
    title:       'J Merrill Publishing, Inc. — Helping Authors Help Themselves',
    description: 'Full-service publishing for authors who want to own their intellectual property and build lasting legacies.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'J Merrill Publishing, Inc.',
    description: 'Helping authors help themselves.',
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Outfit:wght@200;300;400;500;600;700;900&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {/* JM1 parent system — division top bar */}
        <div className="w-full bg-[#0A1F33] text-white/50 flex items-center justify-between px-6 py-1.5">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
            Division 01 · Publishing
          </span>
          <a
            href="https://www.jmerrill.one"
            className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/40 hover:text-sky-300 transition-colors flex items-center gap-2"
          >
            <span className="w-4 h-px bg-white/20 block" />
            J Merrill One ↗
          </a>
        </div>

        <Cursor />
        <NavBar />
        <main>{children}</main>
        <Footer />
        <ScrollReveal />
      </body>
    </html>
  )
}
