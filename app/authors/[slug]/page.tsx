import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CTASection } from '@/components/content/CTASection'
import { BookCard } from '@/components/content/BookCard'
import { authorCatalog, getAuthorBySlug } from '@/lib/content'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  return authorCatalog.map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = getAuthorBySlug(params.slug)
  if (!author) return { title: 'Author Not Found' }

  return {
    title: author.name,
    description: author.shortBio,
  }
}

export default function AuthorProfilePage({ params }: Props) {
  const author = getAuthorBySlug(params.slug)
  if (!author) notFound()

  return (
    <div className="pt-[76px]">
      <section className="relative overflow-hidden border-b border-white/5 bg-[#0F1C2E] px-6 py-20 sm:px-12">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(30,144,255,0.14) 0%, transparent 65%)' }}
        />
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <Link href="/authors" className="inline-flex items-center gap-2 text-[13px] text-white/30 transition-colors hover:text-blue-400">
            ← Back to Authors
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-[280px_1fr] lg:items-center">
            <div className="relative h-[320px] overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03]">
              {author.photoUrl ? (
                <Image src={author.photoUrl} alt={author.name} fill className="object-cover" sizes="280px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[72px] font-semibold text-blue-400">
                  {author.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-8 bg-blue-500" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">Author Profile</span>
              </div>
              <h1
                className="text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                {author.name}
              </h1>
              <p className="mt-5 max-w-[760px] text-[18px] font-light leading-[1.8] text-white/50">{author.longBio}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Titles in catalog', value: String(author.titleCount) },
                  { label: 'Primary genres', value: author.genres.slice(0, 2).join(', ') || 'Publishing catalog' },
                  { label: 'Imprints', value: author.imprints.slice(0, 2).join(', ') },
                  { label: 'Location', value: author.location },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white/20">{item.label}</div>
                    <div className="text-[13px] font-light text-white/65">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 sm:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-12 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-8 bg-blue-500" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-500">Catalog Presence</span>
              </div>
              <h2
                className="text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, lineHeight: 1.08 }}
              >
                Books by
                <br />
                <em className="not-italic italic text-blue-500">{author.name}</em>
              </h2>
            </div>
            <blockquote className="rounded-[24px] border border-gray-200 bg-[#F7F8FA] p-6 text-[15px] font-light leading-[1.8] text-gray-500">
              “{author.featuredQuote}”
            </blockquote>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {author.books.map((book) => (
              <BookCard key={book.id} book={book} compact />
            ))}
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Author Growth Infrastructure"
        title={
          <>
            Author pages are now part of
            <br />
            the flagship platform
          </>
        }
        description="This profile structure is ready for richer bios, photos, media kits, quotes, and future Dataverse-driven author relationship data."
        primary={{ label: 'Browse all authors', href: '/authors' }}
        secondary={{ label: 'Join the Family', href: '/join' }}
        dark={false}
      />
    </div>
  )
}
