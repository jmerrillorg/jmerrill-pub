# INT-PUB-005 Publishing Intake Dataverse Mapping

Status: Draft mapping appendix updated after Power Apps column creation
Table display name: Publishing Intake
Dataverse table: `jm1_publishingintake`
Activation status: Blocked pending remaining schema corrections, choice option values, entity-set confirmation, and app-user/security-role confirmation.

This appendix documents the website/API-to-Dataverse mapping for the canonical INT-PUB-005 `/join` intake flow. The Next.js API is responsible only for preparing one Publishing Intake row. Power Automate / Dataverse remain responsible for downstream Contact, Lead, Opportunity, acknowledgment, loyalty, diagnostics, and execution-log work.

## 1. Table

| Item | Value |
|---|---|
| Display name | Publishing Intake |
| Dataverse table | `jm1_publishingintake` |
| Web API entity set | `jm1_publishingintakes` pending confirmation |
| Primary row written by website | One Publishing Intake row only |
| Production write status | Blocked |

## 2. Confirmed Existing and Created Columns

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed existing | Required by `/join`. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed existing | Required by `/join`. |
| email | Email | `jm1_Email` | Email | Confirmed existing | Lowercase-normalized server-side. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed existing | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed existing | Required by `/join`. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed existing | Required; `/join` accepts 100-500000. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed existing | Optional. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed existing | Required; maps author-facing book description to Purpose. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed existing | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Confirmed-created | Max length 100. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Confirmed-created | Max length 100. Used because canonical `/join` captures genre/subject as free text. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Confirmed-created | Values: First book; Published before with JMP; Published before elsewhere. Numeric option values still pending. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Confirmed-created | Max length 1000. Do not mix author-submitted notes into internal-only `jm1_InternalNotes`. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Confirmed-created | Max length 100. Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Confirmed-created | Max length 100. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Confirmed-created | Server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Single line of text | Confirmed-created | Max length 100. Submitted value: `Intake-Reported`. |

## 3. Choice and Schema Findings

| API Field | Existing Candidate | Finding | Mapping Decision | Status |
|---|---|---|---|---|
| workType | `jm1_WorkType` | Existing values do not match canonical `/join` work-type values. Observed examples include Book - Full Service, Book - Blockchain, Book - Children's Book (Picture Book), and Distribution Only. | Do not use `jm1_WorkType`. Map to `jm1_ManuscriptType`. | `blocked_pending_choice_option_values` |
| manuscriptStatus | `jm1_ManuscriptStatus` | Existing column is synced to a Manuscript Type-style value set: Full-length Book, Novella, Children's Picture Book, Poetry Collection, Devotional, Workbook / Journal, Short Story Collection, Other. | Do not use `jm1_ManuscriptStatus`. Use `jm1_StageatSubmission` only if it has exact status values; otherwise create `jm1_ManuscriptStatusAtIntake`. Mapping object currently targets `jm1_ManuscriptStatusAtIntake`. | `blocked_pending_column_creation_or_stage_at_submission_confirmation` |
| referralSource | `jm1_WebsiteSource` | Existing values are only a partial match. Observed examples include Referral, Facebook, Instagram, Google Search, Event / Workshop, and Other. | Do not use `jm1_WebsiteSource`. Create `jm1_ReferralSource` as Single line of text, max 100. | `blocked_pending_column_creation` |
| publishedBefore | `jm1_ApplicantType` | Existing values are Standard and Prestige, which do not match `/join`. | Use confirmed-created `jm1_PublishedBefore`. | Blocked only pending numeric choice option values. |
| genre | `jm1pub_GenreInterest` | Existing column is Choice, but `/join` needs free-text genre/subject. | Use confirmed-created `jm1_GenreSubject`. | Confirmed-created. |

## 4. Remaining Columns Recommended for Creation or Confirmation

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| manuscriptStatus | Manuscript Status at Intake | `jm1_ManuscriptStatusAtIntake` | Single line of text | Recommended unless `jm1_StageatSubmission` is confirmed | Max length 100. Required `/join` values: Complete; Near complete; In progress; Idea stage. |
| referralSource | Referral Source | `jm1_ReferralSource` | Single line of text | Recommended | Max length 100. Required `/join` values: Referral; Church or ministry; Social media; Search; Event; Other. |

## 5. Final API Payload Mapping

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed existing | Required. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed existing | Required. |
| email | Email | `jm1_Email` | Email | Confirmed existing | Lowercase-normalized. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed existing | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed existing | Required. |
| workType | Manuscript Type | `jm1_ManuscriptType` | Choice | Blocked pending numeric choice option values | Do not map to `jm1_WorkType`. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Confirmed-created | Free-text genre/subject. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed existing | Required. |
| manuscriptStatus | Manuscript Status at Intake | `jm1_ManuscriptStatusAtIntake` | Single line of text | Blocked pending column creation or `jm1_StageatSubmission` confirmation | Do not map to `jm1_ManuscriptStatus`. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed existing | Optional. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Confirmed-created, blocked pending numeric choice option values | Values confirmed; numeric values needed for Web API writes. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed existing | Required. |
| referralSource | Referral Source | `jm1_ReferralSource` | Single line of text | Blocked pending column creation | Do not map to `jm1_WebsiteSource`. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Confirmed-created | Author-submitted notes. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed existing | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Confirmed-created | Canonical reference code. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Confirmed-created | Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Confirmed-created | Stored for replay/audit support. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Confirmed-created | Server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Single line of text | Confirmed-created | Submitted value: `Intake-Reported`. |

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

- `jm1_ManuscriptStatusAtIntake` is created or `jm1_StageatSubmission` is confirmed to have exact `/join` status values.
- `jm1_ReferralSource` is created.
- Choice option numeric values are confirmed for `jm1_ManuscriptType`.
- Choice option numeric values are confirmed for `jm1_PublishedBefore`.
- Web API entity set name is confirmed.
- Dataverse app user and security role are confirmed.
- Required fields are satisfied in a test environment.
- Test environment is ready.
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
- Confirm table customizations were published. Power Apps reported `Publish succeeded`.
- Confirm or create manuscript status target: `jm1_StageatSubmission` exact values or new `jm1_ManuscriptStatusAtIntake`.
- Create `jm1_ReferralSource`.
- Capture numeric choice option values for `jm1_ManuscriptType`.
- Capture numeric choice option values for `jm1_PublishedBefore`.
- Return final mapping to Codex for production adapter activation.
