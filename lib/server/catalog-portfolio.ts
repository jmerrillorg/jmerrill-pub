import { dataverseFormatted, dataverseLookupId, stringValue } from './dataverse-server'
import { normalizeWorkspaceText } from './author-portal-status'

type DataverseRow = Record<string, unknown>

export type CatalogPortfolioState =
  | 'active_pipeline'
  | 'published_catalog'
  | 'external_hold'
  | 'archive_historical'
  | 'reconciliation_required'

export type CatalogPortfolioClassification = {
  state: CatalogPortfolioState
  label: string
  evidence: string[]
  confidence: 'high' | 'medium' | 'low'
  exceptionReason?: string
  catalogStatus?: string
  distributionStatus?: string
  publicationStatus?: string
  activeFormats: string[]
  isbn13s: string[]
  publicationDate?: string
  edition?: string
}

const ACTIVE_STAGE_STATUSES = new Set([
  'not started',
  'in progress',
  'active',
  'ready for author review',
  'awaiting author response',
  'author review',
  'internal qa',
])

const COMPLETED_STAGE_STATUSES = new Set(['complete', 'completed', 'delivered', 'approved'])

export function classifyTitlePortfolio({
  title,
  assets,
  stages,
}: {
  title: DataverseRow
  assets: DataverseRow[]
  stages: DataverseRow[]
}): CatalogPortfolioClassification {
  const titleStage = formatted(title, 'jm1pub_stage')
  const publicCatalogStatus = formatted(title, 'jm1pub_publiccatalogstatus')
  const publicationStatus = stringValue(title.jm1pub_publicationstatus)
  const titleName = stringValue(title.jm1pub_titlename || title.jm1pub_name)
  const slug = stringValue(title.jm1pub_slug)
  const normalizedStage = normalizeWorkspaceText(titleStage)
  const normalizedPublicationStatus = normalizeWorkspaceText(publicationStatus)
  const normalizedCatalog = normalizeWorkspaceText(publicCatalogStatus)
  const relatedStages = stages.filter((stage) => belongsToTitle(stage, title, assets))
  const activeStage = relatedStages.find((stage) => isActiveEditorialStage(stage))
  const assetsWithIsbn = assets.filter((asset) => stringValue(asset.jm1pub_isbn13))
  const distributionStatuses = unique(
    assets.map((asset) => formatted(asset, 'jm1pub_distributionstatus')).filter(Boolean),
  )
  const assetFormats = unique(assets.map((asset) => formatted(asset, 'jm1pub_assetformat')).filter(Boolean))
  const isbn13s = unique(assetsWithIsbn.map((asset) => stringValue(asset.jm1pub_isbn13)).filter(Boolean))
  const evidence: string[] = []

  if (titleStage) evidence.push(`title stage: ${titleStage}`)
  if (publicCatalogStatus) evidence.push(`public catalog status: ${publicCatalogStatus}`)
  if (publicationStatus) evidence.push(`publication status: ${publicationStatus}`)
  if (slug) evidence.push(`catalog slug: ${slug}`)
  if (isbn13s.length) evidence.push(`ISBN-13 present: ${isbn13s.join(', ')}`)
  if (distributionStatuses.length) evidence.push(`distribution status: ${distributionStatuses.join(', ')}`)
  if (activeStage) {
    evidence.push(
      `active editorial stage: ${stringValue(activeStage.jm1pub_name)} / ${formatted(activeStage, 'jm1pub_stagestatus')}`,
    )
  }

  if (
    normalizedStage.includes('archive') ||
    normalizedStage.includes('historical') ||
    normalizedPublicationStatus.includes('archive') ||
    normalizedPublicationStatus.includes('retired') ||
    normalizedPublicationStatus.includes('withdrawn')
  ) {
    return {
      state: 'archive_historical',
      label: 'Archive / Historical',
      evidence,
      confidence: evidence.length ? 'high' : 'medium',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  if (activeStage) {
    return {
      state: 'active_pipeline',
      label: 'Active Pipeline',
      evidence,
      confidence: 'high',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  if (hasPublishedCatalogEvidence({ normalizedStage, normalizedCatalog, normalizedPublicationStatus, slug, isbn13s, assets })) {
    return {
      state: 'published_catalog',
      label: 'Published Catalog',
      evidence,
      confidence: normalizedStage.includes('backlist') || normalizedStage.includes('published') ? 'high' : 'medium',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  if (
    normalizedStage.includes('hold') ||
    normalizedStage.includes('ongoing') ||
    normalizedPublicationStatus.includes('hold') ||
    normalizedPublicationStatus.includes('pause')
  ) {
    return {
      state: 'external_hold',
      label: 'External Hold',
      evidence,
      confidence: evidence.length ? 'medium' : 'low',
      exceptionReason: 'Current Core evidence indicates an ongoing relationship or external dependency, but no active stage is open.',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  return {
    state: 'reconciliation_required',
    label: 'Reconciliation Required',
    evidence: evidence.length ? evidence : [`No deterministic portfolio evidence found for ${titleName || 'untitled record'}.`],
    confidence: 'low',
    exceptionReason: 'Missing active-stage, distribution, publication, archive, or hold evidence.',
    catalogStatus: publicCatalogStatus,
    distributionStatus: distributionStatuses.join(', '),
    publicationStatus,
    activeFormats: assetFormats,
    isbn13s,
  }
}

export function portfolioBadge(state: CatalogPortfolioState) {
  switch (state) {
    case 'active_pipeline':
      return 'Active Pipeline'
    case 'published_catalog':
      return 'Published Catalog'
    case 'external_hold':
      return 'External Hold'
    case 'archive_historical':
      return 'Archive / Historical'
    default:
      return 'Reconciliation Required'
  }
}

export function isPublishedCatalog(classification: CatalogPortfolioClassification) {
  return classification.state === 'published_catalog'
}

export function isActivePipeline(classification: CatalogPortfolioClassification) {
  return classification.state === 'active_pipeline'
}

function hasPublishedCatalogEvidence({
  normalizedStage,
  normalizedCatalog,
  normalizedPublicationStatus,
  slug,
  isbn13s,
  assets,
}: {
  normalizedStage: string
  normalizedCatalog: string
  normalizedPublicationStatus: string
  slug: string
  isbn13s: string[]
  assets: DataverseRow[]
}) {
  return (
    normalizedStage.includes('backlist') ||
    normalizedStage.includes('published') ||
    normalizedCatalog === 'public' ||
    normalizedPublicationStatus.includes('published') ||
    normalizedPublicationStatus.includes('distribution') ||
    Boolean(slug && assets.length > 0) ||
    isbn13s.length > 0
  )
}

function belongsToTitle(stage: DataverseRow, title: DataverseRow, assets: DataverseRow[]) {
  const titleId = dataverseLookupId(title, 'jm1pub_titleid')
  const stageTitleId = dataverseLookupId(stage, '_jm1pub_titleid_value')
  if (titleId && stageTitleId === titleId) return true

  const stageAssetId = dataverseLookupId(stage, '_jm1pub_publishingassetid_value')
  return assets.some((asset) => stageAssetId && dataverseLookupId(asset, 'jm1pub_publishingassetid') === stageAssetId)
}

function isActiveEditorialStage(stage: DataverseRow) {
  const type = normalizeWorkspaceText(formatted(stage, 'jm1pub_stagetype') || stringValue(stage.jm1pub_name))
  const status = normalizeWorkspaceText(formatted(stage, 'jm1pub_stagestatus'))
  if (!type || type.includes('archive')) return false
  if (ACTIVE_STAGE_STATUSES.has(status)) return true
  if (COMPLETED_STAGE_STATUSES.has(status)) {
    const summary = normalizeWorkspaceText(stringValue(stage.jm1pub_authorsafesummary))
    return summary.includes('author review') || summary.includes('ready for your review')
  }
  return false
}

function formatted(row: DataverseRow, field: string) {
  return dataverseFormatted(row, field) || stringValue(row[field])
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}
