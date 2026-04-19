import { MetadataRoute } from 'next'
import { authorCatalog, bookCatalog } from '@/lib/content'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://jmerrill.pub'

  const staticPages = [
    { url: base,                              priority: 1.0,  changeFrequency: 'weekly'  as const },
    { url: `${base}/services`,               priority: 0.9,  changeFrequency: 'monthly' as const },
    { url: `${base}/packages`,               priority: 0.9,  changeFrequency: 'monthly' as const },
    { url: `${base}/books`,                  priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/authors`,                priority: 0.8,  changeFrequency: 'weekly'  as const },
    { url: `${base}/about`,                  priority: 0.7,  changeFrequency: 'monthly' as const },
    { url: `${base}/author-journey`,         priority: 0.8,  changeFrequency: 'monthly' as const },
    { url: `${base}/memberships`,            priority: 0.7,  changeFrequency: 'monthly' as const },
    { url: `${base}/publishing-partner`,     priority: 0.8,  changeFrequency: 'monthly' as const },
    { url: `${base}/publishing`,             priority: 0.9,  changeFrequency: 'monthly' as const },
    { url: `${base}/join`,                   priority: 0.9,  changeFrequency: 'monthly' as const },
    { url: `${base}/contact`,                priority: 0.8,  changeFrequency: 'monthly' as const },
    { url: `${base}/distribution`,           priority: 0.7,  changeFrequency: 'monthly' as const },
    { url: `${base}/platform`,               priority: 0.6,  changeFrequency: 'monthly' as const },
    { url: `${base}/advertising`,            priority: 0.6,  changeFrequency: 'monthly' as const },
    { url: `${base}/privacy`,               priority: 0.3,  changeFrequency: 'yearly'  as const },
    { url: `${base}/terms`,                 priority: 0.3,  changeFrequency: 'yearly'  as const },
  ]

  const bookPages = bookCatalog.map(book => ({
    url: `${base}/books/${book.id}`,
    priority: 0.6 as number,
    changeFrequency: 'yearly' as const,
    lastModified: book.year ? new Date(`${book.year}-01-01`) : undefined,
  }))

  const authorPages = authorCatalog.map(author => ({
    url: `${base}/authors/${author.slug}`,
    priority: 0.6 as number,
    changeFrequency: 'monthly' as const,
  }))

  return [...staticPages, ...bookPages, ...authorPages]
}
