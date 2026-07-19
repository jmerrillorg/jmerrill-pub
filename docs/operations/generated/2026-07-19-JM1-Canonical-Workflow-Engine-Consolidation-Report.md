# JM1 Canonical Workflow Engine Consolidation Report

Date: 2026-07-19

Authority: Jackie

Scope: JM1 Enterprise Runtime codebase audit after PR #324. This report organizes remaining work by reusable engine rather than by individual editorial stage.

## Executive Summary

The platform has crossed from stage-by-stage repair into reusable runtime consolidation. The strongest live engines are now the Notification Engine, Inbound Communications Engine, Stage Transition Engine for Proofreading approval, Workspace Rendering Engine, Publisher Today Rendering Engine, Royalty Engine, Identity & Access Engine, and Communications Engine. Several engines are still partial or bridge-dependent, most visibly Package Engine materialization, Cadence Engine enforcement beyond notification gating, Marketing Engine event hooks, Distribution Engine, EPUB Engine, ISBN Engine, Audiobook Engine, Children’s Book Engine, and Analytics Engine.

The main duplication remaining is not in the newly commissioned notification/reply path; it is in older stage execution scripts and read-model test fixtures that still encode stage names, stage messages, package wording, and publisher workload state inline. Those must be reduced by moving stage definitions into configuration consumed by the canonical engines.

## 1. Canonical Engine Inventory

| Engine | Current status | Primary implementation | Stages currently consuming it | Duplicated logic remaining | Unique exceptions | Remaining Cody bridges |
|---|---|---|---|---|---|---|
| Stage Transition Engine | PARTIAL | `lib/server/approval-event-consumer.ts`, `azure-functions/diagnostic-ai-runner/src/orchestration/approvalEventConsumer.js`, `lib/server/publishing-orchestrator.ts` | Proofreading approval to Interior Layout; generic editorial approval blocker path exists | Copyediting-to-Proofreading and earlier stage transitions still have historical scripts and stage-specific event naming | Proofreading is first fully commissioned transition because it has a live A5 proof asset | Some transitions still require Cody/Publisher action until per-stage executors are replaced with a generic next-stage registry |
| Notification Engine | LIVE / PARTIAL | `lib/server/author-package-notification-engine.ts`, `lib/server/publishing-orchestrator.ts` | Developmental, Line, Copyediting, Proofreading, Interior Layout, Cover Design, Production Proof policies declared; Proofreading live transaction proven | `sendProofreadingNotification` remains stage-named and should become `sendAuthorReviewPackageNotification` driven by policy | File-size link-only exceptions for layout/cover/production proof packages are policy-based | Proofreading send has a bridge wrapper; other stage sends need to call the same engine directly |
| Package Engine | PARTIAL | `AUTHOR_PACKAGE_NOTIFICATION_POLICIES` in `lib/server/author-package-notification-engine.ts`; stage execution scripts under `scripts/` produce artifacts | Policy declares package requirements for all author-review stages | Artifact creation still lives in stage scripts like CAP-002/CAP-003/CAP-004 work products | Oversized package link-only exception allowed by explicit policy | Package generation for manuscript stages still depends on Cody-generated artifacts and scripts |
| Workspace Rendering Engine | LIVE / PARTIAL | `lib/server/author-portal-context.ts`, `lib/server/author-portal-status.ts`, `app/author/_components/AuthorPortalWorkspace.tsx` | Active author projects across current editorial/production states | Historical completed package language and stage-specific text tests remain | Author-safe language differs by operational state, which is legitimate when config-driven | Some stage text still derived from conditional code rather than a central stage-message registry |
| Publisher Today Rendering Engine | LIVE / PARTIAL | `lib/server/publisher-operating-center.ts`, `app/publisher/_components/PublisherOperatingCenterClient.tsx`, `scripts/publisher_today_read_model.test.mjs` | Active portfolio, publisher workload, royalty queues, notification pending states | Workload state union and next-action text still inline stage-specific strings | Publisher Today may expose internal operational detail not shown to authors | Some Publisher Today refreshes remain tied to manual/Cody operational updates |
| Cadence Engine | CODY_BRIDGE / PARTIAL | `CadenceSchedule` type and notification gating in `lib/server/publishing-orchestrator.ts` | Proofreading release timing only at current proof boundary | Business-day cadence rules are not yet shared across every stage | Publisher override is valid when logged | No durable scheduler owns all package release timings yet |
| Marketing Engine | PARTIAL | `app/api/author/marketing-profile/route.ts`, CAP-011 tests and Publisher Center state | Author Marketing Profile; marketing-state movement | Marketing hooks from stage transitions are mostly event names, not full runtime behavior | Public marketing release remains separately gated | Still requires event-driven hooks from every stage transition |
| Production Engine | PARTIAL | `lib/server/publishing-orchestrator.ts`, `azure-functions/.../approvalEventConsumer.js`, `scripts/publisher_ops_wave2_execute.py` | Proofreading approval can start Interior Layout; cover brief readiness exists | Interior Layout, Cover Design, Production Proof have separate readiness/start scripts | Cover concept can run before final page count; full wrap cannot | Production starts still partly Cody-assisted outside the first event-driven transition |
| Distribution Engine | NOT_IMPLEMENTED / PARTIAL | `lib/distribution-data.ts`, distribution pages, milestone readiness docs | Public distribution pages; readiness concepts | No unified distributor router yet | KDP exception/manual portal can remain policy-selected | Requires routing engine for IngramSpark/CoreSource/KDP/manual/API |
| Royalty Engine | LIVE / PARTIAL | `app/api/publisher/royalties/import/route.ts`, `scripts/check-royalty-import-route.mjs`, royalty wave reports | Royalty source ingestion, import guard, decision queues | Decision resolution and statements still depend on publisher queue actions | Current payment obligation scoped to Jan-Mar 2026 while ingestion can cover Jan-Jun | Some statement approval/payment workflows remain held for Jackie decisions |
| Communications Engine | LIVE / PARTIAL | `AUTHOR_PUBLISHING_COMMUNICATION_POLICY`, ACS relay usage, `azure-functions/.../agreementPackageSendRunner.js` | Author package notifications, agreement package sends, correction notices | Older agreement/author-response modules use their own config but are aligned to canonical sender/reply-to/CC | Human manual team mail may originate from `publishing@jmerrill.one` | Full template catalog needs central header validation everywhere, including future royalty statements |
| Identity & Access Engine | LIVE | `lib/server/author-durable-auth.ts`, `lib/server/author-access.ts`, author auth guard | Author Operating Center, Publisher Operating Center route precedence, protected APIs | Minimal remaining duplication in route guards | Publisher may intentionally switch into author view; author cannot access publisher APIs | Password reset hardening remains Level 2, not a Level 1 blocker |
| Inbound Communications Engine | LIVE / NEW | `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js`, `lib/server/author-response-inbound-correlation.ts`, `lib/server/author-reply-bounce-processing.ts` | All author-review gates via monitored mailbox path; proof begins with `publishing@jmerrill.one` Inbox | Subject probe currently has a Proofreading special-case and should be replaced by notification evidence correlation records | Admin replay exists only for failed-event remediation | Live author response still pending because original bounced response was unrecoverable |

## 2. Engine-to-Stage Consumption Matrix

Legend: `L` live, `P` partial/policy declared, `B` Cody bridge, `N` not implemented.

| Engine | Developmental | Line | Copy | Proof | Layout | Cover | Production |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stage Transition Engine | P | P | P | L | P | P | N |
| Notification Engine | P | P | P | L | P | P | P |
| Package Engine | B | B | B | B | P | P | P |
| Workspace Rendering Engine | L | L | L | L | P | P | P |
| Publisher Today Rendering Engine | L | L | L | L | P | P | P |
| Cadence Engine | P | P | P | P | P | P | P |
| Marketing Engine | P | P | P | P | P | P | P |
| Production Engine | N | N | N | L | P | P | P |
| Distribution Engine | N | N | N | N | N | N | P |
| Royalty Engine | N/A | N/A | N/A | N/A | N/A | N/A | P |
| Communications Engine | P | P | P | L | P | P | P |
| Identity & Access Engine | L | L | L | L | L | L | L |
| Inbound Communications Engine | P | P | P | L | P | P | P |

Blank cells have been intentionally avoided; every stage has an explicit state.

## 3. Duplicate Implementations Removed

This pass removed no historical stage-specific implementation outright. The safe change made in this branch is preventive and structural:

- Added `scripts/check-canonical-workflow-engine-declarations.mjs`.
- Added `npm run workflow-engine-guard`.
- Added engine declarations to the newly deployed inbound author-response runtime.

The previous runtime consolidation already removed the most dangerous duplication in the live Proofreading reply path by moving header policy and inbound processing into shared engines rather than a Proofreading-only template patch.

## 4. Remaining Duplicated Logic

| Duplicate area | Evidence | Responsible engine | Remediation |
|---|---|---|---|
| Stage-specific notification wrapper | `sendProofreadingNotification` in `lib/server/publishing-orchestrator.ts` | Notification Engine | Rename/generalize to `sendAuthorReviewPackageNotification` and dispatch by `AuthorReviewPackageType` |
| Stage-specific author package copy | `buildAuthorReviewNotificationCopy` currently has corrected Proofreading copy | Notification Engine / Communications Engine | Move subject/body text into stage package configuration |
| Stage-specific Publisher Today workload strings | `PublisherWorkloadState` and derived next-action text in `lib/server/publisher-operating-center.ts` | Publisher Today Rendering Engine | Replace inline string conditions with stage/status/action registry |
| Stage-specific Author Workspace text | `author-portal-context.ts` and status rendering tests | Workspace Rendering Engine | Move public-facing stage messages into central stage-message matrix |
| Stage-specific artifact generation scripts | CAP-002/CAP-003/CAP-004 scripts and generated files | Package Engine | Create shared package generation API for manuscript, memo, cover note, checksum, SharePoint registration |
| Stage-specific production start scripts | `scripts/publisher_ops_wave2_execute.py` and readiness artifacts | Production Engine | Replace with production-stage registry and event-driven start criteria |
| Inbound subject special case | `subjectProbeForGate` special-cases The Intentional Leader / Proofreading | Inbound Communications Engine | Correlate from persisted notification evidence/message IDs rather than subject fallback |

## 5. Remaining Cody Bridges by Engine

| Engine | Cody bridge remaining |
|---|---|
| Stage Transition Engine | Non-Proofreading transitions still need generic executor registration |
| Notification Engine | Some stages have policy but not yet all live sends through the engine |
| Package Engine | Manuscript package generation and artifact registration still use Cody scripts |
| Workspace Rendering Engine | Stage message registry not yet fully centralized |
| Publisher Today Rendering Engine | Some refresh evidence remains generated by operational scripts |
| Cadence Engine | No durable scheduler owns all release cadence |
| Marketing Engine | Event hooks exist but not all stage events drive marketing automatically |
| Production Engine | Layout/cover/proof production starts are partially script-assisted |
| Distribution Engine | Distributor routing engine not commissioned |
| Royalty Engine | Decision processing is live, but payments/statements remain held pending publisher decisions |
| Communications Engine | Header policy live for author package engine; older communications need full migration audit |
| Identity & Access Engine | Minimal bridge; mostly complete |
| Inbound Communications Engine | Subject fallback remains until notification evidence correlation is complete |

## 6. Remaining Enterprise Work Organized by Engine

| Pipeline register item | Engine | Classification | Next implementation movement |
|---|---|---|---|
| Event Transition Engine | Stage Transition Engine | PARTIAL | Generalize next-stage executor registry beyond Proofreading |
| Notification Engine | Notification / Communications Engine | LIVE / PARTIAL | Replace stage-named send wrapper with policy-driven send |
| Inbound Communications Engine | Inbound Communications Engine | LIVE / PARTIAL | Replace subject fallback with persisted notification evidence correlation |
| Marketing Engine | Marketing Engine | PARTIAL | Subscribe marketing state changes to stage/package events |
| EPUB Production Engine | Production Engine / Distribution Engine | NOT_IMPLEMENTED | Define EPUB generation standard and Vellum exception policy |
| ISBN Engine | Catalog / Distribution Engine | PARTIAL | Connect ISBN records to production/distribution readiness |
| Distribution Engine | Distribution Engine | NOT_IMPLEMENTED | Implement routing policy for IngramSpark, CoreSource, KDP exception, manual portal, API |
| Audiobook Engine | Production Engine / Distribution Engine | NOT_IMPLEMENTED | Define ACX/audiobook production and distribution path |
| Children’s Book Engine | Production Engine | NOT_IMPLEMENTED | Define illustrated layout, image-rights, and production package path |
| Analytics Engine | Publisher Today / CAP-010 | PARTIAL | Move current operational metrics into a durable analytics refresh engine |

## 7. Drift Prevention

The new guard requires new engine-sensitive runtime files to declare:

```text
Engine:
Reusable? Y/N
Stage-specific exception? Y/N
```

If `Stage-specific exception? Y` is used, the file must also include an `Approved exception:` rationale. The guard is changed-file based so it does not fail historical legacy files until they are touched; it prevents new drift while allowing incremental consolidation.

Validation command:

```bash
npm run workflow-engine-guard
```

## 8. Recommendation for the Next Engine to Commission

Commission the **Package Engine** next.

Reason: Notification and inbound reply processing are now strong enough to expose the next bottleneck. Packages are still assembled by stage-specific scripts and generated artifacts. A canonical Package Engine would let Developmental, Line, Copyediting, Proofreading, Layout, Cover, and Production Proof all consume the same artifact manifest, checksum, attachment, SharePoint, Author Workspace, and communication-evidence contract.

Recommended next slice:

1. Define `AuthorReviewPackageDefinition` with artifact roles, source artifact, output artifacts, checksum policy, SharePoint folder policy, author visibility policy, and notification policy.
2. Replace Proofreading/Copyediting/Line package artifact assembly scripts with engine calls where practical.
3. Make Notification Engine accept only Package Engine manifests, not ad hoc attachment arrays.
4. Add package-manifest tests for Developmental, Line, Copyediting, Proofreading, Layout, Cover, and Production Proof.

Final boundary: every future package-release fix should happen once in the Package Engine or Notification Engine and then flow to every stage that consumes it.
