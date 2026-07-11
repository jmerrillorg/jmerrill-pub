## JM1 Author Action Truth Guard

Status: Implemented in runtime logic; production browser confirmation still required

Rule
- Author-facing actions are driven by artifact availability and live Core truth.
- Internal approval gates alone must never create author tasks.

Required sequence
- Artifact exists
- Artifact released
- Author can access artifact
- Author task appears

If any condition is false
- Show publisher progress
- Do not show approval waiting
- Do not show review requested
- Do not imply author action is required

Runtime truth sources
- `jm1pub_editorialapprovalgate`
- `jm1pub_editorialstage`
- `jm1pub_editorialsummary`
- `jm1pub_editorialartifact`
- latest authoritative execution evidence where applicable

Current enforced posture for The Intentional Leader
- A2 approval is already complete
- Developmental Editing is `In Progress`
- Current author-facing truth must not regress to:
  - awaiting approval
  - review requested
  - pre-A2 author action language

Expected live author-facing truth
- Stage: `Developmental Editing`
- Status: `In Progress`
- Summary: `Developmental work on Volume I is underway.`
- Body: `Your approval has been received, and developmental work has begun on Volume I, covering January through March.`
- Next action: `No action is required from you at this time. We will contact you if your input is needed during the developmental process.`

Regression states blocked
- approval-waiting copy after approval
- stale stage labels
- author-action prompts when no author action exists
- publisher-progress states rendered as author blockers
- stage fallback to earlier setup states when editorial truth is newer and authoritative

Remaining step
- Complete fresh authenticated browser validation and capture governed evidence that production UI reflects this Core truth.
