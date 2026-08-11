import { dataverseFormatted, dataverseLookupId, stringValue } from './dataverse-server'
import { normalizeWorkspaceText } from './author-portal-status'

type DataverseRow = Record<string, unknown>

export type CatalogPortfolioState =
  | 'active_pipeline'
  | 'published_catalog'
  | 'external_hold'
  | 'archive_historical'
  | 'synthetic_test'
  | 'certification'
  | 'manual_recovery'
  | 'non_title_operational_artifact'
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

const TEST_TITLE_PATTERNS = [
  /^test\b/i,
  /^case [bc]\b/i,
  /^author_/i,
  /^editorial_/i,
  /^proofreading_/i,
  /^package_/i,
  /^active_/i,
  /^jm1_/i,
  /^jm1\b/i,
  /\bsynthetic\b/i,
]

const CERTIFICATION_TITLE_PATTERNS = [
  /\bcertification\b/i,
  /\bgate-w1\b/i,
  /\bsynthetic certification\b/i,
  /\bpreview synthetic\b/i,
]

const NON_TITLE_OPERATIONAL_PATTERNS = [
  /\bduplicate proof\b/i,
  /\bevidence package\b/i,
  /\bexecution event\b/i,
  /\bsystem validation\b/i,
]

const MANUAL_RECOVERY_PATTERNS = [
  /the general['’]s will and last testament/i,
  /\bmanual recovery\b/i,
  /\bauthoritative_dev_edit_validation_required\b/i,
  /\bJMP-INT-202607-DL2T20\b/i,
]

export function isProductionTitleContaminant(titleName: string) {
  return TEST_TITLE_PATTERNS.some((pattern) => pattern.test(titleName.trim()))
}

export function classifyTitlePortfolio({
  title,
  assets,
  stages,
  productionProjects = [],
}: {
  title: DataverseRow
  assets: DataverseRow[]
  stages: DataverseRow[]
  productionProjects?: DataverseRow[]
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
  const activeProductionProject = productionProjects.find((project) => belongsToProductionTitle(project, title))
  const assetsWithIsbn = assets.filter((asset) => stringValue(asset.jm1pub_isbn13))
  const distributionStatuses = unique(
    assets.map((asset) => formatted(asset, 'jm1pub_distributionstatus')).filter(Boolean),
  )
  const assetFormats = unique(assets.map((asset) => formatted(asset, 'jm1pub_assetformat')).filter(Boolean))
  const isbn13s = unique(assetsWithIsbn.map((asset) => stringValue(asset.jm1pub_isbn13)).filter(Boolean))
  const evidence: string[] = []

  if (isCertificationTitle(titleName)) {
    return {
      state: 'certification',
      label: 'Certification',
      evidence: [`Certification record excluded from default operating counts: ${titleName}`],
      confidence: 'high',
      exceptionReason: 'Certification records remain available only through explicit test/certification views.',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  if (isNonTitleOperationalArtifact(titleName)) {
    return {
      state: 'non_title_operational_artifact',
      label: 'Non-Title Operational Artifact',
      evidence: [`Operational artifact excluded from title operating counts: ${titleName}`],
      confidence: 'high',
      exceptionReason: 'Non-title proof, evidence, and execution records must not become title cards.',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

  if (isProductionTitleContaminant(titleName)) {
    return {
      state: 'synthetic_test',
      label: 'Synthetic / Test',
      evidence: [`Rejected from active title population: ${titleName}`],
      confidence: 'high',
      exceptionReason:
        'Record matches a test fixture or execution-event naming pattern and is hidden from default operating counts.',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
  }

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
  if (activeProductionProject) evidence.push(`active production project: ${stringValue(activeProductionProject.jm1_name)}`)

  if (isManualRecoveryTitle(titleName, evidence)) {
    return {
      state: 'manual_recovery',
      label: 'Manual Recovery',
      evidence: evidence.length ? evidence : [`Manual-recovery record: ${titleName}`],
      confidence: 'high',
      exceptionReason: 'Manual recovery remains a governed lane and must not be counted as ordinary active pipeline automation.',
      catalogStatus: publicCatalogStatus,
      distributionStatus: distributionStatuses.join(', '),
      publicationStatus,
      activeFormats: assetFormats,
      isbn13s,
    }
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

  if (activeProductionProject) {
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
    case 'synthetic_test':
      return 'Synthetic / Test'
    case 'certification':
      return 'Certification'
    case 'manual_recovery':
      return 'Manual Recovery'
    case 'non_title_operational_artifact':
      return 'Non-Title Operational Artifact'
    default:
      return 'Reconciliation Required'
  }
}

function isCertificationTitle(titleName: string) {
  return CERTIFICATION_TITLE_PATTERNS.some((pattern) => pattern.test(titleName.trim()))
}

function isNonTitleOperationalArtifact(titleName: string) {
  return NON_TITLE_OPERATIONAL_PATTERNS.some((pattern) => pattern.test(titleName.trim()))
}

function isManualRecoveryTitle(titleName: string, evidence: string[]) {
  const source = `${titleName} ${evidence.join(' ')}`
  return MANUAL_RECOVERY_PATTERNS.some((pattern) => pattern.test(source))
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

function belongsToProductionTitle(project: DataverseRow, title: DataverseRow) {
  const titleId = dataverseLookupId(title, 'jm1pub_titleid')
  const projectTitleId = dataverseLookupId(project, '_jm1_title_value')
  if (!titleId || projectTitleId !== titleId) return false
  const status = normalizeWorkspaceText(formatted(project, 'jm1_status') || stringValue(project.jm1_status))
  const name = normalizeWorkspaceText(stringValue(project.jm1_name))
  return !status.includes('complete') && !status.includes('cancel') && !name.includes('synthetic')
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
