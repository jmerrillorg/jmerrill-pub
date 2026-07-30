# 07 Power Platform

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

Power Platform ARM metadata and Dataverse/Power Platform admin limitations.

## Records

## ANNEXS-PP-001 — Power Platform environment/resource inventory

- Maturity State: Designed=Environment inventory, DLP, roles, auditing required; Entitled=Power Platform ARM resource visible; Activated=At least one Power Platform account present; Proven=Azure ARM metadata captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Azure resource list
- Environment: JM1-PRIME
- Capability Owner: Jackie / Power Platform Admin
- Confidence: Low
- Known Limitation: Power Platform admin DLP/security-role/audit endpoints not fully readable from installed tooling; pac/m365 CLI absent.
- Required Next Action: Validate PP environments, DLP connector groupings, Dataverse auditing via admin center/API.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
