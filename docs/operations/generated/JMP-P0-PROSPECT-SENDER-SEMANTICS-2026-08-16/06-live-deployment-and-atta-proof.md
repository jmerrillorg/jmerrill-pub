# Live Deployment and Atta Prospect Resend Proof

Last verified: 2026-08-16T08:12:00Z

Evidence source: PR #516 merge readback, Azure Function App deployment readback, protected route probe, governed live action response, Dataverse readback.

## Runtime Merge

- PR: #516 `Repair prospect recommendation send semantics`
- Merge SHA: `71345e7241c152f56a6722b825bfa5ff8c12f613`
- Status: MERGED

## Function Deployment

- Function App: `func-jm1-diagnostic-ai-runner`
- Resource group: `rg-jm1-ai`
- Runtime: `Node|22`
- Package blob: `20260816080635-71345e7241c152f56a6722b825bfa5ff8c12f613.zip`
- Package SHA-256: `9ac1d7de5e11193b9bd52814168754d0ddff6aa72226c8fa5c9a33aa937d60ab`
- App setting `JM1_PRODUCTION_RELEASE_SHA`: `71345e7241c152f56a6722b825bfa5ff8c12f613`
- Indexed functions after restart: 27
- No-key protected route probe: 401 `UNAUTHORIZED`

## Pre-Send Read-Only Guard

Target diagnostic:

- diagnostic ID: `35059461-d589-f111-ab10-00224820105b`
- intake reference: `JMP-INT-202607-422JSZ`
- title: `Untitled`
- author greeting: `Atta`
- template version: `1.1.0`
- quality gate: PASS

Content checks before live resend:

- package-selection language present: YES
- `Awaiting Author Response` present: NO
- Author Workspace / author portal / workspace access code present: NO
- payment / signature language present: NO

## Live Action Executed

Action:

- endpoint: `run-publisher-recommendation-action`
- action: `RESEND_EDITORIAL_RECOMMENDATION_LETTER`
- lifecycle context: `PROSPECT_INQUIRY`
- approved by: `Jackie Smith, Jr.`
- target: Atta prospect diagnostic only

Returned result:

- status/code: `PUBLISHER_RECOMMENDATION_REPLACEMENT_SENT`
- lifecycle context: `PROSPECT_INQUIRY`
- waiting owner: `Prospect`
- decision type: `PROSPECT_PACKAGE_SELECTION`
- response clock decision type: `PROSPECT_PACKAGE_SELECTION`
- workflow status: `Waiting On Prospect Package Selection`
- post-send state status: `PERSISTED`
- duplicate: false

## Dataverse Readback

Readback from `jm1pub_editorialdiagnostics(35059461-d589-f111-ab10-00224820105b)`:

- `jm1_authordraftsendstatus`: `AUTHOR_RESPONSE_SENT`
- `jm1_authordraftapprovalstatus`: `PENDING_HUMAN_APPROVAL`
- `modifiedon`: `2026-08-16T08:09:10Z`
- approval notes contain `PROSPECT_INQUIRY`: YES
- approval notes contain `PROSPECT_PACKAGE_SELECTION`: YES
- approval notes contain `Awaiting Author Response`: NO

Approval notes preview:

```text
Prospect-facing recommendation sent. LifecycleContext=PROSPECT_INQUIRY; WaitingOwner=Prospect; DecisionType=PROSPECT_PACKAGE_SELECTION; Workflow remains Waiting On Prospect Package Selection or Questions. Sent at 2026-08-16T08:09:10.607Z.
```

## Hold State

- Atta prospect sender semantics: PROVEN
- Atta prospect hold: LIFTED FOR PACKAGE-SELECTION RESPONSE MONITORING
- Active-author editorial approval semantics: PRESERVED BY TEST
- Production function deployment: COMPLETE
- Website deployment: 0
- Dataverse schema changes: 0
- Business Central changes: 0
- Client-title automation: FROZEN
