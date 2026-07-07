# Website Catalog Dataverse Dependency Audit

**Authority:** Jackie confirms Dataverse is the single source of truth.  
**Status:** Audit and refactor plan only  
**Date:** 2026-07-07  

## Executive Summary

The website catalog is still statically driven. The main authority violation is centralized in `lib/content.ts`, which imports `data/books.json` and builds `bookCatalog`, `authorCatalog`, `imprintCatalog`, and all catalog lookup helpers from that static file plus local override files. Public catalog, author, imprint, homepage feature, and sitemap surfaces consume those exports.

This means `books.json` is still the effective website catalog source of truth. The end state should be a server-side Dataverse catalog read layer:

Dataverse -> Website / Author Workspace / Dashboards

Static JSON files may remain only as migration evidence, documentation, tests, or temporary compatibility inputs generated from Dataverse during a governed transition. They must not be authoritative.

## Dependency Map

| File | Dependency | Affected Surface | Classification | Required Action |
| --- | --- | --- | --- | --- |
| `lib/content.ts` | Imports `data/books.json` directly and normalizes it into `bookCatalog` | All catalog consumers | Authoritative data dependency | Replace with Dataverse-backed read adapter |
| `lib/content.ts` | Imports author, contributor, purchase link, retailer enrichment, series, and title-author override files | Books, authors, SEO, purchase links | Authoritative data dependency where values define title/author/catalog facts | Move governed fields to Dataverse/PAM; retain files only as migration evidence |
| `app/books/BooksClient.tsx` | Filters `bookCatalog` and builds genre/imprint filters from static data | `/books` | Authoritative data dependency | Pass Dataverse records from server/API into client component |
| `app/books/page.tsx` | Imports `bookCatalog` and `imprintCatalog` for page copy/filter metadata | `/books` | Authoritative data dependency for counts/imprints; marketing copy allowed | Keep "125+ titles" copy; exact listing/counts from Dataverse |
| `app/books/[id]/page.tsx` | Uses `bookCatalog`, `getBookById`, `getBooksByAuthorSlug`, `getBooksByImprint`, `getBooksBySeries`; static params generated from static catalog | Book detail pages | Authoritative data dependency | Fetch by Dataverse slug/id; generate static params from Dataverse or use dynamic rendering with cache |
| `app/authors/page.tsx` | Uses `publicAuthorCatalog` and `bookCatalog.slice(0, 4)` | `/authors` | Authoritative data dependency | Fetch Dataverse-backed author summaries and featured titles |
| `app/authors/[slug]/page.tsx` | Uses `authorCatalog` and `getAuthorBySlug`; static params from static authors | Author detail pages | Authoritative data dependency | Fetch author/contact profile and linked titles from Dataverse |
| `app/imprints/[slug]/page.tsx` | Uses `getBooksByImprint` for featured books | Imprint detail pages | Authoritative data dependency | Fetch titles by certified imprint from Dataverse |
| `app/sitemap.ts` | Generates book and author URLs from static `bookCatalog` / `authorCatalog` | Sitemap/SEO | Authoritative data dependency | Generate sitemap entries from Dataverse-backed public catalog |
| `components/sections/UpgradedSections.tsx` | Featured titles and imprint tabs use `bookCatalog` / `imprintCatalog` | Homepage featured books | Authoritative data dependency | Fetch curated/featured Dataverse records or server-provide props |
| `components/content/BookCard.tsx` | Renders `BookRecord` shape from `lib/content.ts` | Shared book cards | Build/model dependency | Keep component, change DTO source to Dataverse catalog DTO |
| `components/content/AuthorCard.tsx` | Renders `AuthorRecord` shape from `lib/content.ts` | Shared author cards | Build/model dependency | Keep component, change DTO source to Dataverse author DTO |
| `components/imprints/ImprintDetailTemplate.tsx` | Accepts featured books from static helper | Imprint pages | Build/model dependency | Keep component, feed Dataverse title DTOs |
| `data/imprints.ts` | Imprint strategy/copy and routes | `/imprints`, `/readers`, book reader updates | Static marketing copy | Allowed, but certified assignment/counts must come from Dataverse |
| `lib/tokens.ts` | Navigation/footer stats and imprint copy; comment says display imprint assigned via `books.json` | Navigation/footer/home sections | Static marketing copy plus stale architecture note | Keep "125+" copy; remove `books.json` authority comment |
| `app/api/live-stats/route.ts` | Hardcoded `totalTitles: 125`, author/stage counts | Live stats API | Static catalog counts | Replace with Dataverse aggregate endpoint |
| `data/BOOKS_DATA_GUIDE.md` | Instructs direct edits to `books.json` | Documentation | Obsolete operating instruction | Mark superseded or rewrite as Dataverse/PAM ingestion guide |

## Data Source Classification

| Source | Current Use | Classification | End State |
| --- | --- | --- | --- |
| `data/books.json` | Primary website catalog | Authoritative data dependency - must be removed | Legacy website evidence only; no production authority |
| `data/authors.ts` | Author bios/photos/overrides | Authoritative if used for profile facts | Migrate governed author profile fields to Contact/author profile read model |
| `data/title-author-overrides.ts` | Corrects title-author identity | Authoritative dependency | Migrate to Dataverse Contact-title relationship |
| `data/book-contributor-overrides.ts` | Multi-author/contributor display | Authoritative dependency | Migrate to Dataverse contributor/relationship model |
| `data/book-purchase-link-overrides.ts` | Retailer/publisher purchase links | Authoritative dependency for marketplace presence | Migrate to `jm1pub_assetmarketplace` |
| `data/book-retailer-enrichment-overrides.ts` | Cover, ASIN, release dates, descriptions | Authoritative dependency for marketplace/PAM facts | Migrate to `jm1pub_publishingasset` and `jm1pub_assetmarketplace` |
| `data/book-series-overrides.ts` | Series grouping | Authoritative dependency | Add governed series fields/relationship in Dataverse or PAM extension |
| `data/imprints.ts` | Imprint strategy and marketing copy | Static marketing copy | Allowed; title assignment/counts from Dataverse |
| Enterprise adoption / OE / PAM JSON files | Operational reports and staging evidence | Evidence/reporting artifact | Documentation only; not website source |
| Monthly reporting workbook/Bowker/Ingram/LSI | Migration inputs | Ingestion source only | Feed PAM/Dataverse through governed import process |

## Affected Surfaces

| Surface | Files | Change Needed |
| --- | --- | --- |
| Homepage featured books | `components/sections/UpgradedSections.tsx`, potentially home modules using it | Replace static `bookCatalog` with Dataverse-backed featured titles |
| `/books` | `app/books/page.tsx`, `app/books/BooksClient.tsx` | Server fetch catalog summaries; client filters DTOs |
| Book detail pages | `app/books/[id]/page.tsx` | Fetch title by slug/ID with assets/marketplaces/authors |
| `/authors` | `app/authors/page.tsx` | Fetch public author/contact summaries from Dataverse |
| Author detail pages | `app/authors/[slug]/page.tsx` | Fetch author/contact plus linked titles |
| `/imprints` | `app/imprints/page.tsx`, `data/imprints.ts` | Keep static imprint copy; no exact counts from static source |
| Imprint detail pages | `app/imprints/[slug]/page.tsx` | Fetch featured titles by certified imprint |
| Sitemap | `app/sitemap.ts` | Generate dynamic public book/author routes from Dataverse |
| Shared catalog cards | `components/content/BookCard.tsx`, `components/content/AuthorCard.tsx` | Keep UI, update DTO types/imports |
| Enterprise Command Center | docs/data only in current repo snapshot | Keep reporting artifacts out of public website source path |
| Author Workspace catalog modules | Current workspace shell does not appear to use `bookCatalog`; future modules must use Dataverse author/project access model | Ensure no static catalog fallback is added |
| Marketing module / royalty readiness displays | No public runtime dependency found in current website code; docs/data artifacts exist | Future implementation must use Dataverse/PAM |

## Dataverse Catalog Read Model

### Canonical Entities

| Entity | Purpose | Website DTO Contribution |
| --- | --- | --- |
| `jm1pub_title` | Intellectual Work | title, slug, subtitle, description, certified imprint, status, publication year/date, genre/category, series relationship if approved |
| `jm1pub_publishingasset` | Format / edition / ISBN asset | formats, ISBNs, cover reference, asset status, edition metadata |
| `jm1pub_assetmarketplace` | Marketplace/distribution presence | retailer links, ASIN, channel availability, marketplace status |
| Contact | Person/party master | author display name, slug, profile copy/photo where approved, relationship state |
| Contact-title relationship / title ownership | Author/contributor link | author byline, contributors, author detail linking |
| `jm1pub_contract` | Agreement basis | not public catalog content; useful for internal readiness only |

### Proposed Website DTOs

`CatalogTitleSummary`
- `id`
- `slug`
- `title`
- `subtitle`
- `authorDisplayName`
- `authors[]`
- `certifiedImprint`
- `genre`
- `publicationStatus`
- `releaseDate`
- `displayYear`
- `formats[]`
- `primaryIsbn`
- `isbnByFormat[]`
- `coverUrl`
- `shortDescription`
- `purchaseLinks[]`
- `marketplaceStatus`

`CatalogTitleDetail`
- all summary fields
- `longDescription`
- `series`
- `seriesOrder`
- `keywords`
- `marketplaceIdentifiers`
- `relatedTitles`

`CatalogAuthorSummary`
- `contactId`
- `slug`
- `name`
- `shortBio`
- `photoUrl`
- `titleCount`
- `genres[]`
- `imprints[]`

`CatalogImprintSummary`
- `slug`
- `label`
- static marketing copy from `data/imprints.ts`
- title list and exact counts from Dataverse only

### Query Pattern

Use server-only Dataverse reads through Next.js route handlers or server functions:

1. `listPublicCatalogTitles(filters)`
2. `getPublicCatalogTitleBySlug(slug)`
3. `listPublicAuthors()`
4. `getPublicAuthorBySlug(slug)`
5. `listTitlesByCertifiedImprint(imprint)`
6. `getCatalogStats()`

Cache with `next: { revalidate: 300 }` or equivalent ISR-style caching. Do not expose Dataverse credentials to client components.

## Removal Plan for `books.json`

1. Freeze `books.json` as legacy evidence and mark it non-authoritative.
2. Build `lib/server/dataverse/catalog.ts` with server-only Dataverse read helpers.
3. Build `lib/catalog/types.ts` for website DTOs independent of static files.
4. Build `lib/catalog/mapper.ts` to map Dataverse entities into the current `BookRecord`/`AuthorRecord`-compatible DTOs during transition.
5. Replace public page imports from `@/lib/content` with async Dataverse-backed server calls.
6. Convert `BooksClient` to receive `books` and `imprints` as props.
7. Convert dynamic pages/sitemap to dynamic or Dataverse-generated params.
8. Move static override files into a migration/evidence folder or mark them deprecated.
9. Remove `books.json` runtime imports after parity validation.
10. Rewrite `data/BOOKS_DATA_GUIDE.md` as a Dataverse/PAM catalog governance guide.

## Risks and Blockers

| Risk / Blocker | Impact | Recommended Handling |
| --- | --- | --- |
| Dataverse metadata/read service principal availability | Blocks live read layer | Confirm app settings and least-privilege read permissions before PR 2 |
| Slug stability | Existing `/books/[id]` and `/authors/[slug]` URLs must not break | Store/maintain canonical public slug fields in Dataverse; import legacy slugs as aliases |
| Cover image location | Current covers often use remote retailer URLs or missing covers | Use SharePoint/PAM file references where governed; external cover URLs only as marketplace evidence |
| Author profile completeness | `data/authors.ts` contains marketing bios not yet confirmed as Contact fields | Migrate only approved profile fields; use safe fallback copy until fields exist |
| Purchase link authority | Current override file acts as marketplace link authority | Move links to `jm1pub_assetmarketplace`; preserve override file as migration evidence |
| Static generation behavior | Current book/author detail pages rely on `generateStaticParams()` from static arrays | Choose ISR/dynamic rendering or build-time Dataverse fetch with failure fallback policy |
| Existing dirty worktree | Current local branch has unrelated `/join` edits and untracked docs | Keep refactor PRs isolated on a clean branch/worktree |

## Recommended PR Sequence

1. **PR 1 - Audit and Guardrails**
   - Add this audit.
   - Mark `data/BOOKS_DATA_GUIDE.md` as superseded.
   - Remove stale `books.json` authority comments from docs/copy only.

2. **PR 2 - Dataverse Catalog Read Client**
   - Add server-only Dataverse catalog client.
   - Add DTO types and mapper.
   - Add integration-safe tests with mocked Dataverse responses.
   - No public surface switch yet.

3. **PR 3 - `/books` Listing Switch**
   - Convert `/books` server page to fetch Dataverse catalog summaries.
   - Pass records to `BooksClient`.
   - Keep "125+ titles" marketing copy.

4. **PR 4 - Book Detail and Sitemap Switch**
   - Convert `/books/[id]` and `app/sitemap.ts`.
   - Preserve legacy slugs/URLs.

5. **PR 5 - Authors Switch**
   - Convert `/authors` and `/authors/[slug]`.
   - Use Dataverse Contact/title relationship read model.

6. **PR 6 - Imprints and Homepage Featured Titles**
   - Convert imprint featured books and homepage featured titles.
   - Keep static imprint strategy copy, but source exact title lists from Dataverse.

7. **PR 7 - Static Catalog Retirement**
   - Remove runtime import path to `books.json`.
   - Move legacy data/override files into migration evidence or mark as non-runtime.
   - Add CI guard preventing `data/books.json` imports in runtime code.

## Small Fixes Allowed Before Broad Refactor

- Update comments that call `books.json` authoritative.
- Add CI/static lint guard for `books.json` runtime imports.
- Add documentation only.

Broad public-surface refactor should wait until the dependency map and Dataverse read credentials are approved.

