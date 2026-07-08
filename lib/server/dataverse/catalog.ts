import type {
  CatalogAuthorDetail,
  CatalogAuthorSummary,
  CatalogReadResult,
  CatalogStats,
  CatalogTitleDetail,
  CatalogTitleSummary,
} from '@/lib/catalog/types'

type DataverseCatalogConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  resourceUrl: string
  environmentUrl?: string
  webApiBaseUrl: string
  titleEntitySet: string
}

type DataverseRecord = Record<string, unknown>

const DEFAULT_ENTITY_SETS = {
  titles: 'jm1pub_titles',
}

const TITLE_SELECT = [
  'jm1pub_titleid',
  'jm1pub_titlename',
  'jm1pub_imprint',
  '_jm1_primaryauthor_value',
  'jm1_summary',
  'jm1_subtitle',
  'jm1_slug',
  'jm1_releasedate',
  'jm1_genre',
  'jm1pub_status',
]

export async function listPublicCatalogTitles(): Promise<CatalogReadResult<CatalogTitleSummary[]>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
      orderby: 'jm1pub_titlename asc',
    })

    const summaries = titleRows.map((row) => buildTitleSummary(row))
    return summaries.filter((title) => title.title)
  })
}

export async function getPublicCatalogTitleBySlug(slug: string): Promise<CatalogReadResult<CatalogTitleDetail | null>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
      orderby: 'jm1pub_titlename asc',
    })

    const summaries = titleRows.map((row) => buildTitleSummary(row))
    const summary = summaries.find((title) => title.slug === slug || title.id === slug)
    if (!summary) return null

    const relatedTitles = summaries
      .filter((title) => title.id !== summary.id && title.certifiedImprint === summary.certifiedImprint)
      .slice(0, 4)

    return {
      ...summary,
      longDescription: stringField(titleRows.find((row) => stringField(row, 'jm1pub_titleid') === summary.id) || {}, 'jm1_summary'),
      series: '',
      seriesOrder: null,
      keywords: buildKeywords(summary),
      marketplaceIdentifiers: [],
      relatedTitles,
    }
  })
}

export async function listPublicAuthors(): Promise<CatalogReadResult<CatalogAuthorSummary[]>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
      orderby: 'jm1pub_titlename asc',
    })

    const titles = titleRows.map((row) => buildTitleSummary(row))
    return buildAuthorSummaries(titles)
  })
}

export async function getPublicAuthorBySlug(slug: string): Promise<CatalogReadResult<CatalogAuthorDetail | null>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
      orderby: 'jm1pub_titlename asc',
    })

    const titles = titleRows.map((row) => buildTitleSummary(row))
    const summaries = buildAuthorSummaries(titles)
    const summary = summaries.find((author) => author.slug === slug)
    if (!summary) return null

    const authorTitles = titles.filter((title) => title.authors.some((author) => author.slug === summary.slug))

    return {
      ...summary,
      longBio: summary.shortBio,
      location: '',
      specialties: summary.genres,
      titles: authorTitles,
    }
  })
}

export async function listTitlesByCertifiedImprint(imprint: string): Promise<CatalogReadResult<CatalogTitleSummary[]>> {
  return withCatalogRead(async (config, token) => {
    const rows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
      orderby: 'jm1pub_titlename asc',
    })

    return rows
      .map((row) => buildTitleSummary(row))
      .filter((title) => title.certifiedImprint === imprint)
  })
}

export async function getCatalogStats(): Promise<CatalogReadResult<CatalogStats>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: 'statecode eq 0',
    })
    const titles = titleRows.map((row) => buildTitleSummary(row))
    const authors = buildAuthorSummaries(titles)

    return {
      totalTitles: titles.length,
      activeAuthors: authors.length,
      imprintCount: new Set(titles.map((title) => title.certifiedImprint).filter(Boolean)).size,
      lastUpdated: new Date().toISOString(),
    }
  })
}


function buildAuthorSummaries(titles: CatalogTitleSummary[]): CatalogAuthorSummary[] {
  const bySlug = new Map<string, CatalogAuthorSummary>()

  for (const title of titles) {
    for (const link of title.authors) {
      if (!link.name) continue
      const slug = link.slug || slugify(link.name)
      const current = bySlug.get(slug) || {
        contactId: link.contactId,
        slug,
        name: link.name,
        shortBio: 'J Merrill Publishing author family.',
        photoUrl: '',
        titleCount: 0,
        genres: [],
        imprints: [],
      }
      current.titleCount += 1
      current.genres = Array.from(new Set([...current.genres, title.genre].filter(Boolean))).sort()
      current.imprints = Array.from(new Set([...current.imprints, title.certifiedImprint].filter(Boolean))).sort()
      bySlug.set(slug, current)
    }
  }

  return Array.from(bySlug.values())
    .filter((author) => author.titleCount > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function buildTitleSummary(row: DataverseRecord): CatalogTitleSummary {
  const title = stringField(row, 'jm1pub_titlename')
  const releaseDate = dateField(row, 'jm1_releasedate')
  const authorDisplayName = resolveAuthorDisplayName(row)
  const authorLookupId = stringField(row, '_jm1_primaryauthor_value')

  return {
    id: stringField(row, 'jm1pub_titleid'),
    slug: stringField(row, 'jm1_slug') || slugify(title),
    title,
    subtitle: stringField(row, 'jm1_subtitle'),
    authorDisplayName,
    authors: authorDisplayName
      ? [
          {
            contactId: authorLookupId,
            slug: slugify(authorDisplayName),
            name: authorDisplayName,
            role: 'Author',
            primary: true,
          },
        ]
      : [],
    certifiedImprint:
      stringField(row, 'jm1pub_imprint@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1pub_imprint') ||
      'J Merrill Publishing',
    genre:
      stringField(row, 'jm1_genre@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1_genre') ||
      'General Interest',
    publicationStatus:
      stringField(row, 'jm1pub_status@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1pub_status'),
    releaseDate,
    displayYear: releaseDate ? releaseDate.slice(0, 4) : 'Catalog',
    formats: ['Other'],
    primaryIsbn: '',
    isbnByFormat: [],
    coverUrl: '',
    shortDescription: stringField(row, 'jm1_summary'),
    purchaseLinks: [],
    marketplaceStatus: '',
  }
}

async function withCatalogRead<T>(
  read: (config: DataverseCatalogConfig, token: string) => Promise<T>,
): Promise<CatalogReadResult<T>> {
  const config = getCatalogConfig()
  if (!config.ok) {
    console.error('Dataverse catalog configuration missing.', {
      error: 'dataverse_catalog_configuration_missing',
      missingConfig: config.missing,
    })
    return {
      ok: false,
      error: 'dataverse_catalog_configuration_missing',
      missingConfig: config.missing,
    }
  }

  try {
    const token = await getDataverseAccessToken(config.value)
    return { ok: true, data: await read(config.value, token) }
  } catch (error) {
    console.error('Dataverse catalog read failed.', summarizeError(error))
    return { ok: false, error: summarizeError(error) }
  }
}

function getCatalogConfig(): { ok: true; value: DataverseCatalogConfig } | { ok: false; missing: string[] } {
  const environmentUrl = cleanUrl(process.env.DATAVERSE_ENVIRONMENT_URL)
  const resourceUrl = cleanUrl(process.env.DATAVERSE_RESOURCE_URL || environmentUrl)
  const webApiBaseUrl = cleanUrl(
    process.env.DATAVERSE_WEB_API_BASE_URL ||
      (environmentUrl ? `${environmentUrl}/api/data/v9.2` : undefined),
  )

  const config = {
    tenantId: process.env.DATAVERSE_TENANT_ID,
    clientId: process.env.DATAVERSE_CLIENT_ID,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
    resourceUrl,
    environmentUrl,
    webApiBaseUrl,
    titleEntitySet: process.env.DATAVERSE_CATALOG_TITLE_ENTITY_SET || DEFAULT_ENTITY_SETS.titles,
  }

  const requiredConfig = {
    tenantId: config.tenantId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    resourceUrl: config.resourceUrl,
    webApiBaseUrl: config.webApiBaseUrl,
    titleEntitySet: config.titleEntitySet,
  }

  const missing = Object.entries(requiredConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) return { ok: false, missing }
  return { ok: true, value: config as DataverseCatalogConfig }
}

async function getDataverseAccessToken(config: DataverseCatalogConfig) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${config.resourceUrl}/.default`,
    }),
  })

  const json = await response.json().catch(() => null)
  const token = isRecord(json) && typeof json.access_token === 'string' ? json.access_token : ''

  if (!response.ok || !token) {
    throw new Error(`dataverse_catalog_token_failed:${response.status}`)
  }

  return token
}

async function dataverseGetCollection(
  config: DataverseCatalogConfig,
  token: string,
  entitySet: string,
  query: {
    select: string[]
    filter?: string
    orderby?: string
    top?: number
  },
) {
  const params = new URLSearchParams({
    $select: query.select.join(','),
  })
  if (query.filter) params.set('$filter', query.filter)
  if (query.orderby) params.set('$orderby', query.orderby)
  if (query.top) params.set('$top', String(query.top))

  const response = await fetch(`${config.webApiBaseUrl}/${entitySet}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`dataverse_catalog_read_failed:${entitySet}:${response.status}`)
  }

  const json = await response.json()
  return isRecord(json) && Array.isArray(json.value) ? (json.value as DataverseRecord[]) : []
}
function buildKeywords(summary: CatalogTitleSummary) {
  return Array.from(
    new Set(
      [summary.title, summary.subtitle, summary.genre, summary.certifiedImprint]
        .join(' ')
        .split(/[^A-Za-z0-9]+/)
        .map((word) => word.toLowerCase())
        .filter((word) => word.length > 2),
    ),
  )
}

function resolveAuthorDisplayName(row: DataverseRecord) {
  return (
    stringField(row, '_jm1_primaryauthor_value@OData.Community.Display.V1.FormattedValue') ||
    stringField(row, '_jm1_author_value@OData.Community.Display.V1.FormattedValue') ||
    stringField(row, '_jm1pub_authoraccount_value@OData.Community.Display.V1.FormattedValue')
  )
}

function stringField(row: DataverseRecord, key: string) {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

function dateField(row: DataverseRecord, key: string) {
  const value = stringField(row, key)
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

function cleanUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function summarizeError(error: unknown) {
  return error instanceof Error ? error.message : 'dataverse_catalog_unknown_error'
}
