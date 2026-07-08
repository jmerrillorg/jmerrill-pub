import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { AuthorCard } from '@/components/content/AuthorCard'
import { BookCard } from '@/components/content/BookCard'
import { CTASection } from '@/components/content/CTASection'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'
import { catalogAuthorToCardRecord, catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import { listPublicAuthors, listPublicCatalogTitles } from '@/lib/server/dataverse/catalog'

export const metadata: Metadata = {
  title: 'Authors',
  description:
    'Meet the authors in the J Merrill Publishing family and explore the books, voices, and stories behind the work.',
}

export const dynamic = 'force-dynamic'

function CatalogUnavailable() {
  return (
    <PageSection
      eyebrow="Author Directory"
      title={
        <>
          The author directory is
          <br />
          <em className="not-italic italic text-blue-500">being refreshed.</em>
        </>
      }
      description="Author profiles are served from the J Merrill Publishing enterprise records system. Please check back soon or contact us if you need help finding an author."
    >
      <div className="flex flex-wrap gap-3">
        <Link href="/contact" className="rounded-full bg-blue-500 px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600">
          Contact J Merrill Publishing
        </Link>
        <Link href="/books" className="rounded-full border border-gray-300 px-7 py-3 text-[13px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500">
          Browse Books
        </Link>
      </div>
    </PageSection>
  )
}

export default async function AuthorsPage() {
  const [authorsResult, titlesResult] = await Promise.all([
    listPublicAuthors(),
    listPublicCatalogTitles(),
  ])
  const authors = authorsResult.ok ? authorsResult.data : []
  const featuredTitles = titlesResult.ok ? titlesResult.data.slice(0, 4) : []
  const unavailable = !authorsResult.ok

  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Meet The Authors"
        ghost="Authors"
        title={
          <>
            Meet the authors in
            <br />
            <em className="not-italic italic text-blue-500">the JMP family</em>
          </>
        }
        description="Every book begins with a person — a voice, a message, a story, a calling, or a lived experience. These are some of the authors who trusted J Merrill Publishing to help bring their work into the world."
        actions={[
          { label: 'Tell Us About Your Book', href: '/join' },
          { label: 'Explore the Books', href: '/books' },
        ]}
      />

      <PageSection
        eyebrow="The People Behind The Books"
        title={
          <>
            Every title carries
            <br />
            <em className="not-italic italic text-blue-500">a name</em>
          </>
        }
        description="The catalog is more than a list of books. It is a record of people who chose to publish their words with care, ownership, and professional support. Some came with ministry. Some came with memoir. Some came with children’s stories, poetry, fiction, business insight, or legacy work. Each author brought something that mattered."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            'Authors are not inventory. Their books are attached to lives, messages, and real callings.',
            'JMP exists to help authors carry the work forward with visibility, care, and professional preparation.',
            'The author remains visible. The publisher should strengthen the name behind the book, not hide it.',
          ].map((item) => (
            <div key={item} className="rounded-[28px] border border-[#0F1C2E]/10 bg-[#F8FAFD] p-7 shadow-[0_18px_45px_rgba(15,28,46,0.06)]">
              <p className="text-[15px] font-light leading-[1.8] text-[#0F1C2E]/70">{item}</p>
            </div>
          ))}
        </div>
      </PageSection>

      {unavailable ? (
        <CatalogUnavailable />
      ) : (
        <PageSection
          eyebrow="Author Directory"
          title={
            <>
              Real authors.
              <br />
              <em className="not-italic italic text-blue-500">Real books.</em>
            </>
          }
          description="Explore the authors whose books are part of the J Merrill Publishing family. Their profiles connect readers to the people behind the work and give every title a visible home."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.slug} author={catalogAuthorToCardRecord(author)} />
            ))}
          </div>
        </PageSection>
      )}

      <PageSection
        eyebrow="Why This Matters"
        title={
          <>
            When you are choosing a publisher,
            <br />
            <em className="not-italic italic text-blue-500">look at how they treat authors</em>
          </>
        }
        description="A publisher’s catalog should show more than output. It should show care, continuity, and respect for the people behind the books. For authors considering JMP, this page is proof that your name and work can have a visible home here."
        surface="dark"
      >
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
              Why author visibility matters
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/50">
              When a publisher makes its authors visible, it communicates something important:
              the work matters, the person behind it matters, and the relationship does not end
              when the files are delivered.
            </p>
          </div>
          <NewsletterSignup
            title="Follow the authors"
            description="Get updates on new author profiles, book releases, and the voices shaping the JMP publishing family."
          />
        </div>
      </PageSection>

      <PageSection
        eyebrow="Larger Legacy"
        title={
          <>
            One book can become part of
            <br />
            <em className="not-italic italic text-blue-500">a larger author story</em>
          </>
        }
        description="Some authors publish one important work. Others build a catalog over time. Some expand into speaking, ministry, education, business, or community impact. However the journey grows, the author remains at the center."
      >
        {featuredTitles.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featuredTitles.map((book) => (
              <BookCard key={book.id} book={catalogTitleToBookCardRecord(book)} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-gray-200 bg-[#F8FAFD] px-6 py-8 text-[15px] font-light text-gray-500">
            Featured catalog titles are temporarily unavailable while the enterprise catalog refreshes.
          </div>
        )}
      </PageSection>

      <CTASection
        eyebrow="Final CTA"
        title={
          <>
            Could your book
            <br />
            belong here?
          </>
        }
        description="Tell us about your book, your message, and where you are in the journey. We will help you understand the publishing path that fits."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Publish With Us', href: '/publishing' }}
      />
    </div>
  )
}
