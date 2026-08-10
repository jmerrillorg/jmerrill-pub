# Review-Readiness Contract

Last verified: 2026-08-10T14:04:00Z

Invariant:

No governed production task may enter INTERNAL REVIEW unless the actual artifact requiring human judgment exists, is governed, is valid for that review type, and is directly accessible to the assigned reviewer.

Required all-pass gate:

| Requirement | Required |
| --- | --- |
| Review artifact exists | YES |
| Correct artifact class | YES |
| Correct title | YES |
| Current/non-superseded | YES |
| Governed reference | YES |
| Checksum or version | PRESENT |
| Assigned reviewer | PRESENT |
| Reviewer access | VERIFIED |
| Decision request | DEFINED |

Any failure returns:

`REVIEW_ARTIFACT_NOT_READY`

For Cover Design:

| Object | Contract role |
| --- | --- |
| Creative brief | INPUT |
| Concept-development package | INPUT / CREATIVE DIRECTION |
| Actual visual cover concept | REVIEW ARTIFACT |

Evidence source:

- `lib/server/human-review-artifact-readiness.ts`
- `scripts/human_review_artifact_readiness.test.mjs`
