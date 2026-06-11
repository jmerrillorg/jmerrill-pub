export const publishingIntakeDataverseMapping = {
  // TODO: Confirm entity set name for jm1_publishingintake before production activation.
  table: 'jm1_publishingintakes',
  columns: {
    firstName: 'jm1_FirstName',
    lastName: 'jm1_LastName',
    email: 'jm1_Email',
    phone: 'jm1_MobilePhone',
    bookTitle: 'jm1_ProjectTitle',
    // jm1_WorkType exists, but its current choices do not match the canonical /join values.
    // jm1_ManuscriptType is the intended work-type target pending numeric choice option values.
    workType: 'jm1_ManuscriptType',
    wordCount: 'jm1_EstimatedWordCount',
    // jm1_ManuscriptStatus is currently synced to manuscript/work-type values, not status values.
    manuscriptStatus: 'jm1_ManuscriptStatusAtIntake',
    manuscriptUrl: 'jm1_ManuscriptURL',
    bookDescription: 'jm1_Purpose',
    // jm1_WebsiteSource only partially matches /join referral-source values.
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
  activationStatus: 'blocked_pending_schema_corrections_and_choice_option_values',
} as const

export type PublishingIntakeDataverseColumn = keyof typeof publishingIntakeDataverseMapping.columns

export const publishingIntakeActivationBlockers = [
  'jm1_ManuscriptStatusAtIntake must be created or jm1_StageatSubmission must be confirmed to have exact /join status values.',
  'jm1_ReferralSource must be created.',
  'Choice option numeric values for jm1_ManuscriptType and jm1_PublishedBefore must be confirmed.',
  'Web API entity set name must be confirmed.',
  'Dataverse app user and security role must be confirmed.',
  'Test environment readiness and end-to-end Dataverse write behavior must be verified.',
] as const
