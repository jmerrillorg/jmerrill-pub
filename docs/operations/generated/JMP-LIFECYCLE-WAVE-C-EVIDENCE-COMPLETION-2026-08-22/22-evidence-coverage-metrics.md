# Evidence Coverage Metrics

| Coverage metric | Implementation |
| --- | --- |
| Artifact identity | SUPPORTED when evidence link/id exists; otherwise INCOMPLETE DATA_GAP |
| Artifact checksum | SUPPORTED only from checksum property or 64-char sha256 marker |
| Artifact provenance | SUPPORTED from evidence links; no link remains gap |
| Workspace entitlement | SUPPORTED only from explicit entitlement field |
| Workspace active | SUPPORTED only from explicit workspace active field |
| Onboarding nuance | SUPPORTED only from explicit onboarding field |
| Package accepted | SUPPORTED from package accepted evidence |
| Pricing lock | SUPPORTED from pricing locked / locked price evidence |
| Agreement executed | SUPPORTED from signed/executed agreement evidence |
| Payment/installment | SUPPORTED from initial/first/deposit/paid and 2/4/8-pay/installment evidence |
| Joined the Family | SUPPORTED only when agreement and payment support the event; conflict otherwise |
| Format identity | SUPPORTED per format, not globally |
| Distribution/live state | SUPPORTED per format clause only |
| Certification/readiness | SUPPORTED per format clause only |
