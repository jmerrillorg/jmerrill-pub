# 09 Development Security

Generated: 2026-07-29T16:55:41.152Z
Package version: v1.1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

## Scope

GitHub repository metadata and metadata-only local secret-location sweep.

## Records

## ANNEXS-DEV-001 — GitHub repository control inventory

- Maturity State: Designed=Branch protection, secret scanning, Dependabot, CodeQL, Actions permissions required; Entitled=Repo scope readable; Activated=Repository metadata captured; Proven=gh repo/API readback
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: GitHub CLI repo/API
- Environment: JM1-PRIME
- Capability Owner: Jackie / GitHub Admin
- Confidence: Medium
- Known Limitation: Org plan metadata requires admin:org/security-manager authority; some repo fields require admin visibility.
- Required Next Action: Refresh GitHub auth or validate org security settings in GitHub UI.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields

## ANNEXS-DEV-002 — Local secrets sweep on JM1-PRIME

- Maturity State: Designed=Locations/types only; never values; Entitled=Local filesystem readable; Activated=Credential-adjacent files present; Proven=Metadata-only scan captured
- Last Verified: 2026-07-29T16:51:02.414Z
- Evidence Source: Metadata-only local filename/type scan
- Environment: JM1-PRIME
- Capability Owner: Jackie / Cody
- Confidence: Medium
- Known Limitation: No file values read or recorded; candidate list is not proof of compromise. Scan depth bounded.
- Required Next Action: Review candidates and move governed secrets to approved vault/keychain paths as needed.
- Related Governance Reference: PROGRAM-004 Amendment 1 Annex S; Maturity Model v2.0 record fields
