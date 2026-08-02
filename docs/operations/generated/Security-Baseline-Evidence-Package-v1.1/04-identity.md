# 04 Identity

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

Conditional Access, privileged role memberships, guest/external posture, PIM/MFA limitations.

## Records

## ANNEXS-ID-001 — Conditional Access policies

- Maturity State: Designed=Conditional Access control plane present; Entitled=Entitled; Activated=Activated; Proven=Graph readback captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph conditionalAccess policies
- Environment: JM1-PRIME
- Capability Owner: Jackie / Entra Admin
- Confidence: High
- Known Limitation: Coverage details require synthesis from full policy bodies.
- Required Next Action: Review coverage against privileged, guest, legacy-auth, and break-glass patterns.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-ID-002 — Standing privileged role membership

- Maturity State: Designed=Privileged roles should be least-privilege and reviewed; Entitled=Directory roles readable; Activated=Role memberships present/readable; Proven=Directory role member readback captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph directoryRoles
- Environment: JM1-PRIME
- Capability Owner: Jackie / Entra Admin
- Confidence: Medium
- Known Limitation: PIM eligibility and MFA method strength may require additional permissions.
- Required Next Action: Synthesize standing privilege count and request PIM/method proof where absent.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-ID-003 — Guest and external access posture

- Maturity State: Designed=External access posture must be known; Entitled=Users readable; Activated=Guest count captured; Proven=Graph users summary captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph users
- Environment: JM1-PRIME
- Capability Owner: Jackie / Entra Admin
- Confidence: Medium
- Known Limitation: SharePoint/Teams sharing policies are not in user summary.
- Required Next Action: Compare guest count and sharing policies against external collaboration canon.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
