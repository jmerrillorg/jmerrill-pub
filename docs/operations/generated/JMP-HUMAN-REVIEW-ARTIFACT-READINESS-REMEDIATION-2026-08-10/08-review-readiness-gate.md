# Review-Readiness Gate

Last verified: 2026-08-10T14:04:00Z

Implemented in:

- `lib/server/human-review-artifact-readiness.ts`
- `lib/server/publisher-operating-center.ts`

Gate outcomes:

| Condition | Outcome |
| --- | --- |
| All required fields pass | INTERNAL_REVIEW_ELIGIBLE |
| Any required field fails | REVIEW_ARTIFACT_NOT_READY |
| Brief only | REVIEW_ARTIFACT_NOT_READY |
| Evidence package only | REVIEW_ARTIFACT_NOT_READY |
| Multiple review artifacts | REVIEW_ARTIFACT_NOT_READY |
| Missing reviewer access | REVIEW_ARTIFACT_NOT_READY |

Publisher Operating Center behavior:

If a Cover Design project has only brief or baseline markers, the cover queue surfaces:

`REVIEW ARTIFACT NOT READY`

and the next action:

`Prepare or register the first governed visual cover concept before Jackie internal review; do not treat the brief or evidence package as the review artifact.`

INTERNAL REVIEW appears only when the governed review artifact and reviewer-access markers are present.
