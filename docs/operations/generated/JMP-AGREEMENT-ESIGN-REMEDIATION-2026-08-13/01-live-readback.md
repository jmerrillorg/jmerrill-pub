# Live Readback

Last verified: 2026-08-13T10:32:13Z

## Intake

| Field | Value |
| --- | --- |
| Intake reference | JMP-INT-202608-3W6Q6L |
| Intake ID | 383b6d6c-f595-f111-8076-7c1e525b15c2 |
| Title | 'TIL DEATH DO US PART |
| Workspace URL | https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/01_Pre-Pipeline/00_Inquiry/JMP-INT-202608-3W6Q6L%20-%20Jackie%20Smith%20Jr%20-%20TIL%20DEATH%20DO%20US%20PART |

## Diagnostic

| Field | Value |
| --- | --- |
| Diagnostic ID | 48cd0d86-f595-f111-8076-6045bdd69435 |
| Diagnostic name | INT-PUB-005 Stage 0 Handoff - JMP-INT-202608-3W6Q6L |
| Recommended package | 196650000 |
| Alternate package code | null |
| Author draft send status | DRAFT_ONLY |

## Opportunity

| Field | Before remediation | After remediation |
| --- | --- | --- |
| Opportunity ID | 11cdec24-b596-f111-8076-7c1e525b15c2 | 11cdec24-b596-f111-8076-7c1e525b15c2 |
| Name | Publishing Opportunity - 'TIL DEATH DO US PART | Publishing Opportunity - 'TIL DEATH DO US PART |
| Contract status | 196650002 | 196650001 |
| Agreement preparation status | AGREEMENT_SENT_FOR_SIGNATURE | AGREEMENT_SEND_SUPERSEDED_AWAITING_FORMAT_SELECTION |
| Selected payment option | null | null |
| Selected installment count | null | null |
| Selected payment amount | null | null |
| Selected payment total | null | null |

## Contract Row

No `jm1pub_contract` row was found for Opportunity `11cdec24-b596-f111-8076-7c1e525b15c2`.

## Provider Configuration

| Setting | Value |
| --- | --- |
| JM1_SIGN_PROVIDER | signnow |
| JM1_SIGNNOW_ENABLED | true |
| JM1_SIGNNOW_ENV | live |

Deployed functions matching agreement/signature scope:

- run-agreement-document-preparation
- run-agreement-package-send
- run-governed-agreement-generation
- signnow-webhook

No outbound SignNow send function was found in the deployed function list.

## Execution Log

| Field | Value |
| --- | --- |
| Execution log ID | 0af76e3f-0297-f111-8076-000d3a14673b |
| Name | AGREEMENT-ESIGN-REMEDIATION-48cd0d86-f595-f111-8076-6045bdd69435 |
| Action type | AGREEMENT_ATTACHMENT_SEND_SUPERSEDED |
| Source entity | opportunity |
| Source record ID | 11cdec24-b596-f111-8076-7c1e525b15c2 |
| Completed on | 2026-08-13T10:32:13Z |
