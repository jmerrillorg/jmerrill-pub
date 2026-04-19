import Link from 'next/link'
import Image from 'next/image'
import type { BookRecord } from '@/lib/content'

const IMPRINT_STYLES: Record<string, { pill: string; gradient: string }> = {
  'J Merrill Publishing': {
    pill: 'border-blue-700/30 bg-blue-950/60 text-blue-200',
    gradient: 'linear-gradient(145deg,#0F1C2E,#070710)',
  },
  'JM Little': {
    pill: 'border-amber-700/40 bg-amber-900/50 text-amber-200',
    gradient: 'linear-gradient(145deg,#342012,#180d06)',
  },
  'JM Verse': {
    pill: 'border-violet-700/40 bg-violet-900/50 text-violet-200',
    gradient: 'linear-gradient(145deg,#20183e,#0f1025)',
  },
  'JM Signature': {
    pill: 'border-sky-700/40 bg-sky-950/60 text-sky-200',
    gradient: 'linear-gradient(145deg,#102738,#08141d)',
  },
  'JM Works': {
    pill: 'border-teal-700/40 bg-teal-950/50 text-teal-200',
    gradient: 'linear-gradient(145deg,#10291f,#081410)',
  },
}

export function BookCard({ book, compact = false }: { book: BookRecord; compact?: boolean }) {
  const style = IMPRINT_STYLES[book.imprint] || {
    pill: 'border-blue-700/30 bg-blue-950/60 text-blue-200',
    gradient: 'linear-gradient(145deg,#0F1C2E,#070710)',
  }
  const coverIsRemote = book.coverUrl.startsWith('http')

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/8 bg-[#0B1320] transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_16px_50px_rgba(30,144,255,0.18)]">
      <Link href={`/books/${book.id}`} className="block">
        <div className="relative aspect-[3/4]" style={{ background: style.gradient }}>
          <div className="absolute inset-0 bg-[#08101d]" />
          {book.coverUrl ? (
            <div className="absolute inset-3 rounded-[16px] bg-white shadow-[0_16px_32px_rgba(0,0,0,0.28)]">
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-contain p-2.5"
                sizes="(max-width: 768px) 50vw, 20vw"
                unoptimized={coverIsRemote}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                <Image
                  src="/logo.jpg"
                  alt="J Merrill Publishing logo"
                  fill
                  className="object-contain"
                  sizes="96px"
                  style={{ opacity: 0.92 }}
                />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.1em] ${style.pill}`}>
              {book.imprint.replace('J Merrill ', '')}
            </span>
            <h3
              className="mt-3 line-clamp-2 text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: compact ? '16px' : '18px', fontWeight: 700, lineHeight: 1.2 }}
            >
              {book.title}
            </h3>
            <p className="mt-1 text-[12px] text-white/55">{book.authorName}</p>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className={`text-gray-400 ${compact ? 'line-clamp-2 text-[12px]' : 'line-clamp-3 text-[13px]'} font-light leading-[1.7]`}>
          {book.shortDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {book.formats.map((format) => (
            <span key={format} className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] text-white/35">
              {format}
            </span>
          ))}
        </div>
        {book.availablePurchaseLinks.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {book.availablePurchaseLinks.slice(0, compact ? 1 : 2).map((link) => (
              <a
                key={link.retailer}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  link.retailer === 'amazon'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'border border-white/10 bg-white/[0.03] text-white/55 hover:border-blue-500/30 hover:text-blue-300'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-auto pt-5">
          <Link href={`/books/${book.id}`} className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-400">
            View title -&gt;
          </Link>
        </div>
      </div>
    </article>
  )
}
