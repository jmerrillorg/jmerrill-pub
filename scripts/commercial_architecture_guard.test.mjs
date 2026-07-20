import { existsSync, readFileSync } from 'node:fs'

const catalog = readFileSync('lib/commercial/catalog.ts', 'utf8')
const packagesPage = readFileSync('app/packages/page.tsx', 'utf8')
const tokens = readFileSync('lib/tokens.ts', 'utf8')
const activationReport = readFileSync('docs/operations/generated/2026-07-20-JMP-Commercial-Architecture-Activation-Report.md', 'utf8')
const lifecycleSpec = readFileSync('docs/operations/generated/2026-07-20-JMP-Edition-Lifecycle-Executionlog-Event-Specification.md', 'utf8')
const dataverseExportPath = 'data/commercial/dataverse-commercial-catalog-export.json'

function dataverseDivergenceCheck() {
  if (!existsSync(dataverseExportPath)) {
    return { ok: true, mode: 'pending-export' }
  }

  const exportJson = JSON.parse(readFileSync(dataverseExportPath, 'utf8'))
  const requiredSkus = [
    ['JMP-PKG-STARTER', 1999],
    ['JMP-PKG-PRO', 4500],
    ['JMP-PKG-PREMIER', 7500],
    ['JMP-EDT-PB-STD', 350],
    ['JMP-EDT-HC-STD', 350],
    ['JMP-EDT-EB-STD', 350],
    ['JMP-EDT-LP-STD', 350],
    ['JMP-EDT-LP-CPLX', 600],
    ['JMP-ACC-EPUB-ENH', 1000],
    ['JMP-AUD-SYNTH-STD', 500],
    ['JMP-SER-DIGITAL-06', 600],
    ['JMP-SER-DIGITAL-12', 1000],
    ['JMP-INT-EPUB3-STD', 1500],
  ]
  const rows = Array.isArray(exportJson.priceRules) ? exportJson.priceRules : []
  const missing = requiredSkus.filter(([sku, amount]) => {
    return !rows.some((row) => row.sku === sku && Number(row.amount) === amount)
  })
  return { ok: missing.length === 0, mode: 'export-checked', missing }
}

const checks = [
  {
    name: 'catalog.ts is labeled as a derived projection with transition metadata',
    pass: () =>
      catalog.includes('commercialProjectionMetadata') &&
      catalog.includes('seed_matrix_projection') &&
      catalog.includes('Dataverse Price Rule and commercial catalog records') &&
      !catalog.toLowerCase().includes('canonical commercial source') &&
      !activationReport.toLowerCase().includes('canonical source'),
  },
  {
    name: 'product form option set has exactly eight values and no PF-05C',
    pass: () =>
      [
        "'PF-01'",
        "'PF-02'",
        "'PF-03'",
        "'PF-04'",
        "'PF-05'",
        "'PF-06'",
        "'PF-07'",
        "'PF-08'",
      ].every((code) => catalog.includes(code)) &&
      !catalog.includes('PF-05C') &&
      catalog.includes('productForms.length === 8'),
  },
  {
    name: 'large print complexity and audiobook narration method are attributes',
    pass: () =>
      catalog.includes('complexity: Standard / Complex') &&
      catalog.includes('narrationmethod: AI / Human Single-Voice / Human Multi-Voice'),
  },
  {
    name: 'package prices and slot counts match Matrix v1.1',
    pass: () =>
      catalog.includes("sku: 'JMP-PKG-STARTER'") &&
      catalog.includes('amount: 1999') &&
      catalog.includes('editionSlots: 2') &&
      catalog.includes("sku: 'JMP-PKG-PRO'") &&
      catalog.includes('amount: 4500') &&
      catalog.includes('editionSlots: 3') &&
      catalog.includes("sku: 'JMP-PKG-PREMIER'") &&
      catalog.includes('amount: 7500') &&
      catalog.includes('editionSlots: 4'),
  },
  {
    name: 'pricing rules include approved add-ons, premiums, AI overage, and quote-only human narration',
    pass: () =>
      catalog.includes("sku: 'JMP-EDT-LP-CPLX'") &&
      catalog.includes('amount: 600') &&
      catalog.includes('amount: 250') &&
      catalog.includes("sku: 'JMP-ACC-EPUB-ENH'") &&
      catalog.includes('amount: 1000') &&
      catalog.includes('amount: 650') &&
      catalog.includes("sku: 'JMP-AUD-SYNTH-STD'") &&
      catalog.includes('amount: 500') &&
      catalog.includes("sku: 'JMP-AUD-SYNTH-STD-OVR'") &&
      catalog.includes('amount: 50') &&
      catalog.includes("sku: 'JMP-AUD-HUMAN-SV'") &&
      catalog.includes('starting quote-required human single-voice narration'),
  },
  {
    name: 'traditional track bills author at zero without changing SKU identity',
    pass: () =>
      catalog.includes("if (input.publishingTrack === 'Traditional') return 0") &&
      catalog.includes('return input.listAmount'),
  },
  {
    name: 'program-only PF-07/PF-08 cannot consume package slots',
    pass: () =>
      catalog.includes("productForm: 'PF-07'") &&
      catalog.includes('slotEligible: false') &&
      catalog.includes("productForm: 'PF-08'") &&
      catalog.includes('slotViolations.length === 0'),
  },
  {
    name: 'Dataverse divergence check is armed for post-Slice-2 export',
    pass: () => dataverseDivergenceCheck().ok,
  },
  {
    name: 'legal-pending public programs are inquiry-only, commercially approved, and never immediate checkout',
    pass: () =>
      ['JMP-SER-DIGITAL-06', 'JMP-SER-DIGITAL-12', 'JMP-AUD-FIRST-DEV', 'JMP-INT-EPUB3-STD', 'JMP-INT-WEB-CUSTOM', 'JMP-CUS-SOW'].every((sku) =>
        catalog.includes(`sku: '${sku}'`),
      ) &&
      catalog.includes("salesAvailability: 'inquiry_only'") &&
      catalog.includes("legalStatus: 'legal_language_pending'") &&
      catalog.includes("commercialPriceStatus: 'approved'") &&
      !catalog.includes("legalStatus: 'legal_language_pending',\n    commercialPriceStatus: 'quote_required'") &&
      packagesPage.includes('Inquiry only') &&
      !packagesPage.includes('Buy Now') &&
      !packagesPage.includes('Add to Package') &&
      !packagesPage.includes('Checkout'),
  },
  {
    name: 'webtoon pricing remains non-public and provisional',
    pass: () =>
      catalog.includes("sku: 'JMP-GFX-WEBTOON-PILOT'") &&
      catalog.includes('public: false') &&
      catalog.includes('provisional: true') &&
      catalog.includes("sku: 'JMP-GFX-WEBTOON-12'") &&
      packagesPage.includes('Provisional webtoon pricing is intentionally not published.') &&
      !packagesPage.includes('$1,200') &&
      !packagesPage.includes('$850'),
  },
  {
    name: 'public website no longer exposes stale AI narration $699 price',
    pass: () =>
      !tokens.includes('$699') &&
      !packagesPage.includes('$699') &&
      tokens.includes('AI narration from $500 through 8 finished hours'),
  },
  {
    name: 'public page consumes the commercial matrix instead of duplicating edition and program lists',
    pass: () =>
      packagesPage.includes("from '@/lib/commercial/catalog'") &&
      packagesPage.includes('editionCatalogDefinitions') &&
      packagesPage.includes('publishingPrograms') &&
      packagesPage.includes('priceRules'),
  },
  {
    name: 'edition lifecycle execution-log specification declares required fields and idempotency policy',
    pass: () =>
      [
        'event_type',
        'title_id',
        'title_edition_id',
        'prior_state',
        'resulting_state',
        'execution_source',
        'actor_or_service_principal',
        'correlation_id',
        'occurred_on',
        'evidence_reference',
        'result',
        'exception_or_failure_detail',
        'TITLE_EDITION_CREATED',
        'TITLE_EDITION_RETIRED',
        'Idempotency protection',
      ].every((term) => lifecycleSpec.includes(term)),
  },
]

const failures = checks.filter((check) => !check.pass())
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}

if (failures.length) process.exit(1)
