# Data Gap Taxonomy

| Gap family | Reason | Classification |
| --- | --- | --- |
| Artifact identity | SUPPORTED when evidence link/id exists; otherwise INCOMPLETE DATA_GAP | RESOLVABLE |
| Artifact checksum | SUPPORTED only from checksum property or 64-char sha256 marker | RESOLVABLE |
| Artifact provenance | SUPPORTED from evidence links; no link remains gap | RESOLVABLE |
| Workspace entitlement | SUPPORTED only from explicit entitlement field | STRUCTURAL |
| Workspace active | SUPPORTED only from explicit workspace active field | STRUCTURAL |
| Onboarding nuance | SUPPORTED only from explicit onboarding field | STRUCTURAL |
| Package accepted | SUPPORTED from package accepted evidence | STRUCTURAL |
| Pricing lock | SUPPORTED from pricing locked / locked price evidence | STRUCTURAL |
| Agreement executed | SUPPORTED from signed/executed agreement evidence | STRUCTURAL |
| Payment/installment | SUPPORTED from initial/first/deposit/paid and 2/4/8-pay/installment evidence | STRUCTURAL |
| Joined the Family | SUPPORTED only when agreement and payment support the event; conflict otherwise | STRUCTURAL |
| Format identity | SUPPORTED per format, not globally | STRUCTURAL |
| Distribution/live state | SUPPORTED per format clause only | STRUCTURAL |
| Certification/readiness | SUPPORTED per format clause only | STRUCTURAL |
