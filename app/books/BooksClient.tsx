'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookCard } from '@/components/content/BookCard'
import { bookCatalog, imprintCatalog } from '@/lib/content'

const FORMAT_OPTIONS = ['All Formats', 'Paperback', 'Hardcover', 'eBook', 'Audiobook']
const GENRE_OPTIONS = ['All Genres', ...Array.from(new Set(bookCatalog.map((book) => book.genre))).sort()]

const LEGACY_IMPRINT_ALIASES: Record<string, string> = {
  faith: 'JM Works',
  voices: 'JM Works',
  kids: 'JM Little',
  lit: 'JM Works',
  publishing: 'J Merrill Publishing',
  works: 'JM Works',
  little: 'JM Little',
  verse: 'JM Verse',
  signature: 'JM Signature',
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const IMPRINT_OPTIONS = [
  { id: 'all', label: 'All Imprints', name: '' },
  ...imprintCatalog.map((imprint) => ({ id: slugify(imprint), label: imprint, name: imprint })),
]

function resolveImprintParam(value: string | null) {
  if (!value || value === 'all') return 'all'
  const legacy = LEGACY_IMPRINT_ALIASES[value]
  if (legacy) return slugify(legacy)
  const match = IMPRINT_OPTIONS.find((option) => option.id === value || option.name === value)
  return match ? match.id : 'all'
}

export default function BooksClient() {
  const searchParams = useSearchParams()
  const [imprint, setImprint] = useState(resolveImprintParam(searchParams.get('imprint')))
  const [genre, setGenre] = useState('All Genres')
  const [format, setFormat] = useState('All Formats')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showCount, setShowCount] = useState(36)

  useEffect(() => {
    setImprint(resolveImprintParam(searchParams.get('imprint')))
    setShowCount(36)
  }, [searchParams])

  const activeImprint = IMPRINT_OPTIONS.find((option) => option.id === imprint)

  const filtered = useMemo(() => {
    return bookCatalog.filter((book) => {
      if (activeImprint?.name && book.imprint !== activeImprint.name) return false
      if (genre !== 'All Genres' && book.genre !== genre) return false
      if (format !== 'All Formats' && !book.formats.includes(format as never)) return false
      if (
        search &&
        !book.title.toLowerCase().includes(search.toLowerCase()) &&
        !book.authorName.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [activeImprint?.name, format, genre, search])

  const displayed = filtered.slice(0, showCount)

  const counts = useMemo(() => {
    const countMap: Record<string, number> = { all: bookCatalog.length }
    IMPRINT_OPTIONS.filter((option) => option.id !== 'all').forEach((option) => {
      countMap[option.id] = bookCatalog.filter((book) => book.imprint === option.name).length
    })
    return countMap
  }, [])

  const clearFilters = () => {
    setGenre('All Genres')
    setFormat('All Formats')
    setSearch('')
  }

  const fieldBase =
    'rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-white placeholder:text-white/25 transition-colors focus:border-blue-500 focus:outline-none'

  return (
    <div className="min-h-screen bg-[#070710]">
      <div className="sticky top-[76px] z-40 border-b border-white/5 bg-[#070710]/96 px-6 py-4 backdrop-blur sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {IMPRINT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setImprint(option.id)
                    setShowCount(36)
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    imprint === option.id
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-blue-500/40 hover:text-white/70'
                  }`}
                >
                  {option.label}
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${imprint === option.id ? 'bg-white/20' : 'bg-white/5'}`}>
                    {counts[option.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search title or author..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${fieldBase} w-56`}
              />
              <div className="overflow-hidden rounded-lg border border-white/10">
                {(['grid', 'list'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setView(option)}
                    className={`px-3 py-2 text-[13px] transition-colors ${
                      view === option ? 'bg-blue-500 text-white' : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {option === 'grid' ? '⊞' : '≡'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/20">Filter:</span>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setGenre(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                    genre === option
                      ? 'border-white/30 bg-white/15 text-white'
                      : 'border-white/8 text-white/25 hover:border-white/20 hover:text-white/50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-wrap gap-1.5">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setFormat(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                    format === option
                      ? 'border-white/30 bg-white/15 text-white'
                      : 'border-white/8 text-white/25 hover:border-white/20 hover:text-white/50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {(search || genre !== 'All Genres' || format !== 'All Formats') && (
              <button onClick={clearFilters} className="ml-2 text-[11px] text-blue-400/70 transition-colors hover:text-blue-400">
                Clear ×
              </button>
            )}
          </div>

          <div className="font-mono text-[12px] text-white/20">
            {filtered.length} title{filtered.length !== 1 ? 's' : ''}
            {activeImprint?.name && ` · ${activeImprint.name}`}
            {genre !== 'All Genres' && ` · ${genre}`}
            {format !== 'All Formats' && ` · ${format}`}
            {search && ` · "${search}"`}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 py-12 sm:px-12">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mb-4 text-[48px]">📚</div>
            <div className="text-[16px] font-light text-white/40">No titles match your filters.</div>
            <button
              onClick={clearFilters}
              className="mt-4 border-b border-blue-400/30 text-[13px] text-blue-400 transition-colors hover:border-blue-400"
            >
              Clear all filters
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {displayed.map((book) => (
              <BookCard key={book.id} book={book} compact />
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {displayed.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 flex-shrink-0 font-mono text-[11px] text-white/15">{book.displayYear}</div>
                  <div>
                    <div className="text-[15px] font-semibold text-white transition-colors hover:text-blue-400" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                      {book.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-white/35">{book.authorName}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/35">
                    {book.imprint}
                  </span>
                  <span className="text-[10px] text-white/20">{book.genre}</span>
                  {book.formats.map((item) => (
                    <span key={item} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/20">
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {displayed.length < filtered.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setShowCount((count) => count + 24)}
              className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-[13px] font-medium text-white/50 transition-all hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-400"
            >
              Load more ({filtered.length - displayed.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
