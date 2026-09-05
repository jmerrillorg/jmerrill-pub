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
  PublishingMarketingAuthority,
} from '@/lib/catalog/types'
import { projectPublicCatalogTitles } from '@/lib/catalog/public-projection'
import {
  resolvePublicAuthorIdentity,
  suppressesPersonalAuthorIdentity,
} from '@/lib/catalog/public-author-identity'
import { bookRetailerEnrichmentOverrides } from '@/data/book-retailer-enrichment-overrides'

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
  editionEntitySet: string
  contactEntitySet: string
}

type DataverseRecord = Record<string, unknown>

const DEFAULT_ENTITY_SETS = {
  titles: 'jm1pub_titles',
  assets: 'jm1pub_publishingassets',
  marketplaces: 'jm1pub_assetmarketplaces',
  editions: 'jm1pub_editions',
  contacts: 'contacts',
}

const CATALOG_AUTHORITY_CORRELATION_ID = 'JMP-CATALOG-CANONICAL-20260905'

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
    return projectPublicCatalogTitles(summaries.filter((title) => title.title))
  })
}

export async function getPublicCatalogTitleBySlug(slug: string): Promise<CatalogReadResult<CatalogTitleDetail | null>> {
  return withCatalogRead(async (config, token) => {
    const titleRows = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: TITLE_SELECT,
      filter: PUBLIC_CATALOG_FILTER,
      orderby: 'jm1pub_titlename asc',
    })

    const related = await loadRelatedCatalogData(config, token, titleRows)
    const summaries = projectPublicCatalogTitles(titleRows.map((row) => buildTitleSummary(row, related)).filter((title) => title.title))
    const summary = summaries.find((title) => title.slug === slug || title.id === slug)
    if (!summary) return null

    const row = titleRows.find((item) => stringField(item, 'jm1pub_titleid') === summary.id)
    if (!row) return null
    const relatedTitles = summaries
      .filter((title) => title.id !== summary.id && title.certifiedImprint === summary.certifiedImprint)
      .slice(0, 4)

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
    const titles = projectPublicCatalogTitles(titleRows.map((row) => buildTitleSummary(row, related)).filter((title) => title.title))
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
    const titles = projectPublicCatalogTitles(titleRows.map((row) => buildTitleSummary(row, related)).filter((title) => title.title))
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

export async function listPublishingMarketingAuthority(): Promise<CatalogReadResult<PublishingMarketingAuthority[]>> {
  return withCatalogRead(async (config, token) => {
    const titles = await dataverseGetCollection(config, token, config.titleEntitySet, {
      select: [
        'jm1pub_titleid',
        'jm1pub_titlename',
        'jm1pub_authorname',
        '_jm1_primaryauthor_value',
        'jm1pub_cataloglifecycledetail',
        'jm1pub_currentcatalogstate',
        'jm1pub_marketingauthoritystate',
        'jm1pub_currenteditionreference',
        'jm1pub_retirementstate',
        'jm1pub_rightsholdstate',
      ],
      filter: `statecode eq 0 and jm1_canonicalstatus eq 'CANONICAL_PUBLISHING_WORK' and jm1_reconciliationcorrelationid eq '${CATALOG_AUTHORITY_CORRELATION_ID}'`,
      orderby: 'jm1pub_titlename asc',
    })
    const titleIds = titles.map((row) => stringField(row, 'jm1pub_titleid')).filter(Boolean)
    const [assets, editions] = await Promise.all([
      dataverseGetCollectionByLookup(
        config,
        token,
        config.assetEntitySet,
        [
          'jm1pub_publishingassetid',
          '_jm1pub_titleid_value',
          '_jm1pub_editionid_value',
          'jm1pub_assetformat',
          'jm1pub_publicationdate',
          'jm1pub_coverurl',
          'jm1pub_catalogdistributionstate',
        ],
        '_jm1pub_titleid_value',
        titleIds,
      ),
      dataverseGetCollectionByLookup(
        config,
        token,
        config.editionEntitySet,
        ['jm1pub_editionid', '_jm1pub_title_value', 'jm1pub_releasedate'],
        '_jm1pub_title_value',
        titleIds,
      ),
    ])
    const assetIds = assets.map((row) => stringField(row, 'jm1pub_publishingassetid')).filter(Boolean)
    const marketplaces = assetIds.length
      ? await dataverseGetCollectionByLookup(
          config,
          token,
          config.marketplaceEntitySet,
          ['jm1pub_assetmarketplaceid', '_jm1pub_publishingassetid_value', 'jm1pub_listingurl', 'jm1pub_marketplacestatus'],
          '_jm1pub_publishingassetid_value',
          assetIds,
        ).catch(() => [])
      : []
    const assetsByTitle = groupRowsByLookup(assets, '_jm1pub_titleid_value')
    const editionById = new Map(editions.map((row) => [stringField(row, 'jm1pub_editionid'), row]))
    const marketplacesByAsset = groupRowsByLookup(marketplaces, '_jm1pub_publishingassetid_value')

    return titles.map((title) => {
      const workId = stringField(title, 'jm1pub_titleid')
      const workAssets = assetsByTitle.get(workId) || []
      const currentEditionId = stringField(title, 'jm1pub_currenteditionreference')
      const currentEdition = editionById.get(currentEditionId)
      const distributedAssets = workAssets.filter(
        (asset) => stringField(asset, 'jm1pub_catalogdistributionstate') === 'CURRENTLY_DISTRIBUTED',
      )
      const publicationDates = workAssets.map((asset) => dateField(asset, 'jm1pub_publicationdate')).filter(Boolean).sort()
      const purchaseCTA = distributedAssets
        .flatMap((asset) => marketplacesByAsset.get(stringField(asset, 'jm1pub_publishingassetid')) || [])
        .map((marketplace) => stringField(marketplace, 'jm1pub_listingurl'))
        .find(Boolean) || ''
      const marketingAuthorityState = stringField(title, 'jm1pub_marketingauthoritystate')

      return {
        CanonicalWorkId: workId,
        CanonicalAuthorId: stringField(title, '_jm1_primaryauthor_value'),
        Title: stringField(title, 'jm1pub_titlename'),
        AuthorDisplayName: stringField(title, 'jm1pub_authorname'),
        CurrentLifecycleState: stringField(title, 'jm1pub_cataloglifecycledetail'),
        PublicationDate: publicationDates[0] || '',
        ReleaseDate: currentEdition ? dateField(currentEdition, 'jm1pub_releasedate') : '',
        ActiveState: stringField(title, 'jm1pub_currentcatalogstate'),
        MarketingAuthorityState: marketingAuthorityState,
        CurrentEditionId: currentEditionId,
        AvailableFormats: Array.from(
          new Set(
            distributedAssets.map((asset) =>
              normalizeFormat(
                stringField(asset, 'jm1pub_assetformat@OData.Community.Display.V1.FormattedValue') ||
                  stringField(asset, 'jm1pub_assetformat'),
              ),
            ),
          ),
        ),
        PrimaryCoverAsset: firstString(distributedAssets, 'jm1pub_coverurl'),
        PurchaseCTA: purchaseCTA,
        FeaturedAuthorEligibility: marketingAuthorityState === 'MARKETING_ELIGIBLE',
        MarketingHealthEligibility: marketingAuthorityState === 'MARKETING_ELIGIBLE',
        RetirementState: stringField(title, 'jm1pub_retirementstate'),
        RightsHoldState: stringField(title, 'jm1pub_rightsholdstate'),
      }
    })
  })
}

function buildAuthorSummaries(contactRows: DataverseRecord[], titles: CatalogTitleSummary[]): CatalogAuthorSummary[] {
  const bySlug = new Map<string, CatalogAuthorSummary>()

  for (const row of contactRows) {
    const legalName = stringField(row, 'fullname')
    if (!legalName) continue
    const identity = resolvePublicAuthorIdentity({
      legalAuthorName: legalName,
      governedPublicAuthorName: legalName,
      publicAuthorName: legalName,
      contactId: stringField(row, 'contactid'),
    })
    if (suppressesPersonalAuthorIdentity(identity) || !identity.publicAuthorName) continue
    const slug = stringField(row, 'jm1pub_publicslug') || identity.publicSlug || slugify(identity.publicAuthorName)
    bySlug.set(slug, {
      contactId: stringField(row, 'contactid'),
      slug,
      name: identity.publicAuthorName,
      shortBio: stringField(row, 'jm1pub_publicauthorbio') || 'J Merrill Publishing author family.',
      photoUrl: identity.exposeHeadshot ? stringField(row, 'jm1pub_authorphoto') : '',
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
  const slug = stringField(row, 'jm1pub_slug') || slugify(title)
  const titleDisplayName = stringField(row, 'jm1pub_authordisplayname')
  const governedTitleAuthorName = stringField(row, 'jm1pub_authorname')
  const legalAuthorName = stringField(row, '_jm1_author_value@OData.Community.Display.V1.FormattedValue')
  const titleRelationshipPenName = distinctPublicAttribution(titleDisplayName, [
    legalAuthorName,
    governedTitleAuthorName,
  ])
  const publicAuthorIdentity = resolvePublicAuthorIdentity({
    titleId: id,
    titleSlug: slug,
    title,
    legalAuthorName,
    titleRelationshipPenName,
    governedPublicAuthorName: titleDisplayName || governedTitleAuthorName,
    publicAuthorName: titleDisplayName || governedTitleAuthorName,
    contactId: stringField(row, '_jm1_author_value'),
  })
  const publicAttribution = publicAuthorIdentity.publicAuthorName
  const suppressAuthorProfile = suppressesPersonalAuthorIdentity(publicAuthorIdentity)
  const authorDisplayName = publicAttribution
  const authorLookupId = stringField(row, '_jm1_author_value')
  const retailerCoverUrl = bookRetailerEnrichmentOverrides[slug]?.retailerCoverUrl?.trim() || ''

  return {
    id,
    slug,
    title,
    subtitle: stringField(row, 'jm1pub_subtitle'),
    authorDisplayName,
    authors: authorDisplayName && !suppressAuthorProfile
      ? [
          {
            contactId: authorLookupId,
            slug: publicAuthorIdentity.publicSlug || slugify(authorDisplayName),
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
    coverUrl: firstString(assets, 'jm1pub_coverurl') || retailerCoverUrl,
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

  // Resilient read: a Dataverse 401 does not necessarily mean the credential
  // is wrong — it can mean the specific token this request obtained was
  // rejected (expired, or otherwise stale by the time it reached Dataverse).
  // Discard that token and request exactly one fresh one before giving up.
  // This must never retry more than once, and a second rejection always
  // fails closed rather than looping.
  try {
    const token = await getDataverseAccessToken(config.value)
    return { ok: true, data: await read(config.value, token) }
  } catch (firstError) {
    if (!isDataverseUnauthorizedError(firstError)) {
      console.error('Dataverse catalog read failed.', summarizeError(firstError))
      return { ok: false, error: summarizeError(firstError) }
    }

    console.warn('Dataverse catalog read rejected (401); discarding token and retrying once.', {
      ...safeErrorDetails(firstError),
    })

    try {
      const freshToken = await getDataverseAccessToken(config.value)
      const data = await read(config.value, freshToken)
      console.info('Dataverse catalog read succeeded on retry after a discarded/rejected token.')
      return { ok: true, data }
    } catch (secondError) {
      console.error('Dataverse catalog read failed closed after one retry.', {
        first: safeErrorDetails(firstError),
        second: safeErrorDetails(secondError),
      })
      return { ok: false, error: summarizeError(secondError) }
    }
  }
}

class DataverseUnauthorizedError extends Error {
  readonly status: number
  readonly entitySet: string
  readonly dataverseErrorCode?: string
  readonly dataverseMessage?: string
  readonly serviceRequestId?: string

  constructor(params: {
    status: number
    entitySet: string
    dataverseErrorCode?: string
    dataverseMessage?: string
    serviceRequestId?: string
  }) {
    super(`dataverse_catalog_read_failed:${params.entitySet}:${params.status}`)
    this.name = 'DataverseUnauthorizedError'
    this.status = params.status
    this.entitySet = params.entitySet
    this.dataverseErrorCode = params.dataverseErrorCode
    this.dataverseMessage = params.dataverseMessage
    this.serviceRequestId = params.serviceRequestId
  }
}

function isDataverseUnauthorizedError(error: unknown): error is DataverseUnauthorizedError {
  return error instanceof DataverseUnauthorizedError && error.status === 401
}

// Safe, non-secret error details for logs: HTTP status, Dataverse's own
// error code/message (never a header, never a token), and the correlation
// ID Dataverse returns for support/escalation. Never includes the
// Authorization header, access token, or client secret.
function safeErrorDetails(error: unknown) {
  if (error instanceof DataverseUnauthorizedError) {
    return {
      status: error.status,
      entitySet: error.entitySet,
      dataverseErrorCode: error.dataverseErrorCode,
      dataverseMessage: error.dataverseMessage,
      serviceRequestId: error.serviceRequestId,
    }
  }
  return { message: summarizeError(error) }
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
    editionEntitySet: process.env.DATAVERSE_CATALOG_EDITION_ENTITY_SET || DEFAULT_ENTITY_SETS.editions,
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
    editionEntitySet: config.editionEntitySet,
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
    // Explicit, not inherited from the route segment's `dynamic` config: a
    // token response must never be served from Next.js's fetch Data Cache.
    // Every catalog read gets its own token request.
    cache: 'no-store',
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
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 401) {
      const body = await response.json().catch(() => null)
      const dvError = isRecord(body) && isRecord(body.error) ? body.error : null
      throw new DataverseUnauthorizedError({
        status: response.status,
        entitySet,
        dataverseErrorCode: typeof dvError?.code === 'string' ? dvError.code : undefined,
        dataverseMessage: typeof dvError?.message === 'string' ? dvError.message : undefined,
        serviceRequestId: response.headers.get('x-ms-service-request-id') || undefined,
      })
    }
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

function distinctPublicAttribution(value: string, internalNames: string[]) {
  const normalizedValue = normalizeName(value)
  if (!normalizedValue) return ''
  const matchesInternal = internalNames.some((name) => normalizeName(name) === normalizedValue)
  return matchesInternal ? '' : value
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
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
