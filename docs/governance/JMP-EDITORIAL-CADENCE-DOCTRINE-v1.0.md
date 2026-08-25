# JMP Editorial Cadence Doctrine v1.0

Status: CANON
Authority: Jackie Smith, Jr. - Publishing Governance Authority
Reviewed: 2026-07-21
Canonized: 2026-08-25
Scope: J Merrill Publishing author-facing editorial and production package release cadence across J0-J8
Implementation authority: LIMITED - cadence calculation, cadence persistence, response restart, and scheduled-eligibility evaluation only
Client-title automation: FROZEN except for the bounded cadence functions named in this doctrine

## Purpose

This doctrine governs how J Merrill Publishing calculates and preserves the hold-time cadence between an author response and the next author-facing release package. It prevents immediate downstream execution after an author reply, preserves human rhythm, and makes the calculation auditable.

## Provenance

Recovered source runtime:
`/Volumes/UsersExternal/JM1/_WORKSPACES/Cody/repos/jmerrill-pub-commercial/lib/server/editorial-cadence-engine.ts`

Recovered source SHA-256:
`2353e2f25afeef1068090381cb7b53c29e8e0d245c0ad3f9517afa0fb0cc814e`

Recovered coverage report:
`/Volumes/UsersExternal/JM1/_WORKSPACES/Cody/evidence/publishing/cadence/full-pipeline-coverage/JM1-Full-Publishing-Pipeline-Cadence-Matrix-Report.md`

Recovered coverage report SHA-256:
`cc178f7ef97cb6bec5a5753e51b29f2a57eecd8ad4a31e959a9b439bd9fb010c`

Recovered stage baseline CSV SHA-256:
`8530f3cd00910b946f4c7d85727891e32b43ea23b6897045e527b1e0ca237b53`

These recovered artifacts informed this canon, but the current governed repository copy is the operational authority after canonization.

## Stage Baselines

Baseline days are business days and are never reduced by word-count, book-type, or complexity multipliers.

| Stage | Profile | Baseline business days |
|---|---|---:|
| EDITORIAL_REVIEW | standard | 2 |
| EDITORIAL_REVIEW | complex | 3 |
| DEVELOPMENTAL_EDITING | children-picture-book | 3 |
| DEVELOPMENTAL_EDITING | poetry | 4 |
| DEVELOPMENTAL_EDITING | devotional | 4 |
| DEVELOPMENTAL_EDITING | standard-nonfiction | 5 |
| DEVELOPMENTAL_EDITING | memoir-leadership | 6 |
| DEVELOPMENTAL_EDITING | novel | 7 |
| DEVELOPMENTAL_EDITING | anthology-compilation | 8 |
| DEVELOPMENTAL_EDITING | extended-enterprise | 10 |
| LINE_EDITING | standard | 5 |
| LINE_EDITING | complex | 7 |
| COPYEDITING | standard | 4 |
| COPYEDITING | complex | 6 |
| PROOFREADING | standard | 3 |
| PROOFREADING | complex | 4 |
| INTERIOR_LAYOUT | page-layout-standard | 3 |
| INTERIOR_LAYOUT | complex | 5 |
| COVER_DESIGN | standard | 5 |
| PRODUCTION_PROOF | standard | 3 |
| DISTRIBUTION_PREPARATION | standard | 2 |
| DISTRIBUTION_SUBMISSION | standard | 3 |
| PUBLICATION_LAUNCH | standard | 3 |

## Word-Count Bands

The governed manuscript word count is the count of the artifact entering the stage, not the intake estimate or stale title memory.

| Band | Word count | Multiplier |
|---|---:|---:|
| SMALL | <= 20,000 | 0.75 |
| STANDARD | 20,001-60,000 | 1.00 |
| LARGE | 60,001-100,000 | 1.25 |
| EXTENDED | > 100,000 | 1.50 |

Boundary tests must cover 19,999; 20,000; 20,001; 59,999; 60,000; 60,001; 99,999; 100,000; and 100,001 words.

## Book-Type Multipliers

| Book type | Multiplier |
|---|---:|
| Standard text-forward manuscript | 1.00 |
| Children's picture book | 1.25 |
| Early reader | 0.90 |
| Poetry collection | 1.10 |
| Devotional | 1.00 |
| Workbook or journal | 1.30 |
| Memoir | 1.10 |
| Leadership or business | 1.00 |
| Novel or narrative fiction | 1.20 |
| Academic or research-heavy | 1.35 |
| Anthology or compilation | 1.30 |
| Illustrated nonfiction | 1.25 |
| Complex-accessibility title | 1.30 |

## Complexity Score

Complexity is scored from 0 to 6 using unique governed factors:

| Score | Multiplier |
|---:|---:|
| 0-1 | 1.00 |
| 2-3 | 1.15 |
| 4-5 | 1.30 |
| 6 | 1.50 |

Recognized factors:

- tables-charts-footnotes-citations-references
- images-or-illustrations
- multiple-contributors-voices-or-sources
- sensitivity-legal-medical-theological-factual-rights
- nonstandard-structure-front-back-matter-workbook
- accessibility-remediation

The named authority responsible for assigning the score is Jackie Smith, Jr. or a formally recorded Dataverse delegation. No anonymous score may feed a governed cadence.

Persist:

- complexityScore
- complexityFactors
- assignedBy
- assignedAt
- reviewedBy and reviewedAt where applicable
- previousScore, newScore, overrideReason, overrideAuthority, overrideEvidence, and overriddenAt when changed

## Calculation

The calculation is:

```text
combinedMultiplier = wordCountMultiplier x bookTypeMultiplier x complexityMultiplier
appliedCombinedMultiplier = min(combinedMultiplier, 2.0)
rawBusinessDays = stageBaselineDays x appliedCombinedMultiplier
calculatedBusinessDays = max(stageBaselineDays, ceil(rawBusinessDays))
```

The combined multiplier cap is 2.0x and is applied before `ceil()`. The baseline floor is canonical and prevents a small or simple project from calculating below the stage baseline.

## Rush

Rush is distinct from a rhythm override.

```text
rushBusinessDays = max(1, ceil(calculatedBusinessDays x 0.5))
```

Rush requires explicit authority:

- CADENCE_RUSH_OVERRIDE_APPROVED
- rushApplied
- rushAuthority
- rushReason
- rushApprovedBy
- rushApprovedAt
- delegationId where applicable

## Author-Response Restart

An author response does not cause immediate downstream execution.

Canonical flow:

```text
AUTHOR_REVIEW_PACKAGE_SENT
-> WAITING_ON_AUTHOR
-> AUTHOR_RESPONSE_RECEIVED
-> RESPONSE_CLASSIFIED
-> responsibility determined
-> applicable stage determined
-> cadence recalculated
-> WAITING_ON_JMP
-> scheduled boundary reached
-> next governed action eligible
```

APPROVED:

- record approval
- close the author gate
- determine the next governed stage
- return the title to JMP
- restart cadence for the next stage
- do not immediately execute the next worker

CHANGES_REQUESTED:

- do not close the stage as approved
- return the current-stage revision loop to JMP
- restart current-stage cadence from the response timestamp
- validate and return corrected work to the author before final approval

QUESTION_ONLY:

- no approval
- no advancement
- no cadence restart

QUESTION_WITH_EXPLICIT_APPROVAL:

- may close the gate only when the approval is independently unambiguous

AMBIGUOUS:

- fail closed for Publisher review

## Business Calendar

Timezone:
America/New_York

The author response date is Day 0. The first following eligible business day is Day 1.

Saturday and Sunday are non-business days. Governed JM1 holidays are non-business days. A due boundary may not fall on a weekend or holiday and must roll forward.

After-hours responses do not consume Day 0. Unless superseded by a later governed configuration, the business-day cutoff is 5:00 PM America/New_York.

Persist raw and normalized timestamps. Do not use fixed UTC offsets.

## Twenty-Four-Hour Rhythm

JMP must preserve a minimum 24-hour rhythm between author-facing releases.

The final schedule is the latest of:

- calculated cadence
- rush cadence where approved
- 24-hour rhythm from the prior author-facing delivery
- active hold release
- approved rhythm override

The 24-hour rhythm cannot shorten a longer calculated cadence.

## Rhythm Override

Rhythm override is distinct from rush. A rhythm override changes only the scheduling boundary.

Required event/control:
CADENCE_RHYTHM_OVERRIDE_APPROVED

Persist:

- approvedScheduleAt
- approver
- delegationId where applicable
- approvedAt
- expiresAt
- reason
- evidence

A rhythm override is one-time or time-bounded and must not become permanent policy.

## Author-Status Escalation

The default author-response monitoring route is Day 5, Day 10, Day 15, and Day 20.

At Day 20, no adverse author status may be assigned unless AUTHOR_STATUS_RULING_RECORDED exists.

## Manuscript Word-Count Authority

The source of word count is the governed artifact entering the stage.

Persist:

- artifactId
- artifactChecksum
- wordCount
- countedAt
- countMethod
- countMethodVersion where available

## Cadence Supersession

When an author response returns work to JMP, the new cadence supersedes the prior active cadence for that stage/package context. History is preserved. Only one active scheduled boundary may control the next author-facing release.

Persist:

- supersedesCadenceId
- supersededByCadenceId
- supersededAt
- supersessionReason

## Persistence And Evidence

The cadence schedule must preserve:

- earliestReleaseAt
- scheduledReleaseAt
- remainingHoldDuration
- nextAutomaticAction
- calculationEvidence

`calculationEvidence` must include the governing policy version, stage baseline, word-count band and multiplier, book-type multiplier, complexity score and authority, combined multiplier, applied multiplier, cap status, rush/rhythm/hold inputs, business calendar inputs, and finalScheduledReleaseAt.

The historical `jm1_cadenceschedule` term is preserved as doctrine vocabulary. Current implementation must reuse existing governed persistence structures unless a separate schema authority authorizes a table.

## Client-Title Freeze Boundary

This doctrine authorizes only:

- calculateEditorialCadence
- persistEditorialCadence or governed equivalent persistence
- applyAuthorResponseCadenceRestart
- evaluateScheduledEligibility

It does not authorize broad client-title automation thaw, worker execution, production progression, author communication, or stage advancement outside the currently commissioned runtime gates.

When a scheduled boundary is due, the runtime may mark cadence eligibility. It must not execute a worker unless that worker is separately commissioned and the freeze boundary permits it.

## Indomitable Application

The defective package send is not cadence authority. The corrected author-facing package delivery starts the author-response clock.

When Quanisha Dockery responds:

- consume the governed Outlook response
- classify the response
- calculate and preserve cadence
- if approved, close the Developmental author-review gate, determine the next stage, and calculate Line Editing cadence
- if changes are requested, restart the Developmental revision cadence
- do not immediately execute Line Editing solely because the response arrived

## Amendment

Future revisions require a governed amendment that records:

- version
- approval authority
- effective date
- changed tables or controls
- migration impact
- runtime compatibility impact
- checksums and evidence
