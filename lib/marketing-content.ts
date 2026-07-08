import { serviceCategories, comingSoonServices } from '@/data/service-categories'
import { packages } from '@/lib/tokens'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type ServiceCategoryRecord = (typeof serviceCategories)[number]
export type PublishingPackageRecord = (typeof packages)[number] & {
  slug: string
  summary: string
  audience: string
}

export const serviceCatalog = serviceCategories
export const serviceInnovationPipeline = comingSoonServices

export const publishingPackages: PublishingPackageRecord[] = packages.map((pkg) => ({
  ...pkg,
  slug: slugify(pkg.tier),
  summary:
    pkg.tier === 'Starter'
      ? 'A polished entry point for authors who need professional execution without losing ownership.'
      : pkg.tier === 'Professional'
        ? 'The flagship growth tier for authors ready for stronger editorial depth, positioning, and launch support.'
        : 'A high-touch publishing experience for authors building a premium, legacy-driven release.',
  audience:
    pkg.tier === 'Starter'
      ? 'Best for first-time or focused-entry authors.'
      : pkg.tier === 'Professional'
        ? 'Best for authors building momentum and seeking a fuller publishing system.'
        : 'Best for authors pursuing a premium flagship release with elevated support.',
}))
