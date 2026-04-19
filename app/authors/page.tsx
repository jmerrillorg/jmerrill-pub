import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { AuthorCard } from '@/components/content/AuthorCard'
import { BookCard } from '@/components/content/BookCard'
import { CTASection } from '@/components/content/CTASection'
import { NewsletterSignup } from '@/components/content/NewsletterSignup'
import { bookCatalog, publicAuthorCatalog } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Authors',
  description:
    'Meet the authors published by J Merrill Publishing and explore the books, profiles, and publishing relationships behind the flagship catalog.',
}

export default function AuthorsPage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Author Directory"
        ghost="Authors"
        title={
          <>
            The voices behind
            <br />
            <em className="not-italic italic text-blue-500">the flagship catalog</em>
          </>
        }
        description={`J Merrill Publishing is a relationship-driven publishing home for ${publicAuthorCatalog.length}+ published author profiles. Every profile is designed to strengthen discoverability, context, and long-term authority on jmerrill.pub.`}
        actions={[
          { label: 'Browse books', href: '/books' },
          { label: 'Join the Family', href: '/join' },
        ]}
      />

      <PageSection
        eyebrow="Author Profiles"
        title={
          <>
            A reusable author layer
            <br />
            <em className="not-italic italic text-blue-500">for the full platform</em>
          </>
        }
        description="These profiles are now built from a normalized author model that can grow into richer bios, photography, media assets, and Dataverse-driven author relationship data."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicAuthorCatalog.map((author) => (
            <AuthorCard key={author.slug} author={author} />
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Recent Catalog Highlights"
        title={
          <>
            Books and authors now work
            <br />
            <em className="not-italic italic text-blue-500">as one connected system</em>
          </>
        }
        description="Title pages link back to authors, and author pages link into the catalog. That strengthens both reader experience and domain authority."
        surface="dark"
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {bookCatalog.slice(0, 4).map((book) => (
            <BookCard key={book.id} book={book} compact />
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
              Why author pages matter
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/50">
              A flagship publishing brand needs durable author identity pages, not just book listings.
              This structure gives every author a stronger home for discoverability, media use, future
              growth infrastructure, and cross-linking back into the broader catalog.
            </p>
          </div>
          <NewsletterSignup
            title="Follow the authors"
            description="Get updates on new author profiles, book releases, and flagship publishing announcements."
          />
        </div>
      </PageSection>

      <CTASection
        eyebrow="Become Part of the Catalog"
        title={
          <>
            Want your author profile
            <br />
            on jmerrill.pub?
          </>
        }
        description="Join the Family and we’ll help you move from manuscript to catalog presence with a stronger publishing home behind your work."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Explore publishing', href: '/publishing' }}
      />
    </div>
  )
}
