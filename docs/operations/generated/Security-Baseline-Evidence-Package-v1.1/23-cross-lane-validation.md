# 23 Cross-Lane Validation

Generated: 2026-07-30T00:57:24.975Z
Package version: v1.1
Mode: READ-ONLY

No contradictions were resolved by assumption. The following questions are carried to Chad for synthesis.

## CLQ-001: Identity ↔ Power Platform

- Question: Do Power Platform/Dynamics administrators with standing roles align to Conditional Access and break-glass posture?
- Evidence: Conditional Access list refreshed; standing role assignments readable; Power Platform principal inventory partial.
- Status: OPEN_FOR_CHAD

## CLQ-002: Azure ↔ Development security

- Question: Are App Service / Key Vault deployment identities protected by matching GitHub Actions controls?
- Evidence: Azure identity/Key Vault metadata refreshed; GitHub Actions permissions readable per repo only where endpoint allowed.
- Status: OPEN_FOR_CHAD

## CLQ-003: Recovery ↔ Monitoring

- Question: Do monitoring alerts cover backup/restore failures for each system of record?
- Evidence: Log Analytics and metric alerts observed; restore evidence remains documentation-based.
- Status: OPEN_FOR_CHAD

## CLQ-004: M365 ↔ Purview

- Question: Do entitled compliance plans have activated labels, retention, DLP, and audit coverage?
- Evidence: Entitlement observed; Purview policy endpoints blocked.
- Status: NOT_VERIFIED

## CLQ-005: Foundry ↔ AI security

- Question: Are model runtime dependencies, network exposure, and AI request logging aligned to manuscript ingestion protections?
- Evidence: v1 AI dependency inventory plus Azure resource readback; no remediation or network changes.
- Status: OPEN_FOR_CHAD
