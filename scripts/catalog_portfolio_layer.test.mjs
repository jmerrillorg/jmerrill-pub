#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const classifier = readFileSync('lib/server/catalog-portfolio.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const authorContext = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const authorWorkspace = readFileSync('app/author/_components/AuthorPortalWorkspace.tsx', 'utf8')

const expectations = [
  {
    name: 'portfolio classifier defines the required lifecycle states',
    ok:
      classifier.includes("'active_pipeline'") &&
      classifier.includes("'published_catalog'") &&
      classifier.includes("'external_hold'") &&
      classifier.includes("'archive_historical'") &&
      classifier.includes("'reconciliation_required'"),
  },
  {
    name: 'published catalog evidence includes public catalog, backlist, slug, distribution, and ISBN signals',
    ok:
      classifier.includes("normalizedCatalog === 'public'") &&
      classifier.includes("normalizedStage.includes('backlist')") &&
      classifier.includes('Boolean(slug && assets.length > 0)') &&
      classifier.includes('isbn13s.length > 0') &&
      classifier.includes('distribution'),
  },
  {
    name: 'publisher workload only includes active pipeline portfolio items',
    ok:
      publisher.includes("portfolioItem.portfolioState !== 'active_pipeline'") &&
      publisher.includes('portfolio.filter((item) => item.portfolioState ===') &&
      publisher.includes('publishedCatalog: portfolio.filter'),
  },
  {
    name: 'publisher center exposes portfolio metrics and views',
    ok:
      publisher.includes('portfolioPublishedCatalog') &&
      publisher.includes('publishedCatalogMissingIsbn') &&
      authorWorkspace.includes('My Library') &&
      readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8').includes('Published Catalog'),
  },
  {
    name: 'author context groups projects into My Library without changing active package rule',
    ok:
      authorContext.includes('library: {') &&
      authorContext.includes('projectsInProgress') &&
      authorContext.includes('publishedBooks') &&
      authorContext.includes('archivedTitles') &&
      authorContext.includes('authorActionEvidence.authorActionAvailable'),
  },
  {
    name: 'copyedited working manuscript label outranks generic working manuscript label',
    ok:
      authorContext.indexOf("normalized.includes('copyedited')") > -1 &&
      authorContext.indexOf("normalized.includes('copyedited')") < authorContext.indexOf("normalized.includes('working manuscript')"),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
