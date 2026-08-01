# Open PR Normalization After SWA Retirement

Readback: GitHub open PR list after INFRA-012 merge and SWA deletion.

SWA preview capacity is no longer an active Publishing PR blocker because the SWA workflow, token secrets, previews, and resource are retired. Open PRs with historical SWA failures should now be classified by mergeability, supersession, evidence status, and App Service validation needs.

| PR | Title | Current state | Classification | Rationale |
| --- | --- | --- | --- | --- |
| #377 | Post-INFRA-007 operational completion readback | OPEN / CLEAN | EVIDENCE_ONLY | Current PR for this post-SWA operational readback and credential hygiene assessment. |
| #376 | Priority Wave 2: Finish enterprise governance | OPEN / CLEAN | READY_FOR_REVIEW | Governance evidence package; not blocked by SWA. |
| #375 | Add PR #370 live cadence closeout evidence | OPEN / CLEAN | EVIDENCE_ONLY | Likely closeout evidence after PR #370 merged; review for supersession against main cadence package before merge. |
| #374 | Close out PR #368 production promotion | OPEN / CLEAN | EVIDENCE_ONLY | PR #368 is already merged; review whether this closeout is superseded by PR #377 live readback. |
| #373 | JM1-INFRA-013: Enterprise App Service completion evidence | OPEN / CLEAN | READY_FOR_REVIEW | Evidence/topology package; no SWA check dependency. |
| #366 | Close Azure Functions package-access hygiene | OPEN / DIRTY | READY_FOR_APP_SERVICE_VALIDATION_AFTER_REBASE | Completed remediation evidence but branch conflicts with current main; rebase required. |
| #365 | Preserve Azure GPv1 retirement compliance evidence | OPEN / UNSTABLE | EVIDENCE_ONLY_READY_AFTER_CHECK_REEVALUATION | Azure remediation completed; SWA capacity no longer active blocker, but PR checks/state need review. |
| #363 | Complete Azure Copilot tenant containment governance | OPEN / UNSTABLE | EVIDENCE_ONLY_READY_AFTER_CHECK_REEVALUATION | Tenant governance completed; SWA capacity no longer active blocker, but PR checks/state need review. |
| #359 | GATE-W3 Productions platform exception evidence | OPEN DRAFT / DIRTY | SUPERSEDED_OR_HOLD | GATE-W3 frozen administrative exception; do not resume engineering. |
| #358 | GATE-W3 platform exception evidence preservation | OPEN DRAFT / DIRTY | EXTERNALLY_BLOCKED | Canonical support package; frozen pending Microsoft support entitlement. |
| #356 | PROGRAM-004 Annex S evidence preservation | OPEN / UNSTABLE | EVIDENCE_ONLY_READY_AFTER_CHECK_REEVALUATION | Evidence preservation PR; SWA no longer active dependency, but checks need review. |
| #355 | GATE-W2 enterprise web topology and cost decision package | OPEN DRAFT / CLEAN | SUPERSEDED_REVIEW_REQUIRED | SWA preview formerly deleted; determine whether Wave 2/GATE-W2 evidence on main supersedes before merging. |
| #349 | GATE-W1 jmerrill.pub App Service reference certification | OPEN / DIRTY | SUPERSEDED_REVIEW_REQUIRED | Publishing App Service now production authority; likely superseded by GATE-W1/INFRA-012 evidence, but conflicts remain. |
| #342 | JM1-INFRA-006 App Service migration program | OPEN DRAFT / DIRTY | SUPERSEDED_REVIEW_REQUIRED | Foundational migration branch likely superseded by later App Service production evidence. |
| #341 | JM1-INFRA-005 production deployment reliability | OPEN / DIRTY | SUPERSEDED_REVIEW_REQUIRED | Preview was deleted; likely superseded by INFRA-007/012 App Service completion evidence. |
| #340 | Canonize Dataverse Title-Pubs identifier model | OPEN DRAFT / CLEAN | READY_FOR_REVIEW_OR_HOLD | Independent governance/model PR; not SWA-blocked. |
| #314 | governance: record event-driven runtime gap model | OPEN / CLEAN | SUPERSEDED_REVIEW_REQUIRED | Older governance gap package; compare against PROGRAM-005/no-system-wait canon before merge. |
| #266 | operations: reconcile JM1 enterprise execution program | OPEN / CLEAN | SUPERSEDED_REVIEW_REQUIRED | Older enterprise execution package; likely superseded by Wave 1/2 packages. |
| #265 | governance: prepare phase 3 artifact approval package | OPEN / CLEAN | SUPERSEDED_REVIEW_REQUIRED | Older governance package; review against current enterprise wave evidence. |

## PR #368

PR #368 is already merged. It is no longer an open PR to continue or rebase. The current author-facing operational lane is the live package-readiness work recorded in PR #377.
