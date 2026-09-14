# JMP-AUTH-004 Managed Identity Production Cutover Evidence

Date: 2026-09-14
Repository: jmerrill-pub
Stream: JMP Publisher Operating Center
Work package: JMP-AUTH-004

## Final classification

JMP_AUTH_004_STATUS = JMP_AUTH_004_PRODUCTION_MI_CUTOVER_PASS_RETIREMENT_REVIEW_READY

PR #734 was verified, repaired for workflow-engine declaration compliance, merged, and deployed. Production was first proven in legacy/default mode, then Dataverse and Graph/SharePoint managed identity canaries passed from the App Service host. The runtime was cut over by setting `PUBLISHER_RUNTIME_AUTH_MODE=MANAGED_IDENTITY`; production health recovered after the expected App Service restart and remained ready through bounded route observation.

The final deployed source authority observed during the cutover window is:

CANONICAL_PUBLISHING_SHA = 28b2e6fd988c92d5b0045593d43a78b6aa97daac

This SHA includes the PR #734 managed identity runtime implementation and the later successful production deployment titled "Upgrade technology currency to Next 16."

## Result summary

- PR734_DISPOSITION = MERGED
- PR734_MERGE_SHA = 235339ccad0f213e248786ebee2f950bf7ef7a34
- CURRENT_PRODUCTION_SHA = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- LEGACY_MODE_DEPLOYMENT = PASS
- DATAVERSE_MI_CANARY = PASS
- GRAPH_SHAREPOINT_MI_CANARY = PASS
- NEGATIVE_PROOFS = PASS
- ROLLBACK_PROOF = PASS
- DATAVERSE_PRODUCTION_AUTH = MANAGED_IDENTITY
- GRAPH_SHAREPOINT_PRODUCTION_AUTH = MANAGED_IDENTITY
- BUSINESS_NONREGRESSION = PASS_BOUNDED
- AUTHOR_IMPACT = 0
- CLIENT_IMPACT = 0
- EXTERNAL_COMMUNICATIONS = 0
- CREDENTIALS_RETIRED = 0

## Scope boundaries

No credential retirement occurred in this work package.

Old password credentials remain present for rollback and interactive-account continuity. Their retirement belongs to a separate Microsoft Tenant Rationalization review using the handoff in `09-mtr-retirement-handoff.md`.
