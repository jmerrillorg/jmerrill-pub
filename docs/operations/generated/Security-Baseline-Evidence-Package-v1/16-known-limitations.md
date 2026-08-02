# 16 Known Limitations

Generated: 2026-07-29T16:55:41.152Z
Package version: v1
Mode: READ-ONLY
Execution environment: JM1-PRIME
Authority: Jackie Ruling, 2026-07-29; PROGRAM-004 Amendment 1 Annex S
Collection authority: Cody
Synthesis authority: Chad
Governance authority: Jackie

- ANNEXS-GAP-001: Entitlements / M365 SKU and service plan inventory — Per-user service plan details summarized to reduce identity data in v1 package. Safe next action: Chad synthesize license sufficiency against nine lanes.
- ANNEXS-GAP-002: Entitlements / Intune availability — Service plan observed, but tenant activation/enrollment policy still requires portal/API proof. Safe next action: Validate Intune tenant activation and endpoint enrollment policy.
- ANNEXS-GAP-003: Entitlements / Purview availability — Policy configuration requires compliance endpoint readback. Safe next action: Validate labels, retention, DLP coverage in Purview.
- ANNEXS-GAP-004: M365 security/compliance / Secure Score snapshot — Secure Score query failed under current token. Safe next action: Review score controls and improvement actions separately.
- ANNEXS-GAP-005: Endpoints / Intune managed device inventory — Current token may lack Intune device read permission or tenant may not be activated. Safe next action: Confirm Intune enrollment for each named endpoint.
- ANNEXS-GAP-006: Azure / Defender for Cloud plan states — Many plans read as Free in core; commercial pillar requires synthesis. Safe next action: Decide Standard plan needs by workload risk/grant availability.
- ANNEXS-GAP-007: Development security / GitHub repository control inventory — Org plan metadata requires admin:org/security-manager authority; some repo fields require admin visibility. Safe next action: Refresh GitHub auth or validate org security settings in GitHub UI.
- ANNEXS-GAP-008: Power Platform / Power Platform environment/resource inventory — Power Platform admin DLP/security-role/audit endpoints not fully readable from installed tooling; pac/m365 CLI absent. Safe next action: Validate PP environments, DLP connector groupings, Dataverse auditing via admin center/API.
