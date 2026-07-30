# 03 Entitlements

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

M365 SKUs/service plans, Entra/Intune/Purview availability, Defender for Cloud plan states, GitHub availability limitations.

## Records

## ANNEXS-ENT-001 — M365 SKU and service plan inventory

- Maturity State: Designed=Defined by tenant licensing; Entitled=Entitled; Activated=Partially activated by assigned licenses; Proven=API readback captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph subscribedSkus
- Environment: JM1-PRIME
- Capability Owner: Jackie / M365 Admin
- Confidence: High
- Known Limitation: Per-user service plan details summarized to reduce identity data in v1 package.
- Required Next Action: Chad synthesize license sufficiency against nine lanes.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-ENT-002 — Intune availability

- Maturity State: Designed=Endpoint management lane requires Intune posture; Entitled=Entitled; Activated=PendingActivation observed in subscribed service plan; Proven=Graph SKU evidence
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph subscribedSkus
- Environment: JM1-PRIME
- Capability Owner: Jackie / M365 Admin
- Confidence: Medium
- Known Limitation: Service plan observed, but tenant activation/enrollment policy still requires portal/API proof.
- Required Next Action: Validate Intune tenant activation and endpoint enrollment policy.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-ENT-003 — Purview availability

- Maturity State: Designed=Compliance lane requires Purview posture; Entitled=Entitled; Activated=Service plan available; Proven=Graph SKU evidence
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph subscribedSkus
- Environment: JM1-PRIME
- Capability Owner: Jackie / Compliance Admin
- Confidence: Medium
- Known Limitation: Policy configuration requires compliance endpoint readback.
- Required Next Action: Validate labels, retention, DLP coverage in Purview.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
