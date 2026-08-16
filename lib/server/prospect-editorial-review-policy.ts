// Engine: Prospect Editorial Review Policy
// Reusable? Y
// Stage-specific exception? N

import { packages } from '../commercial/catalog'
import { renderAuthorCommunicationEmail, validateAuthorCommunicationEmail } from './author-communication-brand'
import { isWorkingTitle } from './working-title-policy'

export type PublishingPackageTier = 'Starter' | 'Professional' | 'Premier'

export type PublishingPackageRecommendation = {
  sku: string
  tier: PublishingPackageTier
  price: number
  priceLabel: string
}

export type ProspectEditorialReviewRecommendation = {
  primary: PublishingPackageRecommendation
  backup: PublishingPackageRecommendation | null
  sourceAuthority: string
}

export type ProspectEditorialReviewCommunicationInput = {
  authorName: string
  titleName: string
  reviewSummary: string
  primaryRecommendation: PublishingPackageRecommendation
  backupRecommendation?: PublishingPackageRecommendation | null
  recommendedImprint?: string | null
  titleSuggestions?: string[]
  primaryActionUrl: string
}

const PACKAGE_ORDER: PublishingPackageTier[] = ['Starter', 'Professional', 'Premier']

const FORBIDDEN_PROSPECT_LANGUAGE = [
  /approve this editorial stage/i,
  /approved with corrections/i,
  /current publishing stage/i,
  /developmental approval/i,
  /fully approve editorial review/i,
  /move to developmental/i,
  /move to the next publishing stage/i,
  /seven-calendar-day review period/i,
]

export function currentPublishingPackageCatalog(): PublishingPackageRecommendation[] {
  return packages.map((pkg) => ({
    sku: pkg.sku,
    tier: pkg.tier as PublishingPackageTier,
    price: pkg.price.amount,
    priceLabel: `$${pkg.price.amount.toLocaleString('en-US')}`,
  }))
}

export function resolveProspectPackageRecommendation(input: {
  recommendedPackage?: string | null
}): ProspectEditorialReviewRecommendation {
  const catalog = currentPublishingPackageCatalog()
  const primary = findPackage(input.recommendedPackage, catalog) || findPackage('Professional', catalog)
  if (!primary) throw new Error('PROSPECT_RECOMMENDATION_BLOCKED:PACKAGE_CATALOG_EMPTY')
  const backup = backupPackageFor(primary.tier, catalog)
  return {
    primary,
    backup,
    sourceAuthority: 'lib/commercial/catalog.ts#packages',
  }
}

export function renderProspectEditorialReviewCommunication(input: ProspectEditorialReviewCommunicationInput) {
  const packageInventory = [
    `Editorial Review Summary for ${input.titleName}`,
    `Primary publishing recommendation: ${input.primaryRecommendation.tier} (${input.primaryRecommendation.priceLabel})`,
    input.backupRecommendation
      ? `Backup publishing recommendation: ${input.backupRecommendation.tier} (${input.backupRecommendation.priceLabel})`
      : 'Backup publishing recommendation: none',
    input.recommendedImprint ? `Recommended imprint: ${input.recommendedImprint}` : 'Recommended imprint: to be confirmed by the publishing team',
  ]
  const titleSuggestionLine = isWorkingTitle(input.titleName)
    ? `Because your project is still using a working title, the publishing team prepared these three title suggestions: ${(input.titleSuggestions || []).join('; ')}.`
    : 'Your current title can remain in use unless you choose to discuss a change with the publishing team.'

  const rendered = renderAuthorCommunicationEmail({
    templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
    templateVersion: '1.0.0',
    subject: `Your Editorial Review & Publishing Recommendation - ${input.titleName}`,
    authorName: input.authorName || 'Author',
    titleName: input.titleName,
    preheader: `Your Editorial Review summary and publishing path recommendation are ready.`,
    why: `We reviewed your submitted manuscript so you can choose the publishing package and path that best fits this project.`,
    completed: [
      input.reviewSummary,
      `Primary recommendation: ${input.primaryRecommendation.tier} Publishing Package (${input.primaryRecommendation.priceLabel}).`,
      input.backupRecommendation
        ? `Backup recommendation: ${input.backupRecommendation.tier} Publishing Package (${input.backupRecommendation.priceLabel}).`
        : 'Backup recommendation: none. Starter recommendations do not include a lower backup package.',
      input.recommendedImprint ? `Recommended imprint: ${input.recommendedImprint}.` : 'Recommended imprint: to be confirmed.',
      titleSuggestionLine,
    ],
    meaning:
      'This recommendation is guidance for choosing a publishing path. It is not acceptance into production, a contract, an invoice, or approval of an editorial stage.',
    authorAction:
      'Choose My Publishing Path: choose the publishing package you want to pursue, or reply with questions if you would like help deciding before agreement and payment steps begin.',
    primaryActionLabel: 'Choose My Publishing Path',
    primaryActionUrl: input.primaryActionUrl,
    packageInventory,
    deadline: 'There is no active-author editorial approval deadline attached to this recommendation.',
    nextSteps: [
      'The publishing team will record your package selection.',
      'Agreement, payment, and onboarding steps happen after you choose a path.',
      'Editorial production work begins only after the commercial onboarding boundary is complete.',
    ],
  })

  const validation = validateProspectEditorialReviewCommunication({
    text: rendered.text,
    html: rendered.html,
    titleName: input.titleName,
    primaryRecommendation: input.primaryRecommendation,
    backupRecommendation: input.backupRecommendation || null,
    titleSuggestions: input.titleSuggestions || [],
  })
  if (!validation.ok) throw new Error(`PROSPECT_EDITORIAL_REVIEW_BLOCKED:${validation.blocker}`)
  const brandValidation = validateAuthorCommunicationEmail({
    html: rendered.html,
    text: rendered.text,
    templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
    templateVersion: '1.0.0',
  })
  if (!brandValidation.ok) throw new Error(`PROSPECT_EDITORIAL_REVIEW_BLOCKED:${brandValidation.blocker}`)
  return rendered
}

export function validateProspectEditorialReviewCommunication(input: {
  text: string
  html?: string
  titleName: string
  primaryRecommendation: PublishingPackageRecommendation
  backupRecommendation?: PublishingPackageRecommendation | null
  titleSuggestions?: string[]
}): { ok: true } | { ok: false; blocker: string } {
  const combined = `${input.text || ''}\n${input.html || ''}`
  for (const phrase of FORBIDDEN_PROSPECT_LANGUAGE) {
    if (phrase.test(combined)) return { ok: false, blocker: `ACTIVE_AUTHOR_LANGUAGE:${phrase.source}` }
  }
  if (!combined.includes(input.primaryRecommendation.tier)) return { ok: false, blocker: 'PRIMARY_RECOMMENDATION_MISSING' }
  if (input.primaryRecommendation.tier === 'Starter' && input.backupRecommendation) {
    return { ok: false, blocker: 'STARTER_BACKUP_MUST_BE_NONE' }
  }
  if (input.backupRecommendation && input.backupRecommendation.sku === input.primaryRecommendation.sku) {
    return { ok: false, blocker: 'BACKUP_MATCHES_PRIMARY' }
  }
  if (isWorkingTitle(input.titleName) && (input.titleSuggestions || []).filter(Boolean).length !== 3) {
    return { ok: false, blocker: 'UNTITLED_REQUIRES_EXACTLY_THREE_TITLE_SUGGESTIONS' }
  }
  if (!/Choose My Publishing Path/i.test(combined)) return { ok: false, blocker: 'PACKAGE_SELECTION_CTA_MISSING' }
  if (/file:\/\/|\/Users\/|\/Volumes\//i.test(combined)) return { ok: false, blocker: 'LOCAL_FILE_LINK_EXPOSED' }
  return { ok: true }
}

function findPackage(value: string | null | undefined, catalog: PublishingPackageRecommendation[]) {
  const normalized = normalizePackage(value)
  return catalog.find((pkg) => normalizePackage(pkg.sku) === normalized || normalizePackage(pkg.tier) === normalized) || null
}

function backupPackageFor(tier: PublishingPackageTier, catalog: PublishingPackageRecommendation[]) {
  if (tier === 'Starter') return null
  const index = PACKAGE_ORDER.indexOf(tier)
  if (index <= 0) return null
  return findPackage(PACKAGE_ORDER[index - 1], catalog)
}

function normalizePackage(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^JMP_PKG_/, '')
    .replace(/^JMP-PKG-/, '')
    .replace(/^PRO$/, 'PROFESSIONAL')
    .replace(/[^A-Z0-9]+/g, '')
}
