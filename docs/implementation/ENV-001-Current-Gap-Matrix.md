# ENV-001 - Current Gap Matrix

**Classification:** Environment readiness and operational activation gap report  
**Status:** Revised draft for Jackie review  
**Date:** 2026-07-08

## Summary

JM1 has a functioning controlled-build lane in JM1-Dev, but several capabilities that are treated as "done" at the implementation level have not yet reached Core activation and live operational validation.

The gap is no longer best described as "missing Test promotion." The real issue is missing operational activation discipline between Dev success and Core business use.

## Environment Purpose Matrix

| Environment | Canonical Role | Actual Condition | Gap |
|---|---|---|---|
| JM1-Dev | Design, build, prototype, pilot, controlled validation | Active build environment for PAM and PROGRAM-003 | Strong build lane, but not the finish line |
| JM1-Test | Optional temporary validation environment | Available for isolated rehearsal when needed | Must not be treated as mandatory default path |
| JM1-Core | Live enterprise and operational truth | Public website and live operations point here | Missing promoted schema, readiness fields, and governed live data for some waves |

## Wave Completion Gap

### Old behavior

Some waves were implicitly treated as complete when:

- Dev implementation finished
- pilot logic worked
- docs existed

### Required behavior

A wave is complete only when:

- development is complete
- Operational Readiness Review passed
- Core activated
- runtime configuration complete
- Dataverse validated
- SharePoint validated where applicable
- website/workspace/application validated where applicable
- Enterprise Command Center updated
- live operational validation passed
- Jackie operational acceptance received

Until then:

**Status = In Progress**

## Immediate Capability Gaps in JM1-Core

| Capability | JM1-Dev / Governance State | JM1-Core State | Gap Severity |
|---|---|---|---|
| Public catalog readiness field | Recommended, not yet activated in Core | Missing | High |
| Canonical public-ready catalog records | Exists in repo/governance context | Not present as trustworthy live title set | High |
| `jm1pub_publishingasset` | PAM operational in JM1-Dev | Missing in JM1-Core | High |
| `jm1pub_assetmarketplace` | PAM operational in JM1-Dev | Missing in JM1-Core | High |
| PROGRAM-003 editorial entities | Dev/pilot path defined | Missing in JM1-Core | High |
| Enterprise operational validation discipline | Now defined in standing rule | Not yet reflected in prior completion labels | High |

## Live Catalog Gap

### What the live website currently reads

- Environment: `JM1-Core`
- URL: `https://jm1hq.crm.dynamics.com`
- Public query basis today: active `jm1pub_title` rows

### What JM1-Core currently contains for that public query

- Active `jm1pub_title` rows visible to website logic: `15`
- Clearly real public candidate rows found: `1`
- Clearly test/stale/incomplete rows found: `14`

### Key Core title gaps

| Issue | Count |
|---|---|
| Missing title | 2 |
| Missing primary author | 14 |
| Missing slug | 15 |
| Missing explicit public status | 15 |

## Website Incident Lesson

The website catalog incident is the clearest example of why ENV-001 needed revision.

The issue was not primarily:

- code quality
- branch hygiene
- Dataverse connectivity

The issue was:

- public runtime activated against JM1-Core
- while JM1-Core lacked the governed schema and data needed for trusted public output

That is an operational activation failure, not just a development failure.

## Canonical Data Presence Gap

| Domain | Repo / Dev / Governance State | JM1-Core State | Gap |
|---|---|---|---|
| Publisher Master Imprint Register | Certified in governance context | Not reflected as trustworthy live public title set | High |
| PAM asset model | Operational in JM1-Dev | Missing in JM1-Core | High |
| PROGRAM-003 editorial model | Specified / pilot-directed | Missing in JM1-Core | High |
| Website runtime | Dataverse-backed and correctly pointed | Correctly pointed to Core | No environment mismatch; Core readiness gap remains |

## Immediate Catalog Stabilization Plan

1. Add `jm1pub_publiccatalogstatus` to `jm1pub_title`.
2. Treat current active rows as non-public until reviewed.
3. Promote canonical public-ready catalog rows into JM1-Core.
4. Update the website query to require explicit public status.
5. Reconcile current test rows in a later cleanup wave without deleting them now.

## PAM / PROGRAM-003 Activation Sequence

### Wave 1 - Public Catalog Stabilization

- activate public catalog status field
- promote canonical public-ready title rows
- update live website query
- validate public routes
- update Enterprise Command Center

### Wave 2 - PAM Core Activation

- activate `jm1pub_publishingasset`
- activate `jm1pub_assetmarketplace`
- migrate canonical asset records
- validate repository linkage and health rollups

### Wave 3 - PROGRAM-003 Core Activation

- activate editorial schema
- validate approval gates
- validate repository references
- validate workspace and dashboard rollups

## Operational Activation Checklists

### Operational Readiness Checklist

- Core target confirmed
- scope confirmed
- dependencies confirmed
- required schema identified
- required data identified
- required runtime config identified
- validation plan prepared
- rollback/remediation plan prepared

### Core Activation Checklist

- schema activated where required
- data promoted where required
- settings configured
- permissions verified
- repository references verified
- deployment/restart complete

### Operational Validation Checklist

- Dataverse validated
- SharePoint validated where applicable
- website/workspace/application validated where applicable
- execution logging validated where applicable
- Enterprise Command Center updated
- live smoke validation passed

### Wave Completion Checklist

- development complete
- Operational Readiness Review passed
- Core activated
- runtime configuration complete
- Dataverse validated
- SharePoint validated where applicable
- website/workspace/application validated where applicable
- Enterprise Command Center updated
- live operational validation passed
- Jackie operational acceptance received

## Risks

| Risk | Description |
|---|---|
| Public trust risk | Live site can render stale or test rows if Core readiness stays implicit |
| Environment drift | Dev and docs can become richer than the live enterprise |
| Runtime/schema mismatch | Live systems can query fields or entities that only exist in Dev |
| False completion reporting | Waves can be labeled complete when the business cannot use them |
| Security/role sprawl | Emergency runtime fixes can widen access without activation discipline |

## Jackie-Only Decisions

1. Approve `jm1pub_publiccatalogstatus` as the formal live website gate.
2. Confirm whether current Core test rows remain preserved but non-public during stabilization.
3. Confirm whether PAM Core activation must precede broader catalog expansion.
4. Confirm whether any upcoming high-risk wave should use optional JM1-Test before Core activation.
