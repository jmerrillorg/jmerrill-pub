# Target Pipeline (evidence-supported)

```
Inquiry / Source
    ↓
Source Authority (governed manuscript, checksummed)
    ↓
Confirmed Imprint (jm1pub_certifiedimprint) OR Suggested Imprint (jm1pub_imprint)
    — JM Signature suggestion: proceed with recommendation context;
      official assignment requires jm1pub_classificationstatus = Confirmed
    ↓
Editorial Review (assessment/triage/pathway/style-guide determination)
    ↓
Prospect Recommendation/Commercial Conversion  OR  Active Project Continuation
    ↓
Developmental  →  Author Approval
    ↓
Line  →  Author Approval
    ↓
Copy  →  Author Approval
    ↓
Layout / Typesetting
    ↓
Proof (post-layout verification)  →  Final Author Approval
    ↓
Production Finalization
    ↓
Cover / Format Finalization (Concept → Full Wrap, distinct states)
    ↓
Distribution Review (final QC gate, incl. profitability)
    ↓
Distribution / Release
```

This matches the existing domain architecture already present in `PACKAGE_STAGE_POLICIES` almost exactly — the only structural change required is moving `INTERIOR_LAYOUT_REVIEW` before `PROOFREADING_REVIEW`, and reconciling the two other stage enums against this one as the source of truth. No new domains are proposed.
