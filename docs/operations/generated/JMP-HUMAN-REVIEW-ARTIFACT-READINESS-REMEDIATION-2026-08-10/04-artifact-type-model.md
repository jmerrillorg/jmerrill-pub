# Artifact Type Model

Last verified: 2026-08-10T14:04:00Z

The remediation separates production artifacts by role:

| Artifact class | Meaning |
| --- | --- |
| BRIEF | Input describing intent, requirements, constraints, or creative direction. |
| SOURCE | Input material used to produce a review or production artifact. |
| WORKING_ARTIFACT | In-progress production work not yet ready for human review. |
| REVIEW_ARTIFACT | Actual artifact the human is being asked to judge. |
| APPROVED_ARTIFACT | Artifact approved after human review. |
| EVIDENCE_ARTIFACT | Repository or execution evidence proving what happened. |

Fail-closed rule:

BRIEF and EVIDENCE_ARTIFACT do not satisfy REVIEW_ARTIFACT unless a review definition explicitly calls for that class.

Cover Design result:

| Artifact | Classification |
| --- | --- |
| `2026-07-18-The-Intentional-Leader-Cover-Creative-Brief-Wave1.md` | BRIEF |
| `2026-07-19-The-Intentional-Leader-Cover-Concept-Development-Package.md` | EVIDENCE_ARTIFACT / CREATIVE DIRECTION |
| Actual visual cover concept | REVIEW_ARTIFACT, not found |
