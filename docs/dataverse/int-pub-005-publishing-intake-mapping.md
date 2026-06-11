# INT-PUB-005 Publishing Intake Dataverse Mapping

Status: Draft mapping appendix updated after final Power Apps column creation
Table display name: Publishing Intake
Dataverse table: `jm1_publishingintake`
Activation status: Schema mapping complete; activation blocked pending entity-set confirmation, app-user/security-role confirmation, adapter activation, and end-to-end Dataverse write validation.

This appendix documents the website/API-to-Dataverse mapping for the canonical INT-PUB-005 `/join` intake flow. The Next.js API is responsible only for preparing one Publishing Intake row. Power Automate / Dataverse remain responsible for downstream Contact, Lead, Opportunity, acknowledgment, loyalty, diagnostics, and execution-log work.

## 1. Table

| Item | Value |
|---|---|
| Display name | Publishing Intake |
| Dataverse table | `jm1_publishingintake` |
| Web API entity set | `jm1_publishingintakes` pending confirmation |
| Primary row written by website | One Publishing Intake row only |
| Production write status | Blocked pending activation validation |
| Power Apps publish status | Published successfully |
| Column count after publish | 57 |

## 2. Confirmed Existing and Created Columns

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed existing | Required by `/join`. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed existing | Required by `/join`. |
| email | Email | `jm1_Email` | Email | Confirmed existing | Lowercase-normalized server-side. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed existing | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed existing | Required by `/join`. |
| workType | Manuscript Type | `jm1_ManuscriptType` | Choice | Confirmed existing | Required numeric option values captured below. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed existing | Required; `/join` accepts 100-500000. |
| manuscriptStatus | Manuscript Status at Intake | `jm1_ManuscriptStatusAtIntake` | Single line of text | Confirmed-created | Max length 100. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed existing | Optional. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed existing | Required; maps author-facing book description to Purpose. |
| referralSource | Referral Source | `jm1_ReferralSource` | Single line of text | Confirmed-created | Max length 100. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed existing | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Confirmed-created | Max length 100. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Confirmed-created | Max length 100. Used because canonical `/join` captures genre/subject as free text. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Confirmed-created | Required numeric option values captured below. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Confirmed-created | Max length 1000. Do not mix author-submitted notes into internal-only `jm1_InternalNotes`. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Confirmed-created | Max length 100. Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Confirmed-created | Max length 100. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Confirmed-created | Server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Single line of text | Confirmed-created | Max length 100. Submitted value: `Intake-Reported`. |

## 3. Choice and Schema Findings

| API Field | Final Mapping | Decision | Status |
|---|---|---|---|
| workType | `jm1_ManuscriptType` | Do not use `jm1_WorkType`; its observed values do not match canonical `/join` work-type values. | Confirmed. |
| manuscriptStatus | `jm1_ManuscriptStatusAtIntake` | Do not use `jm1_ManuscriptStatus`; it is synced to a Manuscript Type-style value set. | Confirmed-created. |
| referralSource | `jm1_ReferralSource` | Do not use `jm1_WebsiteSource`; its observed values only partially match `/join`. | Confirmed-created. |
| publishedBefore | `jm1_PublishedBefore` | Do not use `jm1_ApplicantType`; its observed values are Standard and Prestige. | Confirmed-created. |
| genre | `jm1_GenreSubject` | Do not use `jm1pub_GenreInterest`; `/join` captures genre/subject as free text. | Confirmed-created. |

## 4. Completed Final Column Creation

| API Field | Dataverse Display Name | Logical Name | Data Type | Max Length | Status |
|---|---|---|---|---|---|
| manuscriptStatus | Manuscript Status at Intake | `jm1_ManuscriptStatusAtIntake` | Single line of text | 100 | Confirmed-created |
| referralSource | Referral Source | `jm1_ReferralSource` | Single line of text | 100 | Confirmed-created |

## 5. Final API Payload Mapping

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed | Required. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed | Required. |
| email | Email | `jm1_Email` | Email | Confirmed | Lowercase-normalized. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed | Required. |
| workType | Manuscript Type | `jm1_ManuscriptType` | Choice | Confirmed | Numeric option values captured below. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Confirmed | Free-text genre/subject. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed | Required. |
| manuscriptStatus | Manuscript Status at Intake | `jm1_ManuscriptStatusAtIntake` | Single line of text | Confirmed | Author-submitted manuscript status. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed | Optional. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Confirmed | Numeric option values captured below. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed | Required. |
| referralSource | Referral Source | `jm1_ReferralSource` | Single line of text | Confirmed | Author-submitted referral source. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Confirmed | Author-submitted notes. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Confirmed | Canonical reference code. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Confirmed | Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Confirmed | Stored for replay/audit support. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Confirmed | Server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Single line of text | Confirmed | Submitted value: `Intake-Reported`. |

Non-field activation items still pending: Web API entity set confirmation, app user/security role confirmation, adapter activation, required-field validation in a test environment, and end-to-end Dataverse write testing.

### Choice Option Values for Web API Writes

#### `jm1_ManuscriptType`

| Label | Numeric value |
|---|---|
| Full-length Book | 196650000 |
| Novella | 196650001 |
| Children's Picture Book | 196650002 |
| Poetry Collection | 196650003 |
| Devotional | 196650004 |
| Workbook / Journal | 196650005 |
| Short Story Collection | 196650006 |
| Other | 196650007 |

#### `jm1_PublishedBefore`

| Label | Numeric value |
|---|---|
| First book | 835500000 |
| Published before with JMP | 835500001 |
| Published before elsewhere | 835500002 |

## 6. Fields Intentionally Not Mapped

| Field / Concept | Reason |
|---|---|
| turnstileToken | Security verification only; do not store challenge token in Dataverse. |
| raw client IP | Avoid storing raw IP/PII in the intake row. |
| payment data | `/join` does not collect payment data. |
| manuscript file upload | `/join` does not upload files; only optional shareable URL is accepted. |
| AI content disclosure | Explicitly out of scope for `/join`. |
| Contact | Created/matched downstream by governed Power Automate / Dataverse logic, not the website. |
| Lead | Created downstream by governed Power Automate / Dataverse logic, not the website. |
| Opportunity | Created downstream by governed Power Automate / Dataverse logic, not the website. |
| execution log | Execution logging belongs to governed Power Automate / Dataverse process, not the website. |
| acknowledgment email | Sent downstream by governed Power Automate / ACS process, not the website. |

## 7. Production Activation Blockers

Do not activate production Dataverse writes until all of the following are confirmed:

- Web API entity set name is confirmed.
- Dataverse app user and security role are confirmed.
- Dataverse adapter activation is completed deliberately after environment confirmation.
- Required fields are satisfied in a test environment.
- End-to-end `/api/publishing/intake` Dataverse write test passes.
- Dead-letter behavior is either implemented or explicitly accepted as not configured for the activation phase.

## 8. Power Platform Completion and Follow-Up Checklist

- Confirmed-created `jm1_IntakeReferenceCode`.
- Confirmed-created `jm1_IntakeChannel`.
- Confirmed-created `jm1_IdempotencyKey`.
- Confirmed-created `jm1_ConsentTimestamp`.
- Confirmed-created `jm1_WordCountSource`.
- Confirmed-created `jm1_AdditionalNotes`.
- Confirmed-created `jm1_GenreSubject`.
- Confirmed-created `jm1_PublishedBefore`.
- Confirmed-created `jm1_ManuscriptStatusAtIntake`.
- Confirmed-created `jm1_ReferralSource`.
- Captured numeric choice option values for `jm1_ManuscriptType`.
- Captured numeric choice option values for `jm1_PublishedBefore`.
- Confirm table customizations were published. Power Apps reported `Publish succeeded`.
- Confirm Web API entity set name.
- Confirm Dataverse app user/security role.
- Activate the Dataverse adapter only after test-environment validation.
