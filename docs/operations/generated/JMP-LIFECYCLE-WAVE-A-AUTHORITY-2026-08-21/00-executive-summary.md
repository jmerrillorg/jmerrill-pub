# 00 - Executive Summary

Classification: JMP_LIFECYCLE_WAVE_A_READY_FOR_REVIEW

Wave A establishes `JMP_PUBLISHING_LIFECYCLE_v1.0` as a versioned, canonical lifecycle authority with a read/normalize/validate/explain compatibility layer. It does not migrate live title records or repair downstream runtimes.

## Assertion

JMP now has one canonical, versioned Publishing lifecycle authority and validation layer.

## Primary Paths

| Artifact | Path |
|---|---|
| Human canon | `docs/architecture/publishing/JMP_PUBLISHING_LIFECYCLE_v1.0.md` |
| Machine registry | `lib/publishing/lifecycle/registry.ts` |
| Validator | `lib/publishing/lifecycle/validation.ts` |
| Legacy mapping | `lib/publishing/lifecycle/legacy-mapping.ts` |
| Focused guard | `scripts/jmp_lifecycle_authority_guard.test.mjs` |

## Production Mutation Boundary

live title writes = 0  
Dataverse schema changes = 0  
Power Automate changes = 0  
author communications = 0  
commercial mutations = 0  
editorial executions = 0

## Phase 1 Reference

Phase 1 remains preserved in draft PR #554 and is not folded into this Wave A implementation branch.
