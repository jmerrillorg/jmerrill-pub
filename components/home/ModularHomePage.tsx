import { HeroSection } from '@/components/sections/HeroSection'
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

export function ModularHomePage() {
  return (
    <>
      <HeroSection />
      <ChooseYourPathSection />
      <WhyAuthorsChooseSection />
      <HowPublishingWorksSection />
      <BookAnalyzerSection />
      <PackagesSection />
      <FeaturedTitlesSection />
      <ClosingCTA />
    </>
  )
}
