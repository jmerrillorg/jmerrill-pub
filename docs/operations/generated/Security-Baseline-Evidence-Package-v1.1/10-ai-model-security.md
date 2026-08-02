# 10 AI Model Security

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

Repository AI/model dependencies, Azure Foundry resource metadata, and AI logging/ingestion limitations.

## Records

## ANNEXS-AI-001 — External model dependency inventory

- Maturity State: Designed=Model dependencies and provenance must be known; Entitled=Repository manifests readable; Activated=No package dependencies matched; Proven=package.json metadata captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Local package.json dependency scan
- Environment: JM1-PRIME
- Capability Owner: Jackie / AI Runtime Owner
- Confidence: Medium
- Known Limitation: Repository dependencies only; Foundry runtime settings require Azure synthesis.
- Required Next Action: Pin/freeze model versions where dependencies are floating or provider aliases are used.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
