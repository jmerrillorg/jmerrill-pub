# INFRA-004 Enterprise Credential Harmonization

**Classification:** Enterprise infrastructure architecture and execution planning  
**Status:** Draft for execution planning  
**Authority:** Jackie  
**Date:** 2026-07-09

## Purpose

INFRA-004 transitions JM1 enterprise execution from governed interactive sessions to governed unattended application authentication.

This is a documentation and harmonization movement only.

No production application code, business process, Dataverse schema, or Power Platform solution changes are authorized in this phase.

## Executive Read

INFRA-003 proved the platform can operate from the external-drive cockpit.

INFRA-004 addresses the remaining maturity gap:

- today, the cockpit works because a governed operator is already authenticated
- target state is a clean-machine startup using governed credentials only

The enterprise should move from:

- cached login
- browser token
- personal refresh token

to:

- Key Vault managed secrets
- service principals or managed identities
- documented ownership
- documented rotation
- deterministic clean-machine startup

## Architecture Impact

INFRA-004 does not change the enterprise truth layers.

It changes the execution authentication layer.

### Current

`JM1-PRIME -> governed user session -> Azure / PAC / Graph / GitHub -> Dataverse / SharePoint / Functions`

### Desired

`JM1-PRIME -> Key Vault -> governed app credential / managed identity -> Azure -> Dataverse -> SharePoint -> Graph -> Functions`

### Enterprise Impact

This change will:

- reduce dependence on one operator’s cached session
- make recovery from a clean machine possible
- support unattended execution for enterprise AI agents
- improve credential ownership, auditability, and rotation discipline

## Workstream A — Current Authentication Inventory

| System | Current auth type | Credential owner | Tenant | Target environment | Expiration dependency | Interactive or app | Production readiness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Azure CLI | governed cached user session | `jm1-admin@jmerrill.one` | `352d075e-8e17-4169-9f8e-22e6946ce66d` | Azure subscription `JM1 – Nonprofit Core (2025 Grant)` | refresh-token / session dependent | Interactive | usable now, not unattended-ready |
| PAC | governed cached user auth profile | `jm1-admin@jmerrill.one` | same tenant | JM1-Core | profile/session dependent | Interactive | usable now, not unattended-ready |
| GitHub CLI | cached GitHub token in CLI/keyring | `jmerrillorg` | GitHub | governed repos | token lifecycle managed outside cockpit docs | Interactive/app token hybrid | usable now, needs ownership/rotation formalization |
| Graph | token path via approved Azure auth | governed operator session today | same tenant | Microsoft Graph / SharePoint Online | session dependent | Interactive | usable now, not unattended-ready |
| SharePoint | Graph token path | governed operator session today | same tenant | Publishing Team site | session dependent | Interactive | usable now, not unattended-ready |
| Dataverse JM1-Core | PAC user profile and governed token path | `jm1-admin@jmerrill.one` | same tenant | JM1-Core | session dependent | Interactive | usable now, not unattended-ready |
| Function Apps | Azure CLI user session | `jm1-admin@jmerrill.one` | same tenant | Azure Functions | session dependent | Interactive | validation-ready, not unattended-ready |
| Key Vault `jm1-core-vault` | Azure CLI user session | `jm1-admin@jmerrill.one` | same tenant | vault secret retrieval | session dependent | Interactive | partially usable |

## Workstream B — Interactive Dependency Remediation List

The following paths still depend on cached login, browser state, or refresh-token state:

| Dependency | Current behavior | Remediation need |
| --- | --- | --- |
| Azure CLI cached sign-in | required for Core token and Graph token | replace with governed app/identity path |
| PAC cached auth profile | required for `JM1-Core` CLI access | replace or supplement with governed non-user auth path where supported |
| GitHub CLI cached auth | required for repo push from cockpit | formalize governed automation identity or documented token ownership |
| Graph token path | current SharePoint and Graph calls use a governed interactive path | replace with governed unattended auth |
| SharePoint access | publishing repository writes depend on governed interactive auth | replace with governed unattended auth |
| Browser profiles | useful for UI-only tasks | keep for UI-only, not primary execution path |

## Workstream C — Required Enterprise Service Principals

Expected governed identities:

1. Dataverse Core service principal
2. Microsoft Graph service principal
3. SharePoint Online execution identity
4. Azure Functions execution identity
5. GitHub Actions / automation identity

Each requires:

- documented permissions
- documented auth flow
- documented secret or certificate posture
- documented rotation strategy

## Workstream D — Key Vault Audit

Critical highlight:

Current Dataverse secret targeting historically referenced JM1-Dev.

Desired state:

- `DATAVERSE_RESOURCE_URL -> https://jm1hq.crm.dynamics.com`
- `DATAVERSE_WEB_API_BASE_URL -> https://jm1hq.crm.dynamics.com/api/data/v9.2`

## Workstream E — Unattended Execution Sequence

```text
JM1-PRIME
  ↓
Key Vault
  ↓
Managed Identity / Service Principal
  ↓
Azure
  ↓
Dataverse
  ↓
SharePoint
  ↓
Graph
  ↓
Functions
```

Rules:

- no interactive login required
- no cached browser session required
- no personal refresh token required
- no secret committed to repo
- no secret written into baseline docs

## Risk Assessment

### Current Risks

1. Core/Dev secret targeting drift
2. operator session dependence
3. unattended SharePoint ambiguity
4. credential ownership ambiguity
5. log hygiene

### Remaining Blockers

- Core-targeted Dataverse app secret set not yet fully harmonized
- unattended Graph / SharePoint credential path not yet standardized
- GitHub unattended identity not yet formalized

## Recommendations

1. Treat INFRA-003 as the locked interactive baseline.
2. Correct Dataverse secret targeting before unattended Core automation is declared ready.
3. Standardize one governed unattended identity pattern for Graph and SharePoint execution.
4. Prefer managed identity where Azure-hosted execution can use it.

## Implementation Plan

### Phase 1 — Credential Truth Alignment

- validate current secret inventory and ownership
- correct Dataverse secret targeting from JM1-Dev to JM1-Core
- identify every remaining interactive dependency

### Phase 2 — Governed Unattended Paths

- establish Core Dataverse unattended auth
- establish Graph unattended auth
- establish SharePoint unattended auth
- establish Azure Function unattended execution path
- formalize GitHub automation identity

### Phase 3 — Clean-Machine Validation

- start from a clean execution context
- hydrate only approved baseline files and tools
- retrieve secrets only through governed paths
- validate end-to-end enterprise execution with no cached user session

## Success Criteria

INFRA-004 is complete when:

- enterprise execution can start from a clean machine
- no cached user authentication is required
- all enterprise services authenticate through governed credentials
- secrets are managed through Azure Key Vault
- credential ownership and rotation are fully documented
- `JM1-PRIME` remains the single governed execution cockpit for enterprise AI agents
