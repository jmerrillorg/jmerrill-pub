export const publishingIntakeDataverseMapping = {
  table: 'jm1_publishingintakes',
  columns: {
    firstName: 'jm1_FirstName',
    lastName: 'jm1_LastName',
    email: 'jm1_Email',
    phone: 'jm1_MobilePhone',
    bookTitle: 'jm1_ProjectTitle',
    workType: 'jm1_ManuscriptType',
    wordCount: 'jm1_EstimatedWordCount',
    manuscriptStatus: 'jm1_ManuscriptStatusAtIntake',
    manuscriptUrl: 'jm1_ManuscriptURL',
    bookDescription: 'jm1_Purpose',
    referralSource: 'jm1_ReferralSource',
    consent: 'jm1_ConsenttoContact',

    reference: 'jm1_IntakeReferenceCode',
    genre: 'jm1_GenreSubject',
    publishedBefore: 'jm1_PublishedBefore',
    additionalNotes: 'jm1_AdditionalNotes',
    intakeChannel: 'jm1_IntakeChannel',
    idempotencyKey: 'jm1_IdempotencyKey',
    consentTimestamp: 'jm1_ConsentTimestamp',
    wordCountSource: 'jm1_WordCountSource',
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
