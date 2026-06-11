export const publishingIntakeDataverseMapping = {
  // TODO: Confirm entity set name for jm1_publishingintake before production activation.
  table: 'jm1_publishingintakes',
  columns: {
    firstName: 'jm1_FirstName',
    lastName: 'jm1_LastName',
    email: 'jm1_Email',
    phone: 'jm1_MobilePhone',
    bookTitle: 'jm1_ProjectTitle',
    workType: 'jm1_WorkType',
    wordCount: 'jm1_EstimatedWordCount',
    manuscriptStatus: 'jm1_ManuscriptStatus',
    manuscriptUrl: 'jm1_ManuscriptURL',
    bookDescription: 'jm1_Purpose',
    referralSource: 'jm1_WebsiteSource',
    consent: 'jm1_ConsenttoContact',

    // Pending creation or confirmation:
    reference: 'jm1_IntakeReferenceCode',
    genre: 'jm1_GenreSubject',
    publishedBefore: 'jm1_PublishedBefore',
    additionalNotes: 'jm1_AdditionalNotes',
    intakeChannel: 'jm1_IntakeChannel',
    idempotencyKey: 'jm1_IdempotencyKey',
    consentTimestamp: 'jm1_ConsentTimestamp',
    wordCountSource: 'jm1_WordCountSource',
  },
  activationStatus: 'blocked_pending_column_creation_and_choice_value_verification',
} as const

export type PublishingIntakeDataverseColumn = keyof typeof publishingIntakeDataverseMapping.columns

export const publishingIntakeActivationBlockers = [
  'Missing columns must be created or alternate mappings approved.',
  'Choice values for jm1_WorkType, jm1_ManuscriptStatus, jm1_WebsiteSource, and publishedBefore mapping must be verified.',
  'Web API entity set name must be confirmed.',
  'Dataverse app user and security role must be confirmed.',
  'Required fields must be satisfied in a test environment.',
] as const
