# INT-PUB-005 Publishing Intake Dataverse Mapping

Status: Draft mapping appendix
Table display name: Publishing Intake
Dataverse table: `jm1_publishingintake`
Activation status: Blocked pending missing-column creation, choice-value verification, entity-set confirmation, and app-user/security-role confirmation.

This appendix documents the website/API-to-Dataverse mapping for the canonical INT-PUB-005 `/join` intake flow. The Next.js API is responsible only for preparing one Publishing Intake row. Power Automate / Dataverse remain responsible for downstream Contact, Lead, Opportunity, acknowledgment, loyalty, diagnostics, and execution-log work.

## 1. Table

| Item | Value |
|---|---|
| Display name | Publishing Intake |
| Dataverse table | `jm1_publishingintake` |
| Web API entity set | `jm1_publishingintakes` pending confirmation |
| Primary row written by website | One Publishing Intake row only |
| Production write status | Blocked |

## 2. Confirmed Existing Columns

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed existing | Required by `/join`. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed existing | Required by `/join`. |
| email | Email | `jm1_Email` | Email | Confirmed existing | Lowercase-normalized server-side. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed existing | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed existing | Required by `/join`. |
| workType | Work Type | `jm1_WorkType` | Choice | Existing column, values unverified | Choice values must be verified before production activation. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed existing | Required; `/join` accepts 100–500000. |
| manuscriptStatus | Manuscript Status | `jm1_ManuscriptStatus` | Choice | Existing column, values unverified | Choice values must be verified before production activation. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed existing | Optional. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed existing | Required; maps author-facing book description to Purpose. |
| referralSource | Website Source | `jm1_WebsiteSource` | Choice | Existing column, values unverified | Choice values must be verified before production activation. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed existing | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Preferred new column | Use `jm1_Name` fallback only if dedicated field is not created. |

## 3. Choice Columns Requiring Value Verification

| API Field | Dataverse Display Name | Logical Name | Required `/join` Values | Status |
|---|---|---|---|---|
| workType | Work Type | `jm1_WorkType` | Full-length Book; Novella; Children's Picture Book; Poetry Collection; Devotional; Workbook / Journal; Short Story Collection; Other | Verify exact choice labels/values. |
| manuscriptStatus | Manuscript Status | `jm1_ManuscriptStatus` | Complete; Near complete; In progress; Idea stage | Verify exact choice labels/values. |
| referralSource | Website Source | `jm1_WebsiteSource` | Referral; Church or ministry; Social media; Search; Event; Other | Verify exact choice labels/values. |
| publishedBefore | Applicant Type or Published Before | `jm1_ApplicantType` or `jm1_PublishedBefore` | First book; Published before with JMP; Published before elsewhere | Verify whether `jm1_ApplicantType` already has exact values. If not, create `jm1_PublishedBefore`. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Intake-Reported | Can be choice or single line of text. |

## 4. Missing Columns to Create

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Create preferred dedicated field | Fallback is primary name `jm1_Name` only if this field is not created. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Create unless genre becomes controlled choice | Canon `/join` currently treats genre as free text, 1–100 chars. Existing candidate `jm1pub_GenreInterest` is Choice. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Create unless `jm1_ApplicantType` has exact values | Values: First book; Published before with JMP; Published before elsewhere. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Create | Do not mix author-submitted notes into internal-only `jm1_InternalNotes`. Max length: 1000. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Create | Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Create | Max length: 100. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Create | Use server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Choice or Single line of text | Create | Submitted value: `Intake-Reported`. |

## 5. Final API Payload Mapping

| API Field | Dataverse Display Name | Logical Name | Data Type | Status | Notes |
|---|---|---|---|---|---|
| firstName | First Name | `jm1_FirstName` | Single line of text | Confirmed existing | Required. |
| lastName | Last Name | `jm1_LastName` | Single line of text | Confirmed existing | Required. |
| email | Email | `jm1_Email` | Email | Confirmed existing | Lowercase-normalized. |
| phone | Mobile Phone | `jm1_MobilePhone` | Phone number | Confirmed existing | Optional. |
| bookTitle | Project Title | `jm1_ProjectTitle` | Single line of text | Confirmed existing | Required. |
| workType | Work Type | `jm1_WorkType` | Choice | Choice values unverified | Blocker. |
| genre | Genre / Subject | `jm1_GenreSubject` | Single line of text | Missing column | Create if free-text genre remains canon. |
| wordCount | Estimated Word Count | `jm1_EstimatedWordCount` | Whole number | Confirmed existing | Required. |
| manuscriptStatus | Manuscript Status | `jm1_ManuscriptStatus` | Choice | Choice values unverified | Blocker. |
| manuscriptUrl | Manuscript URL | `jm1_ManuscriptURL` | URL | Confirmed existing | Optional. |
| publishedBefore | Published Before | `jm1_PublishedBefore` | Choice | Missing unless Applicant Type is confirmed | Blocker. |
| bookDescription | Purpose | `jm1_Purpose` | Multiple lines of text | Confirmed existing | Required. |
| referralSource | Website Source | `jm1_WebsiteSource` | Choice | Choice values unverified | Optional but blocker for activation. |
| additionalNotes | Additional Notes | `jm1_AdditionalNotes` | Multiple lines of text | Missing column | Author-submitted notes. |
| consent | Consent to Contact | `jm1_ConsenttoContact` | Yes/no | Confirmed existing | Required true. |
| reference | Intake Reference Code | `jm1_IntakeReferenceCode` | Single line of text | Missing preferred column | Fallback: `jm1_Name` if approved. |
| intakeChannel | Intake Channel | `jm1_IntakeChannel` | Single line of text | Missing column | Submitted value: `INT-PUB-005 /join`. |
| idempotencyKey | Idempotency Key | `jm1_IdempotencyKey` | Single line of text | Missing column | Stored for replay/audit support. |
| consentTimestamp | Consent Timestamp | `jm1_ConsentTimestamp` | Date and time | Missing column | Server receipt timestamp. |
| wordCountSource | Word Count Source | `jm1_WordCountSource` | Choice or Single line of text | Missing column | Submitted value: `Intake-Reported`. |

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

- All missing columns have been created.
- Choice values are verified for `jm1_WorkType`.
- Choice values are verified for `jm1_ManuscriptStatus`.
- Choice values are verified for `jm1_WebsiteSource`.
- Published-before mapping is confirmed.
- Web API entity set name is confirmed.
- Dataverse app user and security role are confirmed.
- Required fields are satisfied.
- Test Dataverse environment is ready.
- Dead-letter behavior is either implemented or explicitly accepted as not configured for the activation phase.

## 8. Power Platform Creation Checklist

- Create `jm1_IntakeReferenceCode`.
- Create `jm1_IntakeChannel`.
- Create `jm1_IdempotencyKey`.
- Create `jm1_ConsentTimestamp`.
- Create `jm1_WordCountSource`.
- Create `jm1_AdditionalNotes`.
- Create `jm1_GenreSubject`, unless genre will use `jm1pub_GenreInterest`.
- Create `jm1_PublishedBefore`, unless `jm1_ApplicantType` has exact required values.
- Verify choices for `jm1_WorkType`.
- Verify choices for `jm1_ManuscriptStatus`.
- Verify choices for `jm1_WebsiteSource`.
- Verify choices for publishedBefore mapping.
- Publish table customizations.
- Return final mapping to Codex for activation.
