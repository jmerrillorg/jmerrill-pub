# 08 Azure

Generated: 2026-07-29T16:55:41.152Z
Package version: v1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

Subscriptions, resource inventory, Key Vault presence, Defender for Cloud pricing, identities, monitoring resources, and metadata-only secret posture.

## Records

## ANNEXS-AZ-001 — Azure subscription/resource inventory

- Maturity State: Designed=Both Azure pillars must be visible; Entitled=Both non-tenant subscriptions visible; Activated=Resources read from visible subscriptions; Proven=az account/resource readback captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Azure CLI account/resource list
- Environment: JM1-PRIME
- Capability Owner: Jackie / Azure Admin
- Confidence: High
- Known Limitation: Resource list is metadata-only and does not inspect every nested child setting.
- Required Next Action: Synthesize tagging, secret references, and workload network controls.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-AZ-002 — Defender for Cloud plan states

- Maturity State: Designed=Defender for Cloud plan states required; Entitled=Security pricing readable; Activated=Plan tiers captured; Proven=az security pricing list captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Azure CLI security pricing
- Environment: JM1-PRIME
- Capability Owner: Jackie / Azure Security Admin
- Confidence: High
- Known Limitation: Many plans read as Free in core; commercial pillar requires synthesis.
- Required Next Action: Decide Standard plan needs by workload risk/grant availability.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-AZ-003 — Key Vault presence and identity pattern

- Maturity State: Designed=Secrets should use Key Vault and managed identity where appropriate; Entitled=Key Vault resources visible; Activated=Vault resources present; Proven=Key Vault and identity metadata captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Azure CLI keyvault/resource list
- Environment: JM1-PRIME
- Capability Owner: Jackie / Azure Admin
- Confidence: High
- Known Limitation: Secret values intentionally not read; access-policy/RBAC detail may require deeper review.
- Required Next Action: Map app setting secrets to Key Vault reference or exception.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
