# JMP Author Platform Tier 1 Security Proof Scope

Last verified: 2026-09-02T21:45:33Z

## Authority

- PR #715 merged Authority Contract v1.1 to canonical main.
- Contract path: `docs/governance/publishing/JMP-Author-Experience-Authority-Contract-v1.1.md`
- Status on main: `CANONICAL GOVERNANCE STANDARD / RATIFIED`
- V1 implementation authority: `NO`
- Tier 2 runtime activation authority: `NO`

## Runtime Under Test

- Production URL: `https://jmerrill.pub`
- Production health probe: `GET /api/health` returned `200`.
- Reported release: `6f79da18de0ae9b918908bb266651f0a95880ae6`
- Author portal dependency: `ready`
- Dataverse dependency: `ready`
- Graph dependency: `ready`

## Proof Boundary

This pass tested current deployed fail-closed behavior and source-backed runtime guards. It did not implement Author Portal V1, create schema, deploy code, mutate Dataverse, send author communications, or exercise a real author account.

## Narrow Runtime Gap

Authenticated cross-author negative testing was not performed with two real author browser sessions. Cross-author denial is supported by source/runtime guard inspection and local regression tests, but needs a future controlled live authenticated proof before broad V1 activation.
