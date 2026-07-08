import { HeroSection } from '@/components/sections/HeroSection'
import { catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import { listPublicCatalogTitles } from '@/lib/server/dataverse/catalog'
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
  const catalogResult = await listPublicCatalogTitles()
  const featuredTitles = catalogResult.ok ? catalogResult.data.slice(0, 12).map(catalogTitleToBookCardRecord) : []

  return (
    <>
      <HeroSection />
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
