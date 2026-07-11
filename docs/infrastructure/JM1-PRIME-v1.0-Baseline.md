# JM1-PRIME v1.0 Baseline

**Classification:** Canonical infrastructure baseline  
**Status:** Active baseline  
**Authority:** Jackie  
**Version:** `v1.0`  
**Date:** 2026-07-09

## Purpose

`JM1-PRIME` is the governed enterprise execution cockpit for JM1.

It is not a source of business truth.

It is the execution layer that operates against the real systems of record:

- SharePoint for governed files and documents
- Dataverse JM1-Core for governed operational data

This document is the recovery point for future infrastructure work.

## Canonical Location

| Item | Path |
| --- | --- |
| External drive mount | `/Volumes/UsersExternal` |
| JM1-PRIME home | `/Volumes/UsersExternal/JM1-PRIME` |

Hard rule:

If the external drive is not mounted, execution stops.

No fallback to the main drive is allowed for enterprise execution.

## Canonical Commands

| Control | Command |
| --- | --- |
| Bootstrap | `source /Volumes/UsersExternal/JM1-PRIME/jm1-prime-bootstrap.sh` |
| Preflight | `/Volumes/UsersExternal/JM1-PRIME/jm1-prime-preflight.sh` |
| Precheck | `/Volumes/UsersExternal/JM1-PRIME/jm1-prime-precheck.sh` |
| Repo bootstrap wrapper | `source scripts/infra003_bootstrap.sh` |
| Repo preflight wrapper | `scripts/infra003_preflight.sh` |

The repo wrappers are source-control-safe invocation helpers only.

The live execution source remains the external JM1-PRIME scripts.

## Directory Structure

Current `JM1-PRIME` structure:

```text
/Volumes/UsersExternal/JM1-PRIME/
├── .azure/
├── .env.enterprise
├── .github/
├── browser-profile/
├── infra-003-demonstration.sh
├── jm1-prime-bootstrap.sh
├── jm1-prime-load-credentials.sh
├── jm1-prime-precheck.sh
├── jm1-prime-preflight.sh
├── jm1-prime-session.sh
├── repos/
├── session-logs/
└── tooling/
```

## Required Tooling

The following tools are part of the baseline:

| Tool | Purpose |
| --- | --- |
| `git` | governed repo operations |
| `gh` | GitHub auth, push, PR lane |
| `az` | Azure tenant, Key Vault, Function validation |
| `pac` | Dataverse / Power Platform environment operations |
| `node` | runtime for local execution helpers |
| `npm` | node package management |
| `pnpm` | preferred node package manager |
| `pwsh` | PowerShell compatibility |
| `jq` | JSON inspection |
| `curl` | HTTP validation |

## Installed Versions

Observed from the canonical preflight on 2026-07-11:

| Tool | Version |
| --- | --- |
| git | `2.54.0` |
| gh | `2.94.0` |
| az | `2.87.0` |
| pac | `Microsoft PowerPlatform CLI` |
| node | `v26.0.0` |
| npm | `11.12.1` |
| pnpm | `10.20.0` |
| pwsh | `7.5.4` |
| jq | `jq-1.8.1` |
| curl | `8.7.1` |

## Environment Variables

Canonical non-secret baseline variables live in:

`/Volumes/UsersExternal/JM1-PRIME/.env.enterprise`

The repo may document:

- expected variable names
- expected tenant/subscription IDs
- expected resource URLs
- Key Vault secret names only

The repo may not contain:

- raw secret values
- tokens
- private keys
- cached credential material

## Authentication Architecture

### v1.0 State

JM1-PRIME v1.0 is a **governed interactive** execution cockpit.

It uses:

- governed Azure CLI session
- governed PAC user auth profile
- governed GitHub CLI session
- governed Graph access through approved token paths

It does not yet provide fully unattended enterprise authentication.

### Current Paths

| System | Current auth path | Notes |
| --- | --- | --- |
| Azure | governed CLI session | active and validated |
| Dataverse JM1-Core | governed token path | working |
| Graph | governed token path | working |
| SharePoint | governed token path | working |
| GitHub | governed CLI session/token | working |
| Key Vault | governed Azure session | `jm1-core-vault` reachable |

### Known Gap

Unattended harmonization remains INFRA-004 work.

## PATH and Wrapper Strategy

JM1-PRIME now succeeds through a governed PATH normalization model.

That means:

- the external bootstrap prepends JM1-PRIME tooling paths safely
- system PATH entries are preserved
- repeated bootstrap calls do not duplicate PATH segments
- valid host-installed tools may still resolve if they remain compatible with the governed baseline

The requirement is stable governed execution, not artificial dependence on one absolute binary path when the bootstrap has already normalized the shell correctly.

## Browser Profile Strategy

Persistent browser profiles are allowed only for UI-only tasks.

Primary enterprise execution should favor:

- Azure CLI
- PAC
- Graph
- GitHub CLI
- Key Vault-backed retrieval

## Session Logging

Session evidence is written to:

`/Volumes/UsersExternal/JM1-PRIME/session-logs`

Guidance:

- logs should capture operational evidence
- logs should not become a hidden secret store
- future revisions should continue reducing unnecessary payload noise

## Startup Sequence

1. Confirm the external drive is mounted.
2. Source the canonical bootstrap:
   - `source /Volumes/UsersExternal/JM1-PRIME/jm1-prime-bootstrap.sh`
3. Run the canonical preflight:
   - `/Volumes/UsersExternal/JM1-PRIME/jm1-prime-preflight.sh`
4. Confirm the governed Azure target:
   - tenant = `352d075e-8e17-4169-9f8e-22e6946ce66d`
   - subscription = `JM1 – Nonprofit Core (2025 Grant)`
   - subscription ID = `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`
5. Confirm GitHub, PAC, Dataverse, Graph, SharePoint, and production runtime reachability.

## Automatic Repair Behavior

If a tool is not resolved:

Detect  
→ repair PATH through canonical bootstrap  
→ re-run preflight  
→ continue the business movement

Do not stop at the first “missing PATH” report until bootstrap and preflight have been attempted.

## Safe Failure Behavior

Execution must fail clearly when:

- the external drive is not mounted
- the JM1-PRIME home is not available
- required governed targets do not match
- GitHub or PAC auth is unavailable
- Dataverse / Graph / SharePoint / production runtime reachability fails

## Recovery Procedure

If the environment must be rebuilt:

1. Mount `/Volumes/UsersExternal`
2. Recreate `/Volumes/UsersExternal/JM1-PRIME`
3. Restore:
   - `.env.enterprise`
   - precheck script
   - bootstrap script
   - session script
   - load-credentials script
   - preflight script
   - tooling wrappers
4. Revalidate governed auth paths
5. Re-run the INFRA-003 demonstration
6. Compare results to the completion report

## How Cody Must Begin Every Execution Cycle

Every JM1 execution cycle begins with:

```bash
source /Volumes/UsersExternal/JM1-PRIME/jm1-prime-bootstrap.sh
/Volumes/UsersExternal/JM1-PRIME/jm1-prime-preflight.sh
```

If the external drive or canonical scripts are unavailable, Cody must gather evidence of that failure before declaring the environment unavailable.

## Prohibited Stop Behavior

These are repair tasks, not business blockers by themselves:

- one missing PATH entry
- one missing command before bootstrap
- one wrong shell session before preflight

Evidence required before declaring JM1-PRIME unavailable:

- external mount check failed, or
- JM1-PRIME home missing, or
- canonical bootstrap/preflight missing or unreadable, or
- governed target mismatch persists after repair attempt

## v1.0 Baseline Interpretation

JM1-PRIME v1.0 is the enterprise standard for **governed interactive execution**.

It is stable enough to serve as:

- the recovery point for future infrastructure work
- the standard cockpit for governed operator-led enterprise execution

It is not yet the unattended platform baseline.

That transition belongs to INFRA-004.
