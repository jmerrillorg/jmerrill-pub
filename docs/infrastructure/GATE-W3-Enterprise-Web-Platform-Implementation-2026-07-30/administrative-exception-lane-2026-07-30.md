# GATE-W3 Administrative Exception Lane

Date: 2026-07-30
Authority: Jackie governance ruling
Execution owner: Cody
Target: app-jm1-productions-prod
Resource group: rg-jm1-web-prod-appsvc
App Service plan: asp-jm1-web-prod-linux

## Classification

GATE-W3 is now classified as:

BLOCKED - SUPPORT ENTITLEMENT

This is an administrative/support-entitlement blocker, not an engineering blocker.

## Frozen Target

The following target is frozen until Microsoft support becomes available or Jackie authorizes a different remediation path:

app-jm1-productions-prod

Frozen actions:

- deployment attempts;
- runtime changes;
- slot swaps;
- App Service configuration changes;
- startup modifications;
- package changes;
- deployment retries.

Only evidence preservation may continue if Microsoft or Azure diagnostics produce new read-only findings.

## Engineering Disposition

Engineering: COMPLETE
Evidence: COMPLETE
Microsoft escalation package: READY
Support package authority: PR #358

The engineering record proves:

- the failure is isolated to app-jm1-productions-prod;
- app-jm1-fin-prod is healthy and excluded from the support target;
- app-jm1-foundation-prod is a healthy production peer;
- app-jm1-productions-prod/staging is healthy;
- the governed minimal runtime artifact is valid on healthy peers;
- SCM Basic and FTP Basic remain disabled;
- the remaining diagnostic need is Microsoft App Service backend inspection.

## Administrative Dependency

Reason: Microsoft support entitlement
Owner: Jackie
Blocked by: support entitlement
Retry condition: support available

When support entitlement changes, resume only the app-jm1-productions-prod Microsoft escalation path. Do not reopen unrelated GATE-W3 work.

## Enterprise Queue Disposition

This exception lane no longer blocks unrelated JM1 operational workstreams.

Resumed queue:

- The Intentional Leader CAP-002 Line Editing transition through the repaired publishing pipeline;
- Publisher Operating Center operational certification, queue validation, and release readiness;
- Author Operating Center fresh login certification, project reconciliation, and stage validation;
- Notification Engine certification;
- Enterprise Release Readiness Review covering PR sequencing, merge plan, preview cleanup plan, and evidence inventory.

Held queue:

- GATE-W4;
- new website migrations;
- Holdings implementation;
- Business Central production migration;
- new modernization work.

## Non-Actions Confirmed

- app-jm1-productions-prod deployment attempts after this ruling: 0
- production app recreation: 0
- App Service Plan resize: 0
- DNS changes: 0
- customer traffic migration: 0
- Static Web Apps retirement: 0
- SCM Basic enablement: 0
- FTP Basic enablement: 0
- real Productions website deployment: 0
- secret exposure: 0
- evidence deletion: 0
