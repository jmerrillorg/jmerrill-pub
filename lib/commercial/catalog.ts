export type MoneyAmount = {
  amount: number
  currency: 'USD'
}

export type ProjectionSourceStatus = 'seed_matrix_projection' | 'dataverse_projection'
export type SalesAvailability = 'public' | 'inquiry_only' | 'non_public'
export type LegalStatus = 'approved' | 'legal_language_pending' | 'provisional_validation_required'
export type CommercialPriceStatus = 'approved' | 'provisional' | 'quote_required'

export const commercialProjectionMetadata = {
  projectionName: 'JMP commercial website projection',
  projectionStatus: 'seed_matrix_projection',
  schemaVersion: 'commercial-projection.v1',
  sourceArtifact: 'JMP_Package_Edition_Program_Pricing_SKU_Matrix_v1.1.docx',
  sourceVersion: 'Matrix v1.1',
  sourceHierarchyNow: 'Matrix v1.1 approved seed -> derived website projection -> rendering',
  sourceHierarchyAfterDataverseDeployment:
    'Dataverse Price Rule and commercial catalog records -> generated/validated website projection -> rendering',
  approvalStatus: 'Jackie-approved seed; Dataverse operational source pending Slice 2',
  generatedAt: '2026-07-20T00:49:54Z',
  validatedAt: '2026-07-20T00:49:54Z',
  sourceHash: null,
} as const satisfies {
  projectionName: string
  projectionStatus: ProjectionSourceStatus
  schemaVersion: string
  sourceArtifact: string
  sourceVersion: string
  sourceHierarchyNow: string
  sourceHierarchyAfterDataverseDeployment: string
  approvalStatus: string
  generatedAt: string
  validatedAt: string
  sourceHash: string | null
}

export type ProductFormCode =
  | 'PF-01'
  | 'PF-02'
  | 'PF-03'
  | 'PF-04'
  | 'PF-05'
  | 'PF-06'
  | 'PF-07'
  | 'PF-08'

export type PublishingTrack =
  | 'Hybrid'
  | 'Traditional'
  | 'Institutional-Government'
  | 'Partnership-Commissioned'

export type PricingMethod = 'fixed' | 'unit' | 'quote-sow'
export type BcItemClassification = 'Fixed Service Item' | 'Unit Service Item' | 'Quote/SOW Item'

export const productForms = [
  { code: 'PF-01', label: 'Paperback', attributes: [] },
  { code: 'PF-02', label: 'Hardcover', attributes: [] },
  { code: 'PF-03', label: 'Standard Ebook (born-accessible)', attributes: [] },
  {
    code: 'PF-04',
    label: 'Audiobook',
    attributes: ['narrationmethod: AI / Human Single-Voice / Human Multi-Voice'],
  },
  {
    code: 'PF-05',
    label: 'Large Print',
    attributes: ['complexity: Standard / Complex'],
  },
  { code: 'PF-06', label: 'Complex-Content Accessibility Edition', attributes: [] },
  { code: 'PF-07', label: 'Vertical Graphic Edition', attributes: ['programOnly: true'] },
  { code: 'PF-08', label: 'Interactive/Multimedia Edition', attributes: ['programOnly: true'] },
] as const satisfies readonly {
  code: ProductFormCode
  label: string
  attributes: readonly string[]
}[]

export const publishingTracks = [
  'Hybrid',
  'Traditional',
  'Institutional-Government',
  'Partnership-Commissioned',
] as const satisfies readonly PublishingTrack[]

export const packages = [
  {
    sku: 'JMP-PKG-STARTER',
    tier: 'Starter',
    price: { amount: 1999, currency: 'USD' },
    editionSlots: 2,
    audiobookPolicy: 'Audiobook separate line item',
    featured: false,
    suggestedDefaults: ['PF-01', 'PF-03'],
  },
  {
    sku: 'JMP-PKG-PRO',
    tier: 'Professional',
    price: { amount: 4500, currency: 'USD' },
    editionSlots: 3,
    audiobookPolicy: 'Audiobook separate line item',
    featured: true,
    suggestedDefaults: ['PF-01', 'PF-02', 'PF-03'],
  },
  {
    sku: 'JMP-PKG-PREMIER',
    tier: 'Premier',
    price: { amount: 7500, currency: 'USD' },
    editionSlots: 4,
    audiobookPolicy:
      'AI narration included under the 8-PFH length policy; human narration swap removes AI with no credit and full quoted human line item',
    featured: false,
    suggestedDefaults: ['PF-01', 'PF-02', 'PF-03', 'PF-05'],
  },
] as const

export const editionCatalogDefinitions = [
  {
    sku: 'JMP-EDT-PB-STD',
    label: 'Paperback',
    productForm: 'PF-01',
    slotEligible: true,
    premium: false,
    addOnPrice: { amount: 350, currency: 'USD' },
    inSlotPremium: null,
    public: true,
  },
  {
    sku: 'JMP-EDT-HC-STD',
    label: 'Hardcover',
    productForm: 'PF-02',
    slotEligible: true,
    premium: false,
    addOnPrice: { amount: 350, currency: 'USD' },
    inSlotPremium: null,
    public: true,
  },
  {
    sku: 'JMP-EDT-EB-STD',
    label: 'Standard Ebook, born-accessible',
    productForm: 'PF-03',
    slotEligible: true,
    premium: false,
    addOnPrice: { amount: 350, currency: 'USD' },
    inSlotPremium: null,
    public: true,
  },
  {
    sku: 'JMP-EDT-LP-STD',
    label: 'Large Print, standard layout',
    productForm: 'PF-05',
    complexity: 'Standard',
    slotEligible: true,
    premium: false,
    addOnPrice: { amount: 350, currency: 'USD' },
    inSlotPremium: null,
    public: true,
  },
  {
    sku: 'JMP-EDT-LP-CPLX',
    label: 'Large Print, complex layout',
    productForm: 'PF-05',
    complexity: 'Complex',
    slotEligible: true,
    premium: true,
    addOnPrice: { amount: 600, currency: 'USD' },
    inSlotPremium: { amount: 250, currency: 'USD' },
    public: true,
  },
  {
    sku: 'JMP-ACC-EPUB-ENH',
    label: 'Complex-Content Accessibility Edition',
    productForm: 'PF-06',
    slotEligible: true,
    premium: true,
    addOnPrice: { amount: 1000, currency: 'USD' },
    inSlotPremium: { amount: 650, currency: 'USD' },
    public: true,
  },
  {
    sku: 'JMP-EDT-GFX',
    label: 'Vertical Graphic Edition',
    productForm: 'PF-07',
    slotEligible: false,
    premium: false,
    addOnPrice: null,
    inSlotPremium: null,
    public: false,
    boundary: 'Program-only; webtoon/GFX pricing is provisional and not public.',
  },
  {
    sku: 'JMP-EDT-INT',
    label: 'Interactive/Multimedia Edition',
    productForm: 'PF-08',
    slotEligible: false,
    premium: false,
    addOnPrice: null,
    inSlotPremium: null,
    public: true,
    boundary: 'Program-only; routes through interactive publishing programs.',
  },
] as const

export const priceRules = [
  { sku: 'JMP-EDT-PB-STD', method: 'fixed', amount: 350, use: 'edition add-on' },
  { sku: 'JMP-EDT-HC-STD', method: 'fixed', amount: 350, use: 'edition add-on' },
  { sku: 'JMP-EDT-EB-STD', method: 'fixed', amount: 350, use: 'edition add-on' },
  { sku: 'JMP-EDT-LP-STD', method: 'fixed', amount: 350, use: 'edition add-on' },
  { sku: 'JMP-EDT-LP-CPLX', method: 'fixed', amount: 600, use: 'edition add-on' },
  { sku: 'JMP-EDT-LP-CPLX', method: 'fixed', amount: 250, use: 'in-slot premium' },
  { sku: 'JMP-ACC-EPUB-ENH', method: 'fixed', amount: 1000, use: 'edition add-on' },
  { sku: 'JMP-ACC-EPUB-ENH', method: 'fixed', amount: 650, use: 'in-slot premium' },
  { sku: 'JMP-AUD-SYNTH-STD', method: 'fixed', amount: 500, use: 'AI narration base through 8 PFH' },
  { sku: 'JMP-AUD-SYNTH-STD-OVR', method: 'unit', amount: 50, unit: 'PFH', use: 'AI narration overage after 8 PFH' },
  { sku: 'JMP-AUD-HUMAN-SV', method: 'unit', amount: 400, unit: 'PFH', use: 'starting quote-required human single-voice narration' },
  { sku: 'JMP-SER-DIGITAL-06', method: 'fixed', amount: 600, use: 'serialized release, 6 installments' },
  { sku: 'JMP-SER-DIGITAL-12', method: 'fixed', amount: 1000, use: 'serialized release, 12 installments' },
  { sku: 'JMP-AUD-FIRST-DEV', method: 'unit', amount: 500, unit: 'PFH', use: 'audio-first origination starting rate' },
  { sku: 'JMP-GFX-WEBTOON-PILOT', method: 'fixed', amount: 1200, use: 'provisional internal webtoon pilot' },
  { sku: 'JMP-GFX-WEBTOON-12', method: 'unit', amount: 850, unit: 'episode', use: 'provisional internal webtoon season' },
  { sku: 'JMP-INT-EPUB3-STD', method: 'fixed', amount: 1500, use: 'scope-capped interactive EPUB 3 starting price' },
  { sku: 'JMP-INT-WEB-CUSTOM', method: 'quote-sow', amount: null, use: 'custom browser-based edition' },
  { sku: 'JMP-CUS-SOW', method: 'quote-sow', amount: null, use: 'custom scoped work' },
] as const satisfies readonly {
  sku: string
  method: PricingMethod
  amount: number | null
  unit?: string
  use: string
}[]

export const publishingPrograms = [
  {
    sku: 'JMP-SER-DIGITAL-06',
    label: 'Serialized Release — 6 installments',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Request a Consultation', 'Discuss This Program', 'Begin an Inquiry'],
  },
  {
    sku: 'JMP-SER-DIGITAL-12',
    label: 'Serialized Release — 12 installments',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Request a Consultation', 'Discuss This Program', 'Begin an Inquiry'],
  },
  {
    sku: 'JMP-AUD-FIRST-DEV',
    label: 'Audio-First Origination',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Request a Consultation', 'Request a Custom Scope', 'Begin an Inquiry'],
  },
  {
    sku: 'JMP-GFX-WEBTOON-PILOT',
    label: 'Webtoon Pilot Episode',
    public: false,
    provisional: true,
    salesAvailability: 'non_public',
    legalStatus: 'provisional_validation_required',
    commercialPriceStatus: 'provisional',
    permittedCtas: [],
  },
  {
    sku: 'JMP-GFX-WEBTOON-12',
    label: 'Webtoon Season — 12 episodes',
    public: false,
    provisional: true,
    salesAvailability: 'non_public',
    legalStatus: 'provisional_validation_required',
    commercialPriceStatus: 'provisional',
    permittedCtas: [],
  },
  {
    sku: 'JMP-INT-EPUB3-STD',
    label: 'Interactive EPUB 3 Edition',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Discuss This Program', 'Request a Custom Scope', 'Begin an Inquiry'],
  },
  {
    sku: 'JMP-INT-WEB-CUSTOM',
    label: 'Custom Browser-Based Edition',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Request a Custom Scope', 'Contact Publishing', 'Begin an Inquiry'],
  },
  {
    sku: 'JMP-CUS-SOW',
    label: 'Custom Scoped Work',
    public: true,
    salesAvailability: 'inquiry_only',
    legalStatus: 'legal_language_pending',
    commercialPriceStatus: 'approved',
    permittedCtas: ['Request a Custom Scope', 'Contact Publishing', 'Begin an Inquiry'],
  },
] as const satisfies readonly {
  sku: string
  label: string
  public: boolean
  provisional?: boolean
  salesAvailability: SalesAvailability
  legalStatus: LegalStatus
  commercialPriceStatus: CommercialPriceStatus
  permittedCtas: readonly string[]
}[]

export const commercialTables = [
  'Publishing Package',
  'Edition Catalog Definition',
  'Publishing Program',
  'Package Edition Entitlement',
  'Package Included Service',
  'Premium Upcharge Rule',
  'Price Rule',
  'Funding-Track Applicability',
  'Title Edition (jm1pub_edition)',
  'Title Program Enrollment',
] as const

export const titleEditionRequiredFields = [
  'parent title lookup',
  'Edition Catalog Definition/product form lookup',
  'SKU/Price Rule lookup',
  'ISBN or other edition identifier',
  'edition status',
  'publication and release dates',
  'distributor',
  'distributor product/edition ID',
  'retail price',
  'library price',
  'direct-to-consumer price',
  'currency',
  'language',
  'territory',
  'accessibility profile',
  'rights basis',
  'royalty treatment',
  'annual distribution fee treatment',
  'publishing track',
  'asset references',
  'validation and conformance evidence',
  'distribution submission and live evidence',
  'retirement status and retirement date',
] as const

export const executionEventTypes = [
  'TITLE_EDITION_CREATED',
  'TITLE_EDITION_STATUS_TRANSITIONED',
  'EDITION_VALIDATION_GATE_INITIATED',
  'EDITION_VALIDATION_GATE_PASSED',
  'EDITION_VALIDATION_GATE_FAILED',
  'EDITION_DISTRIBUTION_SUBMITTED',
  'EDITION_DISTRIBUTOR_ACCEPTED',
  'TITLE_EDITION_LIVE',
  'TITLE_EDITION_RETIRED',
] as const

export function authorBillableAmount(input: {
  sku: string
  publishingTrack: PublishingTrack
  listAmount: number
}): number {
  if (input.publishingTrack === 'Traditional') return 0
  return input.listAmount
}

export function aiNarrationPrice(finishedHours: number, publishingTrack: PublishingTrack = 'Hybrid'): number {
  const hours = Math.max(0, finishedHours)
  const base = 500
  const overage = Math.max(0, hours - 8) * 50
  return authorBillableAmount({
    sku: 'JMP-AUD-SYNTH-STD',
    publishingTrack,
    listAmount: base + overage,
  })
}

export function bcItemClassification(method: PricingMethod): BcItemClassification {
  if (method === 'fixed') return 'Fixed Service Item'
  if (method === 'unit') return 'Unit Service Item'
  return 'Quote/SOW Item'
}

export function isPublicSku(sku: string): boolean {
  const program = publishingPrograms.find((item) => item.sku === sku)
  if (program) return program.public
  const edition = editionCatalogDefinitions.find((item) => item.sku === sku)
  return edition ? edition.public : true
}

export function validateCommercialMatrix() {
  const productFormCodes = productForms.map((item) => item.code)
  const duplicateForms = productFormCodes.filter((code, index) => productFormCodes.indexOf(code) !== index)
  const publicProvisional = publishingPrograms.filter((program) => Boolean('provisional' in program && program.provisional) && program.public)
  const slotViolations = editionCatalogDefinitions.filter(
    (edition) => (edition.productForm === 'PF-07' || edition.productForm === 'PF-08') && edition.slotEligible,
  )

  return {
    ok:
      productForms.length === 8 &&
      duplicateForms.length === 0 &&
      !productFormCodes.some((code) => code === 'PF-05' + 'C') &&
      publicProvisional.length === 0 &&
      slotViolations.length === 0,
    productFormCount: productForms.length,
    duplicateForms,
    publicProvisional: publicProvisional.map((item) => item.sku),
    slotViolations: slotViolations.map((item) => item.sku),
  }
}
