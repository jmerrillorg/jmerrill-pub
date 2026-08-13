export type PublishingSelectOption = {
  key: string
  label: string
}

export type FormatDisposition = 'INCLUDED' | 'AVAILABLE_ADD_ON' | 'NOT_APPLICABLE' | 'REQUIRES_SEPARATE_AUTHORIZATION'

export type FormatSelectionSummary = {
  packageCode: string
  packageName: string
  selectedFormatKey: string
  selectedFormatLabel: string
  addOnInterestKey: string
  addOnInterestLabel: string
  selectedProductForms: string[]
  includedProductForms: string[]
  availableAddOnProductForms: string[]
  separateAuthorizationProductForms: string[]
  notApplicableProductForms: string[]
  dispositions: Array<{
    productForm: string
    label: string
    disposition: FormatDisposition
    reason: string
  }>
  downstreamDrivers: {
    isbnRequirements: string[]
    interiorVariants: string[]
    coverVariants: string[]
    ebookGeneration: boolean
    accessibilityProcessing: boolean
    audiobookWorkflow: boolean
    distributionChannels: string[]
    royaltyMapping: string[]
    compCopyEntitlement: string[]
  }
}

export const genreOptions: PublishingSelectOption[] = [
  { key: 'christian_faith', label: 'Christian / Faith' },
  { key: 'devotional', label: 'Devotional' },
  { key: 'inspirational', label: 'Inspirational' },
  { key: 'biography_memoir', label: 'Biography / Memoir' },
  { key: 'fiction', label: 'Fiction' },
  { key: 'business', label: 'Business' },
  { key: 'childrens', label: "Children's" },
  { key: 'poetry', label: 'Poetry' },
  { key: 'academic', label: 'Academic' },
  { key: 'trade', label: 'Trade' },
  { key: 'other', label: 'Other' },
]

export const manuscriptStatusOptions: PublishingSelectOption[] = [
  { key: 'idea_outline', label: 'Idea / outline' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'draft_complete', label: 'Draft complete' },
  { key: 'edited_manuscript', label: 'Edited manuscript' },
  { key: 'previously_published', label: 'Previously published' },
]

export const preferredPrintFormatOptions: PublishingSelectOption[] = [
  { key: 'paperback_only', label: 'Paperback only' },
  { key: 'paperback_ebook', label: 'Paperback + eBook' },
  { key: 'paperback_hardcover', label: 'Paperback + hardcover' },
  { key: 'paperback_ebook_hardcover', label: 'Paperback + eBook + hardcover' },
  { key: 'ebook_only', label: 'eBook only' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const governedFormatSelectionOptions: PublishingSelectOption[] = [
  {
    key: 'starter_included_paperback_ebook',
    label: 'Paperback + eBook - included with Starter',
  },
  {
    key: 'paperback_only',
    label: 'Paperback only',
  },
  {
    key: 'paperback_ebook_hardcover',
    label: 'Paperback + eBook + hardcover',
  },
  {
    key: 'paperback_ebook_large_print',
    label: 'Paperback + eBook + large print',
  },
  {
    key: 'paperback_ebook_audiobook_interest',
    label: 'Paperback + eBook + audiobook interest',
  },
  {
    key: 'needs_recommendation',
    label: 'Not sure - recommend the right format set',
  },
]

export const additionalFormatInterestOptions: PublishingSelectOption[] = [
  { key: 'none', label: 'No additional formats right now' },
  { key: 'hardcover_addon', label: 'Hardcover add-on' },
  { key: 'large_print_addon', label: 'Large print add-on' },
  { key: 'accessible_enhanced_ebook_review', label: 'Accessible/enhanced eBook review' },
  { key: 'audiobook_separate_authorization', label: 'Audiobook - separate authorization' },
  { key: 'serialized_not_applicable', label: 'Serialized/episodic digital - not applicable unless separately approved' },
  { key: 'needs_recommendation', label: 'Not sure - recommend' },
]

export const preferredTrimSizeOptions: PublishingSelectOption[] = [
  { key: '5x8', label: '5 x 8' },
  { key: '5_5x8_5', label: '5.5 x 8.5' },
  { key: '6x9', label: '6 x 9' },
  { key: '8_5x8_5', label: '8.5 x 8.5' },
  { key: '8x10', label: '8 x 10' },
  { key: 'large_print', label: 'Large print format' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const interiorColorOptions: PublishingSelectOption[] = [
  { key: 'black_and_white', label: 'Black and white' },
  { key: 'color_interior', label: 'Color interior' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const paperTypePreferenceOptions: PublishingSelectOption[] = [
  { key: 'white_paper', label: 'White paper' },
  { key: 'cream_paper', label: 'Cream paper' },
  { key: 'color_book_paper', label: 'Color-book paper' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const bindingTypeOptions: PublishingSelectOption[] = [
  { key: 'paperback', label: 'Paperback' },
  { key: 'hardcover', label: 'Hardcover' },
  { key: 'paperback_and_hardcover', label: 'Paperback and hardcover' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const coverFinishPreferenceOptions: PublishingSelectOption[] = [
  { key: 'gloss', label: 'Gloss' },
  { key: 'matte', label: 'Matte' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const authorPhotoOnBackCoverOptions: PublishingSelectOption[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const initialAuthorCopyNeedsOptions: PublishingSelectOption[] = [
  { key: 'included_complimentary_only', label: 'Included complimentary copies only' },
  { key: 'one_to_twenty_four', label: '1–24 additional copies' },
  { key: 'twenty_five_to_ninety_nine', label: '25–99 additional copies' },
  { key: 'one_hundred_plus', label: '100+ additional copies' },
  { key: 'not_sure_yet', label: 'Not sure yet' },
]

export const publishingGoalOptions: PublishingSelectOption[] = [
  { key: 'build_personal_brand', label: 'Build my personal brand' },
  { key: 'share_my_story', label: 'Share my story' },
  { key: 'professional_author', label: 'Become a professional author' },
  { key: 'publish_and_distribute', label: 'Publish and distribute my book' },
  { key: 'grow_my_audience', label: 'Grow my audience' },
  { key: 'establish_authority', label: 'Establish authority in my field' },
  { key: 'legacy_work', label: 'Create a legacy work' },
  { key: 'book_based_business', label: 'Launch a book-based business' },
  { key: 'ministry_faith_impact', label: 'Ministry / faith-based impact' },
  { key: 'other', label: 'Other' },
]

export const audiobookInterestOptions: PublishingSelectOption[] = [
  { key: 'not_sure_yet', label: 'Not sure yet' },
  { key: 'azure_ai_narration', label: 'Yes - Azure AI narration' },
  { key: 'human_narration', label: 'Yes - human narration' },
  { key: 'no_audiobook', label: 'No audiobook at this time' },
]

export const w9StatusOptions: PublishingSelectOption[] = [
  { key: 'not_yet_submitted', label: 'Not yet submitted' },
  { key: 'ready_to_submit', label: 'Ready to submit' },
  { key: 'already_submitted', label: 'Already submitted' },
  { key: 'not_applicable', label: 'Not applicable' },
]

export function getOptionLabel(options: PublishingSelectOption[], key: string) {
  return options.find((option) => option.key === key)?.label || ''
}

export function getOptionKey(options: PublishingSelectOption[], value: string) {
  return options.find((option) => option.key === value || option.label === value)?.key || value
}

export function resolveOption(options: PublishingSelectOption[], value: string) {
  const key = getOptionKey(options, value)
  return {
    key,
    label: getOptionLabel(options, key) || value,
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function resolvePackage(packageConfirmation: string) {
  const normalized = normalize(packageConfirmation)
  if (normalized.includes('starter')) return { packageCode: 'JMP-PKG-STARTER', packageName: 'Starter Publishing Package' }
  if (normalized.includes('professional')) return { packageCode: 'JMP-PKG-PRO', packageName: 'Professional Publishing Package' }
  if (normalized.includes('premier')) return { packageCode: 'JMP-PKG-PREMIER', packageName: 'Premier Publishing Package' }
  return { packageCode: 'CUSTOM_OR_UNCONFIRMED', packageName: packageConfirmation || 'Unconfirmed package' }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function resolveGovernedFormatSelection({
  packageConfirmation,
  selectedFormats,
  additionalFormatInterest,
}: {
  packageConfirmation: string
  selectedFormats: string
  additionalFormatInterest: string
}): FormatSelectionSummary {
  const selected = resolveOption(governedFormatSelectionOptions, selectedFormats)
  const addOn = resolveOption(additionalFormatInterestOptions, additionalFormatInterest || 'none')
  const pkg = resolvePackage(packageConfirmation)

  const includedProductForms =
    pkg.packageCode === 'JMP-PKG-STARTER'
      ? ['PF-01', 'PF-03']
      : pkg.packageCode === 'JMP-PKG-PRO'
        ? ['PF-01', 'PF-02', 'PF-03']
        : pkg.packageCode === 'JMP-PKG-PREMIER'
          ? ['PF-01', 'PF-02', 'PF-03', 'PF-05']
          : []

  const selectedProductForms = unique([
    ...(selected.key.includes('paperback') || selected.key === 'needs_recommendation' ? ['PF-01'] : []),
    ...(selected.key.includes('ebook') || selected.key === 'starter_included_paperback_ebook' || selected.key === 'needs_recommendation' ? ['PF-03'] : []),
    ...(selected.key.includes('hardcover') || addOn.key === 'hardcover_addon' ? ['PF-02'] : []),
    ...(selected.key.includes('large_print') || addOn.key === 'large_print_addon' ? ['PF-05'] : []),
    ...(selected.key.includes('audiobook') || addOn.key === 'audiobook_separate_authorization' ? ['PF-04'] : []),
    ...(addOn.key === 'accessible_enhanced_ebook_review' ? ['PF-06'] : []),
  ])

  const dispositions = [
    {
      productForm: 'PF-01',
      label: 'Paperback',
      disposition: includedProductForms.includes('PF-01') ? 'INCLUDED' : 'AVAILABLE_ADD_ON',
      reason: includedProductForms.includes('PF-01') ? 'Included/default print format for the confirmed package.' : 'Eligible print format if added to scope.',
    },
    {
      productForm: 'PF-03',
      label: 'Standard eBook',
      disposition: includedProductForms.includes('PF-03') ? 'INCLUDED' : 'AVAILABLE_ADD_ON',
      reason: includedProductForms.includes('PF-03') ? 'Included/default digital format for the confirmed package.' : 'Eligible digital format if added to scope.',
    },
    {
      productForm: 'PF-02',
      label: 'Hardcover',
      disposition: includedProductForms.includes('PF-02') ? 'INCLUDED' : 'AVAILABLE_ADD_ON',
      reason: includedProductForms.includes('PF-02') ? 'Included with the confirmed package.' : 'Available as an add-on or package upgrade when approved.',
    },
    {
      productForm: 'PF-05',
      label: 'Large Print',
      disposition: includedProductForms.includes('PF-05') ? 'INCLUDED' : 'AVAILABLE_ADD_ON',
      reason: includedProductForms.includes('PF-05') ? 'Included with the confirmed package.' : 'Available as an add-on when approved.',
    },
    {
      productForm: 'PF-06',
      label: 'Accessible/Enhanced eBook',
      disposition: 'REQUIRES_SEPARATE_AUTHORIZATION',
      reason: 'Requires separate accessibility/enhancement review before production planning.',
    },
    {
      productForm: 'PF-04',
      label: 'Audiobook',
      disposition: 'REQUIRES_SEPARATE_AUTHORIZATION',
      reason: 'Audiobook is a separate line item/authorization unless package-specific authority says otherwise.',
    },
    {
      productForm: 'PF-07',
      label: 'Serialized/Episodic Digital',
      disposition: 'NOT_APPLICABLE',
      reason: 'Not a normal sellable package format under current publishing canon.',
    },
  ] satisfies FormatSelectionSummary['dispositions']

  return {
    ...pkg,
    selectedFormatKey: selected.key,
    selectedFormatLabel: selected.label,
    addOnInterestKey: addOn.key,
    addOnInterestLabel: addOn.label,
    selectedProductForms,
    includedProductForms,
    availableAddOnProductForms: dispositions.filter((item) => item.disposition === 'AVAILABLE_ADD_ON').map((item) => item.productForm),
    separateAuthorizationProductForms: dispositions.filter((item) => item.disposition === 'REQUIRES_SEPARATE_AUTHORIZATION').map((item) => item.productForm),
    notApplicableProductForms: dispositions.filter((item) => item.disposition === 'NOT_APPLICABLE').map((item) => item.productForm),
    dispositions,
    downstreamDrivers: {
      isbnRequirements: selectedProductForms.filter((pf) => ['PF-01', 'PF-02', 'PF-03', 'PF-05', 'PF-06'].includes(pf)),
      interiorVariants: selectedProductForms.filter((pf) => ['PF-01', 'PF-02', 'PF-05'].includes(pf)),
      coverVariants: selectedProductForms.filter((pf) => ['PF-01', 'PF-02', 'PF-05'].includes(pf)),
      ebookGeneration: selectedProductForms.includes('PF-03') || selectedProductForms.includes('PF-06'),
      accessibilityProcessing: selectedProductForms.includes('PF-06'),
      audiobookWorkflow: selectedProductForms.includes('PF-04'),
      distributionChannels: selectedProductForms.map((pf) => `${pf}:distribution-planning-required`),
      royaltyMapping: selectedProductForms.map((pf) => `${pf}:royalty-map-required`),
      compCopyEntitlement: selectedProductForms.map((pf) => `${pf}:author-copy-policy-applies-when-published`),
    },
  }
}
