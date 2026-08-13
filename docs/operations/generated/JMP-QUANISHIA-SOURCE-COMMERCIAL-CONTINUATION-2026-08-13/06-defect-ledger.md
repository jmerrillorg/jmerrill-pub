# Defect Ledger

Last verified: 2026-08-13T02:00:02Z

## Defect 1: Quanishia Missing-Source State Was Stale

- Classification: internal source-correlation defect
- Live asset: `JMP-INT-202608-0AOS7L`
- Remediation: located and correlated `Indomitable_Compiled_Batch1_2.docx`
- Author resend required: NO
- False Jackie gate created: NO
- Status: REMEDIATED LOCALLY / CORRELATED IN DATAVERSE

## Defect 2: Stage 0 Real-Manuscript Prompt Was Not Azure JSON-Object Compatible

- Classification: runtime prompt/provider compatibility defect
- Symptom: `AZURE_OPENAI_HTTP_400`
- Remediation: explicit JSON-object response contract added to real-manuscript prompt
- Status: FIXED / AWAITING DEPLOYMENT PROOF

## Defect 3: Numeric Manuscript Asset Status Read as Null

- Classification: Dataverse choice readback defect
- Symptom: `assetStatus` logged as null for numeric status `3`
- Remediation: numeric values are now string-preserved in `diagnosticRecordReader`
- Status: FIXED / VALIDATED

## Defect 4: Opportunity Create Failure Was Too Opaque

- Classification: service-identity diagnostics defect
- Live asset: `JMP-INT-202608-3W6Q6L`
- Symptom: Function create-from-zero failed with Dataverse `0x80040265` without actionable step/message detail
- Remediation: continuation path returns sanitized Dataverse step and message, and parses `OData-EntityId`
- Status: FIXED / AWAITING SERVICE-IDENTITY CREATE PROOF

## Defect 5: Format Selection Was Not Explicit Before Production Specification

- Classification: onboarding readiness defect
- Remediation: governed package-aware Format Selection and downstream Product Form drivers added
- Status: FIXED / VALIDATED
