import type {
  CatalogAuthorDetail,
  CatalogAuthorSummary,
  CatalogFormat,
  CatalogFormatIsbn,
  CatalogPurchaseLink,
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
  assetEntitySet: string
  marketplaceEntitySet: string
  contactEntitySet: string
}

type DataverseRecord = Record<string, unknown>

const DEFAULT_ENTITY_SETS = {
  titles: 'jm1pub_titles',
  assets: 'jm1pub_publishingassets',
  marketplaces: 'jm1pub_assetmarketplaces',
  contacts: 'contacts',
}

const TITLE_SELECT = [
  'jm1pub_titleid',
  'jm1pub_titlename',
  'jm1pub_name',
  'jm1pub_slug',
  'jm1pub_subtitle',
  'jm1pub_authordisplayname',
  'jm1pub_authorname',
  '_jm1_author_value',
  'jm1pub_shortdescription',
  'jm1pub_longdescription',
  'jm1pub_certifiedimprint',
  'jm1pub_genre',
  'jm1pub_publicationstatus',
  'jm1pub_releasedate',
  'jm1pub_publicationyear',
  'jm1pub_series',
  'jm1pub_seriesorder',
]

const PUBLIC_CATALOG_FILTER = 'statecode eq 0 and jm1pub_publiccatalogstatus eq 100000001'

const ASSET_SELECT = [
  'jm1pub_publishingassetid',
  'jm1pub_name',
  'jm1pub_assetformat',
  'jm1pub_isbn13',
  'jm1pub_coverurl',
  'jm1pub_assetstatus',
  '_jm1pub_title_value',
]

const MARKETPLACE_SELECT = [
  'jm1pub_assetmarketplaceid',
  'jm1pub_marketplace',
  'jm1pub_marketplaceidentifier',
  'jm1pub_listingurl',
  'jm1pub_marketplacestatus',
  '_jm1pub_title_value',
]

const CONTACT_SELECT = [
  'contactid',
  'fullname',
  'jm1pub_publicslug',
  'jm1pub_publicauthorbio',
  'jm1pub_authorphoto',
  'address1_city',
  'address1_stateorprovince',
]

type CatalogRelatedData = {
  assetsByTitleId: Map<string, DataverseRecord[]>
  marketplacesByTitleId: Map<string, DataverseRecord[]>
}

export async function listPublicCatalogTitles(): Promise<CatalogReadResult<CatalogTitleSummary[]>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: PUBLIC_CATALOG_FILTER,
      orderby: 'jm1pub_titlename asc',
    })

    const related = await loadRelatedCatalogData(config, token, titleRows)
    const summaries = titleRows.map((row) => buildTitleSummary(row, related))
    return summaries.filter((title) => title.title)
  })
}

export async function getPublicCatalogTitleBySlug(slug: string): Promise<CatalogReadResult<CatalogTitleDetail | null>> {
  return withCatalogRead(async (config, token) => {
    const safeSlug = escapeODataString(slug)
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: `${PUBLIC_CATALOG_FILTER} and jm1pub_slug eq '${safeSlug}'`,
      top: 1,
    })

    const row = titleRows[0]
    if (!row) return null

    const related = await loadRelatedCatalogData(config, token, [row])
    const summary = buildTitleSummary(row, related)
    const relatedResult = await listTitlesByCertifiedImprint(summary.certifiedImprint)
    const relatedTitles = relatedResult.ok
      ? relatedResult.data.filter((title) => title.id !== summary.id).slice(0, 4)
      : []

    return {
      ...summary,
      longDescription: stringField(row, 'jm1pub_longdescription'),
      series: stringField(row, 'jm1pub_series'),
      seriesOrder: numberField(row, 'jm1pub_seriesorder'),
      keywords: buildKeywords(summary),
      marketplaceIdentifiers: summary.purchaseLinks.map((link) => ({
        marketplace: link.retailer,
        identifier: '',
        status: link.marketplaceStatus,
      })),
      relatedTitles,
    }
  })
}

export async function listPublicAuthors(): Promise<CatalogReadResult<CatalogAuthorSummary[]>> {
  return withCatalogRead(async (config, token) => {
    const [contactRows, titleRows] = await Promise.all([
      dataverseGetCollection(config, token, config.contactEntitySet, {
        select: CONTACT_SELECT,
        filter: 'statecode eq 0 and jm1pub_isauthor eq true',
        orderby: 'fullname asc',
      }).catch(() => []),
      dataverseGetCollection(config, token, config.titleEntitySet, {
        select: TITLE_SELECT,
        filter: PUBLIC_CATALOG_FILTER,
        orderby: 'jm1pub_titlename asc',
      }),
    ])

    const related = await loadRelatedCatalogData(config, token, titleRows)
    const titles = titleRows.map((row) => buildTitleSummary(row, related))
    return buildAuthorSummaries(contactRows, titles)
  })
}

export async function getPublicAuthorBySlug(slug: string): Promise<CatalogReadResult<CatalogAuthorDetail | null>> {
  return withCatalogRead(async (config, token) => {
    const [contactRows, titleRows] = await Promise.all([
      dataverseGetCollection(config, token, config.contactEntitySet, {
        select: CONTACT_SELECT,
        filter: 'statecode eq 0 and jm1pub_isauthor eq true',
        orderby: 'fullname asc',
      }).catch(() => []),
      dataverseGetCollection(config, token, config.titleEntitySet, {
        select: TITLE_SELECT,
        filter: PUBLIC_CATALOG_FILTER,
        orderby: 'jm1pub_titlename asc',
      }),
    ])

    const related = await loadRelatedCatalogData(config, token, titleRows)
    const titles = titleRows.map((row) => buildTitleSummary(row, related))
    const summaries = buildAuthorSummaries(contactRows, titles)
    const summary = summaries.find((author) => author.slug === slug)
    if (!summary) return null

    const authorTitles = titles.filter((title) => title.authors.some((author) => author.slug === summary.slug))
    const contact = contactRows.find((row) => {
      const publicSlug = stringField(row, 'jm1pub_publicslug') || slugify(stringField(row, 'fullname'))
      return publicSlug === summary.slug
    })

    return {
      ...summary,
      longBio: contact ? stringField(contact, 'jm1pub_publicauthorbio') || summary.shortBio : summary.shortBio,
      location: contact
        ? [stringField(contact, 'address1_city'), stringField(contact, 'address1_stateorprovince')].filter(Boolean).join(', ')
        : '',
      specialties: summary.genres,
      titles: authorTitles,
    }
  })
}

export async function listTitlesByCertifiedImprint(imprint: string): Promise<CatalogReadResult<CatalogTitleSummary[]>> {
  const titlesResult = await listPublicCatalogTitles()
  if (!titlesResult.ok) return titlesResult

  return {
    ok: true,
    data: titlesResult.data.filter((title) => title.certifiedImprint === imprint),
  }
}

export async function getCatalogStats(): Promise<CatalogReadResult<CatalogStats>> {
  return withCatalogRead(async (config, token) => {
    const [titles, authors] = await Promise.all([
      dataverseGetCollection(config, token, config.titleEntitySet, {
        select: ['jm1pub_titleid', 'jm1pub_certifiedimprint'],
        filter: PUBLIC_CATALOG_FILTER,
      }),
      dataverseGetCollection(config, token, config.contactEntitySet, {
        select: ['contactid'],
        filter: 'statecode eq 0 and jm1pub_isauthor eq true',
      }),
    ])

    return {
      totalTitles: titles.length,
      activeAuthors: authors.length,
      imprintCount: new Set(titles.map((title) => stringField(title, 'jm1pub_certifiedimprint')).filter(Boolean)).size,
      lastUpdated: new Date().toISOString(),
    }
  })
}

function buildAuthorSummaries(contactRows: DataverseRecord[], titles: CatalogTitleSummary[]): CatalogAuthorSummary[] {
  const bySlug = new Map<string, CatalogAuthorSummary>()

  for (const row of contactRows) {
    const name = stringField(row, 'fullname')
    if (!name) continue
    const slug = stringField(row, 'jm1pub_publicslug') || slugify(name)
    bySlug.set(slug, {
      contactId: stringField(row, 'contactid'),
      slug,
      name,
      shortBio: stringField(row, 'jm1pub_publicauthorbio') || 'J Merrill Publishing author family.',
      photoUrl: stringField(row, 'jm1pub_authorphoto'),
      titleCount: 0,
      genres: [],
      imprints: [],
    })
  }

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

async function loadRelatedCatalogData(
  config: DataverseCatalogConfig,
  token: string,
  titleRows: DataverseRecord[],
): Promise<CatalogRelatedData> {
  const titleIds = titleRows.map((row) => stringField(row, 'jm1pub_titleid')).filter(Boolean)

  if (!titleIds.length) {
    return {
      assetsByTitleId: new Map(),
      marketplacesByTitleId: new Map(),
    }
  }

  const [assets, marketplaces] = await Promise.all([
    dataverseGetCollectionByLookup(
      config,
      token,
      config.assetEntitySet,
      ASSET_SELECT,
      '_jm1pub_title_value',
      titleIds,
    ).catch(() => []),
    dataverseGetCollectionByLookup(
      config,
      token,
      config.marketplaceEntitySet,
      MARKETPLACE_SELECT,
      '_jm1pub_title_value',
      titleIds,
    ).catch(() => []),
  ])

  return {
    assetsByTitleId: groupRowsByLookup(assets, '_jm1pub_title_value'),
    marketplacesByTitleId: groupRowsByLookup(marketplaces, '_jm1pub_title_value'),
  }
}

function buildTitleSummary(row: DataverseRecord, related: CatalogRelatedData): CatalogTitleSummary {
  const id = stringField(row, 'jm1pub_titleid')
  const assets = id ? related.assetsByTitleId.get(id) || [] : []
  const marketplaces = id ? related.marketplacesByTitleId.get(id) || [] : []

  const formatIsbns = assets.map(mapAssetFormatIsbn).filter((asset) => asset.isbn)
  const purchaseLinks = marketplaces.map(mapMarketplaceLink).filter((link) => link.href)
  const releaseDate = dateField(row, 'jm1pub_releasedate')
  const year = numberField(row, 'jm1pub_publicationyear')
  const title = stringField(row, 'jm1pub_titlename') || stringField(row, 'jm1pub_name')
  const authorDisplayName = resolveAuthorDisplayName(row)
  const authorLookupId = stringField(row, '_jm1_author_value')

  return {
    id,
    slug: stringField(row, 'jm1pub_slug') || slugify(title),
    title,
    subtitle: stringField(row, 'jm1pub_subtitle'),
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
      stringField(row, 'jm1pub_certifiedimprint@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1pub_certifiedimprint') ||
      'J Merrill Publishing',
    genre: stringField(row, 'jm1pub_genre') || 'General Interest',
    publicationStatus: stringField(row, 'jm1pub_publicationstatus'),
    releaseDate,
    displayYear: releaseDate ? releaseDate.slice(0, 4) : year ? String(year) : 'Catalog',
    formats: normalizeFormats(formatIsbns),
    primaryIsbn: formatIsbns[0]?.isbn || '',
    isbnByFormat: formatIsbns,
    coverUrl: firstString(assets, 'jm1pub_coverurl'),
    shortDescription: stringField(row, 'jm1pub_shortdescription'),
    purchaseLinks,
    marketplaceStatus: purchaseLinks[0]?.marketplaceStatus || '',
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
    process.env.DATAVERSE_WEB_API_BASE_URL || (environmentUrl ? `${environmentUrl}/api/data/v9.2` : undefined),
  )

  const config = {
    tenantId: process.env.DATAVERSE_TENANT_ID,
    clientId: process.env.DATAVERSE_CLIENT_ID,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
    resourceUrl,
    environmentUrl,
    webApiBaseUrl,
    titleEntitySet: process.env.DATAVERSE_CATALOG_TITLE_ENTITY_SET || DEFAULT_ENTITY_SETS.titles,
    assetEntitySet: process.env.DATAVERSE_CATALOG_ASSET_ENTITY_SET || DEFAULT_ENTITY_SETS.assets,
    marketplaceEntitySet:
      process.env.DATAVERSE_CATALOG_MARKETPLACE_ENTITY_SET || DEFAULT_ENTITY_SETS.marketplaces,
    contactEntitySet: process.env.DATAVERSE_CATALOG_CONTACT_ENTITY_SET || DEFAULT_ENTITY_SETS.contacts,
  }

  const requiredConfig = {
    tenantId: config.tenantId,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    resourceUrl: config.resourceUrl,
    webApiBaseUrl: config.webApiBaseUrl,
    titleEntitySet: config.titleEntitySet,
    assetEntitySet: config.assetEntitySet,
    marketplaceEntitySet: config.marketplaceEntitySet,
    contactEntitySet: config.contactEntitySet,
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
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`dataverse_catalog_read_failed:${entitySet}:${response.status}`)
  }

  const json = await response.json()
  return isRecord(json) && Array.isArray(json.value) ? (json.value as DataverseRecord[]) : []
}

async function dataverseGetCollectionByLookup(
  config: DataverseCatalogConfig,
  token: string,
  entitySet: string,
  select: string[],
  lookupField: string,
  ids: string[],
) {
  const rows: DataverseRecord[] = []

  for (const chunk of chunkArray(ids, 25)) {
    const filter = chunk.map((id) => `${lookupField} eq ${formatGuidLiteral(id)}`).join(' or ')
    const page = await dataverseGetCollection(config, token, entitySet, { select, filter })
    rows.push(...page)
  }

  return rows
}

function groupRowsByLookup(rows: DataverseRecord[], lookupField: string) {
  const grouped = new Map<string, DataverseRecord[]>()

  for (const row of rows) {
    const key = stringField(row, lookupField)
    if (!key) continue
    const current = grouped.get(key) || []
    current.push(row)
    grouped.set(key, current)
  }

  return grouped
}

function mapAssetFormatIsbn(row: DataverseRecord): CatalogFormatIsbn {
  return {
    assetId: stringField(row, 'jm1pub_publishingassetid'),
    format: normalizeFormat(
      stringField(row, 'jm1pub_assetformat@OData.Community.Display.V1.FormattedValue') ||
        stringField(row, 'jm1pub_assetformat'),
    ),
    isbn: stringField(row, 'jm1pub_isbn13'),
    assetStatus:
      stringField(row, 'jm1pub_assetstatus@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1pub_assetstatus'),
  }
}

function mapMarketplaceLink(row: DataverseRecord): CatalogPurchaseLink {
  const marketplace =
    stringField(row, 'jm1pub_marketplace@OData.Community.Display.V1.FormattedValue') ||
    stringField(row, 'jm1pub_marketplace')
  return {
    retailer: marketplace,
    label: marketplace,
    href: stringField(row, 'jm1pub_listingurl'),
    marketplaceStatus:
      stringField(row, 'jm1pub_marketplacestatus@OData.Community.Display.V1.FormattedValue') ||
      stringField(row, 'jm1pub_marketplacestatus'),
  }
}

function normalizeFormats(items: CatalogFormatIsbn[]): CatalogFormat[] {
  const formats = items.map((item) => item.format).filter(Boolean)
  return Array.from(new Set(formats.length ? formats : ['Other']))
}

function normalizeFormat(value: string): CatalogFormat {
  const normalized = value.toLowerCase()
  if (normalized.includes('paperback')) return 'Paperback'
  if (normalized.includes('hardcover')) return 'Hardcover'
  if (normalized.includes('ebook') || normalized.includes('e-book')) return 'eBook'
  if (normalized.includes('audio')) return 'Audiobook'
  return 'Other'
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
    stringField(row, 'jm1pub_authordisplayname') ||
    stringField(row, 'jm1pub_authorname') ||
    stringField(row, '_jm1_author_value@OData.Community.Display.V1.FormattedValue')
  )
}

function stringField(row: DataverseRecord, key: string) {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

function numberField(row: DataverseRecord, key: string) {
  const value = row[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function dateField(row: DataverseRecord, key: string) {
  const value = stringField(row, key)
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

function firstString(rows: DataverseRecord[], key: string) {
  for (const row of rows) {
    const value = stringField(row, key)
    if (value) return value
  }
  return ''
}

function cleanUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '')
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''")
}

function formatGuidLiteral(value: string) {
  return `${value}`
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

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
