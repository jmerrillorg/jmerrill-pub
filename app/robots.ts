import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://jmerrill.pub/sitemap.xml',
    host: 'https://jmerrill.pub',
  }
}
