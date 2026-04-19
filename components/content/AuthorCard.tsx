import Link from 'next/link'
import Image from 'next/image'
import type { AuthorRecord } from '@/lib/content'

export function AuthorCard({ author }: { author: AuthorRecord }) {
  return (
    <Link
      href={`/authors/${author.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_50px_rgba(8,35,71,0.08)]"
    >
      <div className="relative border-b border-gray-100 bg-[#F7F8FA] px-6 py-7">
        <div className="absolute right-6 top-6 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">
          {author.titleCount} title{author.titleCount === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
            {author.photoUrl ? (
              <Image src={author.photoUrl} alt={author.name} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-blue-500">
                {author.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-[24px] text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
              {author.name}
            </h3>
            <p className="text-[12px] text-gray-400">{author.location}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-[14px] font-light leading-[1.8] text-gray-500">{author.shortBio}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {author.specialties.slice(0, 3).map((specialty) => (
            <span key={specialty} className="rounded-full border border-gray-200 bg-[#F7F8FA] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-gray-500">
              {specialty}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-blue-500">
          View author profile -&gt;
        </div>
      </div>
    </Link>
  )
}
