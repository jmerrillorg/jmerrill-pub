export const publishingIntakeDataverseMapping = {
  table: 'jm1_publishingintakes',
  columns: {
    name: 'jm1_name',
    firstName: 'jm1_firstname',
    lastName: 'jm1_lastname',
    email: 'jm1_email',
    phone: 'jm1_mobilephone',
    bookTitle: 'jm1_projecttitle',
    workType: 'jm1_worktype',
    manuscriptType: 'jm1_manuscripttype',
    wordCount: 'jm1_estimatedwordcount',
    manuscriptStatus: 'jm1_manuscriptstatusatintake',
    manuscriptUrl: 'jm1_manuscripturl',
    bookDescription: 'jm1_purpose',
    referralSource: 'jm1_referralsource',
    consent: 'jm1_consenttocontact',
    consentTerms: 'jm1_consenttoterms',

    reference: 'jm1_intakereferencecode',
    genre: 'jm1_genresubject',
    publishedBefore: 'jm1_publishedbefore',
    additionalNotes: 'jm1_additionalnotes',
    intakeChannel: 'jm1_intakechannel',
    idempotencyKey: 'jm1_idempotencykey',
    consentTimestamp: 'jm1_consenttimestamp',
    wordCountSource: 'jm1_wordcountsource',
  },
  activationStatus: 'adapter_activated_pending_e2e_validation',
} as const

export type PublishingIntakeDataverseColumn = keyof typeof publishingIntakeDataverseMapping.columns

export const manuscriptTypeOptions = {
  'Full-length Book': 196650000,
  Novella: 196650001,
  "Children's Picture Book": 196650002,
  'Poetry Collection': 196650003,
  Devotional: 196650004,
  'Workbook / Journal': 196650005,
  'Short Story Collection': 196650006,
  Other: 196650007,
} as const

export const productionWorkTypeOptions = {
  'Full-length Book': 196650000,
  Novella: 196650000,
  "Children's Picture Book": 196650003,
  'Poetry Collection': 196650000,
  Devotional: 196650000,
  'Workbook / Journal': 196650000,
  'Short Story Collection': 196650000,
  Other: 196650013,
} as const

export const publishedBeforeOptions = {
  'First book': 835500000,
  'Published before with JMP': 835500001,
  'Published before elsewhere': 835500002,
} as const

export const publishingIntakeActivationBlockers = [
  'Required field validation must be confirmed in a test environment.',
  'End-to-end /api/publishing/intake Dataverse write behavior must be verified.',
  'Dead-letter behavior must be confirmed or explicitly accepted as not configured.',
] as const
