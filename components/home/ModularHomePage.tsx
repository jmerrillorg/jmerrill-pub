import { HeroSection } from '@/components/sections/HeroSection'
import { FeaturedAuthorPromotion } from '@/components/content/FeaturedAuthorPromotion'
import { getCurrentFeaturedAuthorExperience, resolveFeaturedAuthorTitle } from '@/data/author-experience'
import { catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import { listPublicAuthors, listPublicCatalogTitles } from '@/lib/server/dataverse/catalog'
import {
  PackagesSection,
  ClosingCTA,
} from '@/components/sections'
import {
  ChooseYourPathSection,
  WhyAuthorsChooseSection,
  HowPublishingWorksSection,
  FeaturedTitlesSection,
  BookAnalyzerSection,
} from '@/components/sections/UpgradedSections'

export async function ModularHomePage() {
  const [catalogResult, authorsResult] = await Promise.all([
    listPublicCatalogTitles(),
    listPublicAuthors(),
  ])
  const featuredTitles = catalogResult.ok ? catalogResult.data.slice(0, 12).map(catalogTitleToBookCardRecord) : []
  const currentFeaturedAuthor = getCurrentFeaturedAuthorExperience()
  const currentFeaturedAuthorRecord = currentFeaturedAuthor && authorsResult.ok
    ? authorsResult.data.find((author) => author.slug === currentFeaturedAuthor.slug) || null
    : null
  const currentFeaturedTitle = currentFeaturedAuthor && catalogResult.ok
    ? resolveFeaturedAuthorTitle(currentFeaturedAuthor, catalogResult.data)
    : null

  return (
    <>
      <HeroSection />
      {currentFeaturedAuthor && currentFeaturedAuthorRecord && currentFeaturedTitle ? (
        <FeaturedAuthorPromotion
          featured={currentFeaturedAuthor}
          author={currentFeaturedAuthorRecord}
          title={currentFeaturedTitle}
        />
      ) : null}
      <ChooseYourPathSection />
      <WhyAuthorsChooseSection />
      <HowPublishingWorksSection />
      <BookAnalyzerSection />
      <PackagesSection />
      <FeaturedTitlesSection titles={featuredTitles} unavailable={!catalogResult.ok} />
      <ClosingCTA />
    </>
  )
}
