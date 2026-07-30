# GATE-W3 Microsoft Support Final Package

Date: 2026-07-30
Target: app-jm1-productions-prod
Resource group: rg-jm1-web-prod-appsvc
App Service plan: asp-jm1-web-prod-linux
Support package authority: PR #358
Classification: BLOCKED - SUPPORT ENTITLEMENT

## Purpose

This package freezes the engineering evidence for the Productions production App Service target and prepares the Microsoft diagnostic lane. The remaining blocker is administrative support entitlement and Microsoft backend diagnostics, not additional Cody engineering.

## Chronology

1. GATE-W3 provisioned and certified the App Service pattern for the approved enterprise web platform.
2. Node 22 runtime standardization was tested and adopted for the governed minimal runtime.
3. The governed minimal runtime artifact deployed and served successfully on healthy peers.
4. app-jm1-productions-prod/staging was repaired and certified healthy.
5. app-jm1-productions-prod production accepted deployment operations but did not serve the runtime successfully.
6. OneDeploy initially reported success while the production worker logged that server.js was absent because the package mount was skipped.
7. Extracted ZIP mode was attempted with WEBSITE_RUN_FROM_PACKAGE=0.
8. Deployment e5153a3d-759e-4332-a860-ec23e7067d17 completed.
9. The production endpoint still timed out or returned unhealthy behavior while Azure control plane reported the app running.
10. Microsoft support escalation was prepared for app-jm1-productions-prod.
11. Azure Support API rejected ticket creation with InvalidSupportPlan.
12. Azure Portal Help + support could navigate to the app resource context, but the support path did not provide a usable technical case submission path for app-jm1-productions-prod under the current entitlement.

## Deployment Evidence

Governed minimal runtime artifact SHA-256:

913fd27cdac46baadffe636527dc5582ed23125f91468d056127887fd5293652

Relevant deployment IDs:

- Initial OneDeploy successful row with runtime package mount failure: ad9a559e-39c4-4623-8790-88aac7fce8b5
- Extracted ZIP repair deployment: e5153a3d-759e-4332-a860-ec23e7067d17

Runtime:

- NODE|22-lts
- Startup command: node server.js
- SCM Basic: disabled
- FTP Basic: disabled
- Customer traffic/custom DNS migration: not authorized and not performed for Productions

## Healthy Peer Comparison

Healthy peer targets:

- app-jm1-foundation-prod
- app-jm1-fin-prod
- app-jm1-productions-prod/staging

The same governed minimal runtime pattern and artifact family served successfully on healthy peers. This supports a target-specific App Service runtime/content-state classification for app-jm1-productions-prod.

## Failure Summary

Initial failure:

- Deployment success reported.
- Runtime returned 503.
- Startup log showed server.js absent from /home/site/wwwroot.
- Startup log showed optional package mount skipped.

Post extracted-ZIP repair failure:

- Deployment e5153a3d-759e-4332-a860-ec23e7067d17 completed.
- App restarted once.
- /api/health still did not return the governed 200 response.
- Azure control plane still reported Running / Normal.

## Resource Enumeration Inconsistency

The support escalation encountered a resource-enumeration / submission inconsistency:

- Azure Portal can open app-jm1-productions-prod as an App Service resource.
- The support workflow did not provide a usable technical case submission path for app-jm1-productions-prod under the current entitlement.
- Azure Support API returned InvalidSupportPlan for ticket creation under the current subscription support-plan type.

Screenshot evidence is expected to show: Azure Portal can open app-jm1-productions-prod, while the Support resource selector cannot enumerate or proceed with that same resource. No screenshot file was present in the local Codex attachments or evidence package during this update, so the final package records this as an external screenshot attachment to be added when available.

## Microsoft Diagnostic Request

Ask Microsoft to inspect:

- content-share and /home/site/wwwroot state;
- worker and runtime startup;
- process launch and port binding;
- stale deployment metadata;
- app-specific worker assignment;
- backend health after successful deployment;
- whether supported in-place repair, worker/stamp movement, supported metadata cleanup, or app recreation is required.

## Attachment Boundary

Attach:

- this final support package;
- deployment and configuration readbacks;
- package-mount evidence;
- extracted ZIP repair evidence;
- health probes;
- Foundation peer comparison;
- checksums;
- screenshots showing the Portal/support-selector inconsistency when available.

Do not attach:

- credentials;
- publishing profiles;
- access tokens;
- full environment exports;
- Key Vault values;
- raw secrets.

## Freeze Decision

app-jm1-productions-prod is frozen until Microsoft support becomes available or Jackie authorizes a different remediation path.

Unauthorized until then:

- deployment attempts;
- runtime changes;
- slot swaps;
- App Service configuration changes;
- startup modifications;
- package changes;
- deployment retries;
- production app recreation;
- plan resize;
- DNS changes;
- traffic migration.

## Current Disposition

Engineering: COMPLETE
Evidence: COMPLETE
Microsoft escalation: READY
Blocked: Administrative / support entitlement / portal enumeration / Microsoft diagnostics
Retry condition: support available
