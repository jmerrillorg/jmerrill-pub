import { Fragment } from 'react'
import { HeroSection } from '@/components/sections/HeroSection'
import {
  Ticker,
  PackagesSection,
  ServicesSection,
  DistributionBand,
  MembershipsSection,
  SystemCTA,
  ClosingCTA,
} from '@/components/sections'
import {
  CredibilityStrip,
  PublishingSystemSection,
  FeaturedTitlesSection,
  BookAnalyzerSection,
  AuthorJourneySection,
  ImprintsSection,
  JM1SystemSection,
  PullQuote,
} from '@/components/sections/UpgradedSections'
import { homePageSectionOrder } from '@/lib/site-architecture'
import { HomeArchitectureSection } from '@/components/home/modules/HomeArchitectureSection'
import { HomeFamilyOnboardingSection } from '@/components/home/modules/HomeFamilyOnboardingSection'
import { HomePlatformSection } from '@/components/home/modules/HomePlatformSection'

const sectionRegistry: Record<(typeof homePageSectionOrder)[number], React.ReactNode> = {
  hero: (
    <>
      <HeroSection />
      <CredibilityStrip />
      <Ticker />
    </>
  ),
  'operating-system': <PublishingSystemSection />,
  catalog: (
    <>
      <FeaturedTitlesSection />
      <BookAnalyzerSection />
    </>
  ),
  'author-journey': <AuthorJourneySection />,
  onboarding: <HomeFamilyOnboardingSection />,
  packages: (
    <>
      <PackagesSection />
      <ServicesSection />
      <DistributionBand />
    </>
  ),
  imprints: (
    <>
      <ImprintsSection />
      <PullQuote
        quote="We do not build commodity books. We build publishing systems that give authors structure, visibility, and the confidence to grow."
        attribution="Jackie Smith, Jr. · Founder & CEO · J Merrill One"
      />
    </>
  ),
  architecture: <HomeArchitectureSection />,
  memberships: (
    <>
      <MembershipsSection />
      <JM1SystemSection />
    </>
  ),
  platform: <HomePlatformSection />,
  closing: (
    <>
      <SystemCTA />
      <ClosingCTA />
    </>
  ),
}

export function ModularHomePage() {
  return (
    <>
      {homePageSectionOrder.map((section) => (
        <Fragment key={section}>{sectionRegistry[section]}</Fragment>
      ))}
    </>
  )
}
