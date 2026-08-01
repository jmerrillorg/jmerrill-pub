# JM1 Publishing Production Closeout

Program: JM1 Enterprise Completion Sprint
Closeout date: 2026-08-01
Scope: Post-PR #368 production closeout and operational transition
Final classification: `PUBLISHING IMPLEMENTATION COMPLETE - TITLE-LEVEL WORK REMAINS`

## Executive Summary

PR #368 completed the Publishing implementation repair for release observability and author-review package policy. It was merged and promoted to production successfully. Later governed releases for JM1-INFRA-007 and Publishing SWA retirement superseded the live production release SHA, so PR #368 is recorded as a completed historical production promotion while current production truth is recorded separately.

Publishing is now an operating platform rather than an implementation workstream. Remaining work is title management, editorial/layout holds, cadence certification, PROGRAM-004/Annex S governance, and related operating decisions.

No implementation work was reopened during this closeout.

## Production Deployment

| Item | Readback |
|---|---|
| PR | `#368` |
| PR title | `Correct release observability and author-review package policy` |
| PR head | `226158cb18da405ab09ab18b3b9ecc563144c410` |
| Merge SHA | `bc64b314c949cfd177b5b8e59efa1a6208cacc4a` |
| Merge timestamp | `2026-08-01T06:27:31Z` |
| Production deployment workflow | Publishing App Service CI/CD |
| PR #368 production deployment run | `30689479000` |
| Run URL | `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/30689479000` |
| Run result | Success |
| PR #368 production promotion | Complete |
| Later governed live release | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Later release source | PR #369 Node 24 runtime standardization |

## Runtime Verification

Current production readback:

| Item | Result |
|---|---|
| App Service | `app-jm1-pub-prod` |
| Runtime | `NODE|24-lts` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~24` |
| `JM1_RELEASE_SHA` | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| Always On | `true` |
| Health check path | `/api/health` |

The live release is later than PR #368 because INFRA-007 production promotion completed after PR #368. This does not reopen PR #368 implementation.

## Health Verification

Observed 2026-08-01:

| Probe | Result |
|---|---|
| `https://jmerrill.pub/api/health` | HTTP 200; `status=ready`; release `77230c077f37910f75cf7b274734475ac1a92d3e`; payment gate disabled |
| `https://app-jm1-pub-prod.azurewebsites.net/api/health` | HTTP 200; same release |
| `https://jmerrill.pub/` | HTTP 200 |
| `https://jmerrill.pub/join` | HTTP 200 |
| `https://jmerrill.pub/api/author/context` unauthenticated | HTTP 401 fail-closed |
| `https://jmerrill.pub/api/publishing/intake/config` | HTTP 200 |

Health dependency readback reported required configuration, Dataverse, Microsoft Graph / SharePoint, ACS notification relay, artifact configuration, Author Portal session configuration, and Stripe enrollment configuration present at status level without exposing secret values.

## Five-Title Readback

Fresh Dataverse readback was performed for:

- The Intentional Leader
- Before You Were Born
- The Long Watch
- The General's Will and Last Testament
- Establishing Glory: The Library

| Title | Title ID | Current stage / package | Workspace / lifecycle truth | Current hold | Author access / visibility | Release eligibility | Final operational state |
|---|---|---|---|---|---|---|---|
| The Intentional Leader | `e797232b-da7a-f111-ab0f-00224820105b` | Latest stage: `Interior Layout Release Exception - The Intentional Leader, Volume I`; stage type `Hold / Blocked`; status `On Hold / Blocked`; 4 internal artifacts | Proofreading is complete and approved; interior layout package exists as internal-only evidence | Active interior layout release exception remains | Latest interior artifacts are internal only; prior proofread manuscript is author-facing and approved | Not release-eligible until interior layout release exception is cured | `WAITING ON INTERNAL CORRECTION` |
| Before You Were Born | `91c5e1ef-2980-f111-ab0f-7c1e525b15c2` | `Developmental Editing - Before You Were Born`; status `In Progress`; package/stage ID `88189235-8f80-f111-ab0f-6045bdd69435` | Developmental package artifacts exist; latest package manifest v2 is internal only | No hard stop flag; prior release-schedule evidence gap remains historically preserved | Internal only; no author-visible artifact timestamp in latest package readback | Not author-review eligible until package release and cadence proof are governed | `WAITING ON INTERNAL CORRECTION` |
| The Long Watch | `a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2` | `Developmental Editing - The Long Watch`; status `In Progress`; stage ID `12d961fc-0f85-f111-ab0f-00224820105b` | Editorial Review remains in progress/watch; developmental package artifacts exist internally | No hard stop flag in readback | Internal-only artifacts; no author-visible package timestamp | Not author-review eligible | `WAITING ON INTERNAL CORRECTION` |
| The General's Will and Last Testament | `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2` | `Developmental Editing - The General's Will and Last Testament`; status `In Progress`; package/stage ID `c2799c31-8f80-f111-ab0f-00224820105b` | Editorial Review complete; developmental package artifacts exist internally | No hard stop flag in readback; legal/editorial boundaries remain preserved | Internal-only artifacts; no author-visible package timestamp | Not author-review eligible | `WAITING ON INTERNAL CORRECTION` |
| Establishing Glory: The Library | `f1908dc9-5775-f111-ab0f-6045bdd69435` | `Developmental Editing - Establishing Glory: The Library`; status `In Progress`; stage ID `3362a1cb-1984-f111-ab0f-000d3a14673b` | Valid live compilation title; prior Editorial Review complete; developmental package artifacts exist internally | No hard stop flag in readback; source-compilation placement remains operational work | Internal-only artifacts; no author-visible package timestamp | Not author-review eligible | `WAITING ON INTERNAL CORRECTION` |

## Current Holds

The Intentional Leader still has an active interior layout release exception. Required cure: complete and approve the interior layout release package before author-facing release, notification, or stage advancement.

Owner: Publishing operations / publisher.
Expected next action: resolve the interior layout package readiness and produce governed approval evidence.

No title was released, advanced, or notified during this closeout.

## Publishing Safety Audit

Readback and execution-log review support the following:

| Safety item | Result |
|---|---|
| Author communication caused by closeout | 0 observed |
| Package release caused by closeout | 0 observed |
| Duplicate notification caused by closeout | 0 observed |
| Lifecycle advancement caused by closeout | 0 observed |
| Title advancement caused by closeout | 0 observed |
| Unexpected Dataverse write by this closeout | 0; read-only queries only |
| Execution-log corruption | 0 observed |
| Stripe activity | 0 performed |
| Business Central activity | 0 performed |
| Payment / payout | 0 performed |
| DNS modification | 0 performed |

## Execution-Log Verification

`jm1_executionlog` records after `2026-08-01T06:20:00Z` contained recurring editorial runtime and package-handoff health events:

- `EDITORIAL_RUNTIME_RECOVERY_COMPLETED`
- `EDITORIAL_PACKAGE_HANDOFF_HEALTH_REFRESHED`

No post-PR #368 release, author-notification, Stripe, payout, Business Central, or title-advancement chains were observed in the sampled execution-log window.

## Cadence Readiness

The July 30 cadence event remains historically preserved as incomplete evidence / execution-log failure. This closeout does not reinterpret or backfill it.

Current five-title queue does not yet contain a fully qualified positive-path cadence candidate because the active package readback shows internal-only artifacts and unresolved title-level readiness for all five titles. Recommended next cadence certification should wait until one selected title has:

1. complete approved package contents;
2. author-visible artifact readiness;
3. verified recipient and access route;
4. approved notification template;
5. no title-level hold;
6. correlation strategy and observation window; and
7. execution-log continuity preflight.

Recommended candidate once cured: `Before You Were Born`, package/stage `88189235-8f80-f111-ab0f-6045bdd69435`, because it is already the historically referenced cadence package. It is not ready today.

## Remaining Dependencies

Internal operating work:

- Cure The Intentional Leader interior layout release exception.
- Complete internal corrections for the other four title packages.
- Select and preflight a safe cadence certification candidate.
- Complete title-specific author-review release packages only when release gates are satisfied.

Separate governance work:

- Cadence certification remains open.
- PROGRAM-004 remains separate.
- Annex S remains separate.

External or administrative work:

- GATE-W3 Productions Microsoft/support exception remains separate.
- Any legal review for legally sensitive manuscripts remains outside this software closeout.

## Recommended Next Workstream

Move from Publishing implementation to Publishing operations:

1. Resolve title-level package holds.
2. Certify one governed cadence release using the repaired pipeline.
3. Continue PROGRAM-004 and Annex S closure as separate governance tracks.

## Evidence Index

| Evidence | Location / identifier |
|---|---|
| PR #368 | `https://github.com/jmerrillorg/jmerrill-pub/pull/368` |
| PR #368 merge SHA | `bc64b314c949cfd177b5b8e59efa1a6208cacc4a` |
| PR #368 deployment run | `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/30689479000` |
| Current production health release | `77230c077f37910f75cf7b274734475ac1a92d3e` |
| INFRA-007 final certification | `docs/operations/generated/JM1-INFRA-007-NODE-24-RUNTIME-STANDARDIZATION-2026-08-01/` |
| SWA retirement evidence | `docs/operations/generated/JM1-INFRA-012-PUBLISHING-SWA-RETIREMENT-2026-08-01/` |

## Final Classification

`PUBLISHING IMPLEMENTATION COMPLETE - TITLE-LEVEL WORK REMAINS`

