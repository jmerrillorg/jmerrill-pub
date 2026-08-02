# 05 Endpoints

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

JM1-PRIME direct local evidence plus Intune managed-device evidence where accessible; other named endpoints recorded as limitations when not directly accessible.

## Records

## ANNEXS-ENDPOINT-001 — Intune managed device inventory

- Maturity State: Designed=Endpoint lane names JM1-PRIME/SUPPORT/ARCHIVE/VIEW/MOBILE; Entitled=Unknown; Activated=Not proven; Proven=Not proven
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Graph Intune managedDevices
- Environment: JM1-PRIME
- Capability Owner: Jackie / Endpoint Admin
- Confidence: Low
- Known Limitation: Current token may lack Intune device read permission or tenant may not be activated.
- Required Next Action: Confirm Intune enrollment for each named endpoint.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-ENDPOINT-002 — JM1-PRIME local OS/encryption/admin posture

- Maturity State: Designed=Endpoint baseline includes OS patch, encryption, local admin, enrollment; Entitled=Local read access available; Activated=FileVault active on JM1-PRIME; Proven=Local command readback captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Local macOS commands
- Environment: JM1-PRIME
- Capability Owner: Jackie / Endpoint Owner
- Confidence: Medium
- Known Limitation: Only JM1-PRIME local posture directly inspected.
- Required Next Action: Run same collector on JM1-SUPPORT/JM1-ARCHIVE or validate via Intune.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
