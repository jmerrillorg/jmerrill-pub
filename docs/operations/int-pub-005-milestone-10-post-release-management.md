# INT-PUB-005 Milestone 10 Post-Release Management

## Purpose

Milestone #10 prepares the governed post-release management layer after launch/release readiness. It covers annual review, royalty/reporting readiness, catalog health, author support, loyalty progression, backlist optimization, future-title opportunity review, and marketing follow-up boundaries.

This milestone does not issue invoices, process royalty payments, run public campaigns, send recognition emails, provide tax/accounting actions, or start unmanaged post-release work.

## Source Authority

- `JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md`
- `jm1-publishing-strategist-SKILL.md`
- `jm1-publishing-marketing-SKILL.md`
- `jm1-author-book-marketing-SKILL.md`
- ADR-007 loyalty model
- INT-PUB-005 D4 loyalty tier intake behavior

## Required Gates

All new gates default to `false` unless separately authorized:

| Gate | Default | Purpose |
| --- | --- | --- |
| `JM1_POST_RELEASE_MANAGEMENT_ENABLED` | `false` | Milestone #10 readiness evaluation |
| `JM1_ANNUAL_REVIEW_ENABLED` | `false` | BP-14 annual review cycle readiness |
| `JM1_LOYALTY_PROGRESSION_ENABLED` | `false` | BP-15 loyalty progression readiness |
| `JM1_ROYALTY_REPORTING_ENABLED` | `false` | Future live royalty reporting or payout action; must remain false here |
| `JM1_PUBLIC_MARKETING_FOLLOWUP_ENABLED` | `false` | Future public marketing follow-up; must remain false here |

Milestone #10 readiness may evaluate governed state. Live payments, invoices, campaigns, and tax/accounting actions remain separately blocked.

## Dependencies

Milestone #10 requires:

1. Launch/release foundation complete.
2. Distribution live verification.
3. Commercial project/title type.
4. Author Contact resolved.
5. Annual review anniversary basis from locked G4b release date.
6. Commercial published title count for loyalty progression.
7. Royalty/reporting source confirmed or not applicable.
8. Catalog health status available.
9. `JM1_POST_RELEASE_MANAGEMENT_ENABLED=true` for readiness execution.
10. `JM1_ANNUAL_REVIEW_ENABLED=true` for annual review readiness.
11. `JM1_LOYALTY_PROGRESSION_ENABLED=true` for loyalty progression readiness.
12. `JM1_ROYALTY_REPORTING_ENABLED=false`.
13. `JM1_PUBLIC_MARKETING_FOLLOWUP_ENABLED=false`.

## BP-14 Annual Review Scheduler

Annual review opens on each title anniversary, based on the locked G4b release date.

Readiness prepares:

- annual review status = Open
- annual review date
- annual distribution fee basis
- metadata audit task payload
- review card to Jackie
- safe execution-log evidence

Annual review does not auto-bill.

### Fee Basis

Fee basis follows R2:

| Condition | Basis | Amount |
| --- | --- | --- |
| Active signed Starter Package Schedule covers title | Starter grandfathered | `$30` |
| No active signed Starter Schedule | Standard R2 | `$49` |
| Starter schedule expired | Standard R2 with migration note | `$49` |
| Grandfather claimed without valid reference | Standard R2, flagged for Jackie | `$49` |

The flow computes and surfaces the fee basis only. Jackie approves before any invoice or renewal billing action.

### Metadata Audit

Metadata audit task payloads carry the checklist from the marketing canon:

- description 200-400 words
- BISAC specificity
- 10 keyword fields
- contributors listed
- audience range set
- author bio current
- back cover copy current
- jmerrill.pub links current

The system does not rewrite live metadata automatically.

## BP-15 Loyalty Tier Progression

`Contact.jm1_loyaltytier` remains the source of record. BP-15 is the only between-intakes progression writer, with Jackie as the human authority.

Tier computation:

| Commercial Published Titles | Tier | Marketing Designation |
| --- | --- | --- |
| 1 | Loyal | Returning Author |
| 2-3 | Established | Established Author |
| 4+ | Legacy | Legacy Author - priority JM Signature consideration |

Important boundaries:

- Advancement only.
- No automatic demotion.
- Legacy Editions never count.
- Each credited co-author can be recomputed separately.
- Legacy tier flags JM Signature candidacy only; it does not assign JM Signature.
- Recognition is prepared as a draft only.
- Jackie releases recognition, suggested within 5 business days of advancement.
- Tier affects service fees, never royalties; that distinction stays internal.

## Dataverse Tables / Fields

Existing sources remain preferred:

- Contact
- existing Opportunity
- `jm1_publishingtasks`
- `jm1_executionlogs`
- title/project records used by launch/release readiness

Proposed or expected title fields:

- `jm1pub_annualreviewstatus`
- `jm1pub_annualfeebasis`
- `jm1pub_annualfeeamount`
- `jm1pub_starterscheduleref`
- `jm1pub_grandfatherexpiry`
- `jm1pub_lastmetadataaudit`
- `jm1pub_annualreviewdate`
- `jm1pub_releasedate`
- `jm1pub_distributionliveverified`
- `jm1pub_postreleasestatus`
- `jm1pub_cataloghealthstatus`
- `jm1pub_backlistoptimizationstatus`
- `jm1pub_futuretitleopportunitystatus`

Expected Contact fields:

- `jm1_loyaltytier`
- `jm1_publishedtitlecount`
- `jm1_tieradvanceddate`
- `jm1_signaturecandidate`

If any live field is missing, treat it as schema confirmation before live activation.

## Task / Status Model

Task payloads target `jm1_publishingtasks` and remain payloads only until separately authorized.

Milestone #10 task paths:

- annual review cycle
- metadata audit
- royalty reporting readiness
- catalog health review
- author support review
- loyalty progression review
- backlist optimization review
- future title opportunity review
- marketing follow-up boundary review
- tax/accounting stop review

## Internal Visibility

Internal visibility uses:

- `publishing@jmerrill.one`

Internal notifications and review cards are safe previews only. They must not include manuscript text, prompt body, raw model output, provider responses, credentials, tokens, headers, cookies, or secrets.

## Execution Log Evidence

Safe execution-log payloads target:

- `jm1_executionlogs`

Prepared event names include:

- `AnnualReviewScheduled`
- `AnnualFeeComputed`
- `StarterRateMigrated`
- `MetadataAuditTaskCreated`
- `MetadataAuditComplete`
- `GrandfatherUnverified`
- `AnnualReviewNoReleaseDate`
- `LoyaltyTierAdvanced`
- `SignatureCandidateFlagged`
- `TierRecognitionPrepared`
- `TierContactUnresolved`

The readiness implementation prepares safe evidence; it does not perform live Dataverse writes.

## Explicit Non-Actions

Milestone #10 readiness does not:

- issue invoices
- create payment links
- process royalty payments
- perform tax/accounting actions
- send author recognition
- send public marketing campaigns
- activate marketing agent
- assign JM Signature
- demote loyalty tier
- use QBO for new logic
- use `@jmerrill.pub` as an active mailbox
- expose or commit secrets

## Implementation

Implementation:

`azure-functions/diagnostic-ai-runner/src/postRelease/milestone10PostReleaseManagement.js`

Focused tests:

`azure-functions/diagnostic-ai-runner/test/milestone10PostReleaseManagement.test.js`
