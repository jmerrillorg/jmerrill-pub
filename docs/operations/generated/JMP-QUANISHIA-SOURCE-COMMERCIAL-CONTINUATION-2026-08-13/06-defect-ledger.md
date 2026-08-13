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
- Status: FIXED / DEPLOYED; POST-FIX EXECUTION NOW BLOCKED BY AZURE `429` RATE LIMIT

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
- Status: FIXED / DEPLOYED; EXISTING OPPORTUNITY REPLAY PROVEN; CREATE-FROM-ZERO PROOF REQUIRES GOVERNED CERTIFICATION FIXTURE OR EXPLICIT LIVE-RECORD AUTHORITY

## Defect 5: Format Selection Was Not Explicit Before Production Specification

- Classification: onboarding readiness defect
- Remediation: governed package-aware Format Selection and downstream Product Form drivers added
- Status: FIXED / VALIDATED

## Defect 6: Initial Function Publish Produced Empty Trigger Index

- Classification: deployment execution defect
- Symptom: Core Tools publish completed, Azure listed no functions, and protected route returned `404`
- Remediation: explicit zip deployment from merge SHA `aa62b91489677f4479403cc730917ae1a39f75ad`
- Zip SHA-256: `569a3c08ecd5625f3668113cc13f1349ccbc275c5aa0be83e8b0b7792742003c`
- Status: REMEDIATED / PROTECTED ROUTE RESTORED TO `401 Unauthorized`
