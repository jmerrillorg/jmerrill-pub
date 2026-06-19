# INT-PUB-005 260619 Canon Alignment Before Milestone 9

## Purpose

This pass accounts for the full `/Users/jmerrillone/Downloads/260619` canon folder before Milestone #9. The folder is not editorial-only. It governs agreement, payment, AI disclosure, editorial tracking, future editorial/marketing agents, cover validation, release lock, launch readiness, annual review, loyalty progression, package/service policy, editorial doctrine, strategy, marketing, and blog standards.

Milestone #9 remains paused until pre-Milestone #9 blockers are resolved or explicitly reported.

## Current Pipeline State

| Area | Status |
| --- | --- |
| Milestone #5 | Complete |
| Milestone #6 | Complete |
| Milestone #6B | Complete |
| Milestone #7 | Complete |
| Milestone #7C | Complete to command-center readiness |
| `jm1pub_editorialstage` | Created and confirmed |
| Milestone #8 | Complete |
| Milestone #9 | Not started |
| Milestone #10 | Not started |

## Dataverse Schema Resolution

The BP-07 blocker is resolved.

| Item | Value |
| --- | --- |
| Table logical name | `jm1pub_editorialstage` |
| Schema name | `jm1pub_EditorialStage` |
| Entity set | `jm1pub_editorialstages` |
| Primary ID | `jm1pub_editorialstageid` |
| Primary name | `jm1pub_name` |
| Solution | `JM1_Publishing` |
| Solution component ID | `ed818a60-ef6b-f111-a826-6045bdd69738` |
| Entity metadata ID | `214dac3b-ef6b-f111-a826-6045bdd69738` |

The table was created and published on June 19, 2026. It contains the BP-07/BP-7C stage tracking fields listed in the Milestone #7C runbook.

## Gates

These gates are documented and default false:

| Gate | Default | Purpose |
| --- | --- | --- |
| `JM1_EDITORIAL_COMMAND_CENTER_ENABLED` | `false` | Editorial Command Center live operation |
| `JM1_EDITORIAL_STAGE_TRACKER_ENABLED` | `false` | BP-07 stage-tracker live processing |
| `JM1_EDITORIAL_AGENT_ENABLED` | `false` | Future BP-08 editorial agent |
| `JM1_AI_DISCLOSURE_CAPTURE_ENABLED` | `false` | BP-06 AI disclosure capture automation |
| `JM1_COVER_VALIDATION_ENABLED` | `false` | BP-09 cover validation automation |
| `JM1_RELEASE_LOCK_ENABLED` | `false` | BP-10 release lock automation |
| `JM1_LAUNCH_READINESS_ENABLED` | `false` | BP-11 launch readiness automation |
| `JM1_MARKETING_AGENT_ENABLED` | `false` | Future BP-12 marketing agent |

This pass does not enable any live/public execution gate.

## File-by-File Canon Alignment

| File | Governs | Placement | Status / Action |
| --- | --- | --- | --- |
| `JMP-COMMAND-CENTER-MANIFEST-v1_0.md` | Canon index and command-center authority | All stages | Accounted for as source authority for the full folder, not editorial-only |
| `JMP-PIPELINE-BLUEPRINT-v1_0.md` | J0-J8 doctrine/data/automation/execution map | All stages | Accounted for as sequencing authority through Milestone #10 |
| `JMP-FLOW-BP04-AgreementExecution-v1_0.md` | Agreement execution and G1 evidence | Milestone #6 / pre-M9 | Already-completed milestone source; live contract sending remains separately governed |
| `JMP-FLOW-BP05-ContractPaymentAccepted-v1_0.md` | Payment accepted, G2, project creation boundary | Milestone #6 / pre-M9 | Already-completed milestone source; no invoice/payment action in this pass |
| `JMP-FLOW-BP06-AIDisclosureCapture-v1_0.md` | AI disclosure capture before AI-assisted production/editorial execution | Pre-M9 | Completion pass implemented; gate remains false until live activation |
| `JMP-FLOW-BP07-EditorialStageTracker-v1_0.md` | Editorial stage tracker, J3 event vocabulary, G3 exit | Milestone #7C | Schema-backed by `jm1pub_editorialstage`; stage tracker still gated false |
| `JMP-AGENT-BP08-EditorialAgent-v1_0.md` | Future supervised editorial execution agent | Milestone #7C future readiness | Scaffolded, not active; no autonomous editorial work or author delivery |
| `JMP-FLOW-BP09-CoverValidation-v1_0.md` | Cover validation before production/distribution release | M7/M8/pre-M9 | Completion pass implemented; gate remains false until live activation |
| `JMP-FLOW-BP10-ReleaseLock-v1_0.md` | Release lock before date commitments and downstream submissions | Pre-M9 | Completion pass implemented; gate remains false until live activation |
| `JMP-FLOW-BP11-LaunchReadiness-v1_0.md` | Launch readiness check | Milestone #9 | Launch readiness model implemented behind BP-06/BP-09/BP-10 |
| `JMP-AGENT-BP12-MarketingAgent-v1_0.md` | Future marketing agent support | M9 future readiness | Scaffolded, not active; no autonomous public campaign execution |
| `JMP-FLOW-BP14-BP15-J8-AnnualReview-LoyaltyProgression-v1_0.md` | Annual review and loyalty progression | Milestone #10 | M10 post-release/lifecycle source; not started |
| `JMP-IncludedServices-NonTransferability-Clause-v1_0.md` | Included services, package, onboarding, agreement policy | Milestone #6 | Agreement/onboarding/package governance source; no contract automation here |
| `jm1-author-book-marketing-SKILL.md` | Per-title author marketing kit and launch support | Milestone #9 | M9 launch support source; public scheduling remains gated and human-approved |
| `jm1-publishing-marketing-SKILL.md` | JMP brand marketing and acquisition messaging | Milestone #9 | M9 brand marketing source; marketing agent inactive |
| `jm1-publishing-strategist-SKILL.md` | Strategic advisory, package/release/channel economics | M6/M8/M9 | Accounted for; no live payment or release action |
| `knowledge.md` | Imprint definitions, style guide matrix, hard-stop flags | Milestone #7C | Editorial Command Center doctrine source; final imprint remains G3 human authority |
| `editorial-review.md` | Editorial review and triage | Milestone #7C | Review-stage source; no author-facing AI editorial output |
| `developmental-editing.md` | Developmental editing doctrine | Milestone #7C | Developmental-stage source; no autonomous manuscript editing |
| `line-copyedit-proof.md` | Line edit, copyedit, proofread, mandatory style sheet | M7C/M7/M8 | Style sheet/proofing source; final handoff requires safe style-sheet reference |
| `faith-editorial-overlay.md` | Internal faith/street-lit/children's editorial overlays | Milestone #7C | Internal-only; not named in author-facing output |
| `publishing-strategy.md` | Distribution review, cover intelligence, brand infrastructure | M8/M9 | Distribution/launch planning source; no submission/release action |
| `blog-editorial.md` | Blog and web content standards | Milestone #9 | M9 content support source; public campaign execution remains gated |

## Pre-Milestone #9 Blockers

| Blocker | Status | Evidence |
| --- | --- | --- |
| `jm1pub_editorialstage` absent | Resolved | Table created/confirmed in `JM1_Publishing` |
| BP-06 AI disclosure automation | Completion pass implemented | `JM1_AI_DISCLOSURE_CAPTURE_ENABLED=false`; live activation remains separate |
| BP-09 cover validation | Completion pass implemented | `JM1_COVER_VALIDATION_ENABLED=false`; live activation remains separate |
| BP-10 release lock | Completion pass implemented | `JM1_RELEASE_LOCK_ENABLED=false`; live activation remains separate |

## Explicit Non-Actions

This pass did not:

- start Milestone #9
- set a public release date
- submit to Ingram, CoreSource, KDP, retailers, or any distribution platform
- send launch email
- create royalty setup
- perform post-release work
- activate autonomous editorial agent
- perform autonomous live manuscript editing
- send AI editorial output to an author
- activate a public marketing campaign agent
- use QBO
- use `@jmerrill.pub` as an active mailbox
- expose or commit secrets
- create a duplicate Opportunity

## Implementation

The tested alignment manifest is:

`azure-functions/diagnostic-ai-runner/src/canon/milestoneCanonAlignment.js`

Focused tests:

`azure-functions/diagnostic-ai-runner/test/milestoneCanonAlignment.test.js`
