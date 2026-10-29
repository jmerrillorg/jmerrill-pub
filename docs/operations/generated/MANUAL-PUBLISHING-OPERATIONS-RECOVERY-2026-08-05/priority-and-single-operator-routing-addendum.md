# Priority and Single-Operator Routing Addendum

Date: 2026-08-07

Scope: PR #431 manual Publishing operations recovery.

This addendum records the current manual operating priority and workload-routing rule. It does not complete title work, send communications, thaw automation, authorize runtime work, or change the title states already recorded in this recovery package.

## Current Manual Title Priority

1. Before You Were Born
2. Naughty Tales
3. The General's Will and Last Testament
4. Strategies For Success - parallel manual production

## Title States

| Priority | Title | Current state | Next valid action | Send boundary |
| ---: | --- | --- | --- | --- |
| 1 | Before You Were Born | EDITORIAL_STATE_CONFIRMATION_REQUIRED; AUTHOR_FACING_INTERNAL_INFORMATION_EXPOSURE | Confirm editorial state, preserve incident evidence, prepare a clean corrected package after verification, then request Jackie approval for any apology or corrected package send. | DO NOT SEND; JACKIE_CORRECTIVE_SEND_APPROVAL_REQUIRED |
| 2 | Naughty Tales | DEVELOPMENTAL_EDIT_REQUIRED | Perform manual developmental edit from the verified source manuscript, generate clean author-facing deliverables, run leakage QA, file the package, then request Jackie send approval. | DO NOT SEND; JACKIE_SEND_APPROVAL_REQUIRED |
| 3 | The General's Will and Last Testament | AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED | Validate the candidate source against prior manuscripts, Program-008 package evidence, and later outputs; then prepare a corrected author-review package only after authoritative validation and leakage QA. | DO NOT SEND; JACKIE_CORRECTIVE_SEND_APPROVAL_REQUIRED |
| 4 | Strategies For Success | MANUAL_FINAL_PRODUCTION; HARDCOVER_DESIGN_IN_PROGRESS | Continue manual hardcover design and manual release preparation under the Operating Manual. | NO AUTHOR COMMUNICATION REQUIRED UNDER PR #431 |

## Single-Operator Scheduling Rule

When Jackie receives competing work requests, classify them before scheduling:

| Class | Meaning | Priority |
| --- | --- | ---: |
| AUTHOR_CURRENT | Current author-facing work or recovery obligations. | 1 |
| REVENUE_CURRENT | Current revenue, agreement, payment, fulfillment, or release obligations. | 2 |
| COMPLIANCE_CURRENT | Current legal, compliance, audit, security, or regulatory obligations. | 3 |
| PLATFORM_FUTURE | Future platform, runtime, workflow, or automation work. | 4 |
| ARCHITECTURE_FUTURE | Future architecture, design, planning, or optimization work. | 5 |

This is a workload-routing rule only. It does not override executive authority, legal holds, author-specific approvals, security boundaries, or governed stop states.

## Priority Interaction with PR #438

If PR #431 and PR #438 both need Jackie attention at the same time, PR #431 wins.

PR #438 may continue technical evidence work in parallel only while it does not consume Jackie decision bandwidth needed for current author obligations.

## Boundaries Preserved

- Author communications sent under this addendum: 0.
- PR #431 remains OPEN / DRAFT and must not merge as completed recovery until title gates are actually cleared.
- Client-title automation remains FROZEN.
- Client-title production remains MANUAL.
- Slice 3 runtime remains NOT ACTIVE.
- Financial work under this addendum: 0.
