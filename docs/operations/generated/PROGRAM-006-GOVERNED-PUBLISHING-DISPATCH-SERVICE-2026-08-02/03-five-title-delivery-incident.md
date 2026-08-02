# Five-Title Author Delivery Incident

Incident classification:

`AUTHOR_PACKAGE_DELIVERY_AND_WORKSPACE_CANON_FAILURE`

Evidence basis:

Jackie-provided screenshots and ruling, 2026-08-02.

## Failure Classes

- `UNBRANDED_AUTHOR_EMAIL`
- `REQUIRED_ATTACHMENT_MISSING`
- `PORTAL_ONLY_DELIVERY_UNSAFE`
- `WORKSPACE_STAGE_MISMATCH`
- `CANONICAL_ARTIFACT_NOT_REGISTERED`
- `TITLE_RESOLUTION_FAILED_DESPITE_EXISTING_WORKSPACE`

## Title Dispositions

The Intentional Leader:

- Business truth remains `Interior Layout - Awaiting Author Response`.
- Workspace reconciliation under `/01_Titles` is required.
- Completed Copyediting and Proofreading evidence must be preserved as history, not active state.

Before You Were Born:

- Original protected-worker delivery is classified `AUTHOR_PACKAGE_DELIVERY_FAILED`.
- Reason: branded HTML canon failed and required package attachments were missing.
- Any response clock from the defective send must be cancelled or invalidated.
- Corrected delivery must supersede the original send.

The Long Watch:

- Original protected-worker delivery is classified `AUTHOR_PACKAGE_DELIVERY_FAILED`.
- Reason: branded HTML canon failed and required package attachments were missing.
- Any response clock from the defective send must be cancelled or invalidated.
- Corrected delivery must supersede the original send.

The General's Will and Last Testament:

- Canonical workspace exists under `/01_Titles/02_Developmental-Editing`.
- The blocker is registration/classification, not absence of work.
- Dispatch may not create a replacement title because lookup failed.

Establishing Glory: The Library:

- Governed source material exists under the internal `Compilation-Reconciliation` workflow.
- Author-facing title must remain `Establishing Glory: The Library`.
- `Compilation-Reconciliation` may appear only as internal workflow metadata.

## Pipeline Maturity

Protected dispatch transaction: `PASS`

Email canon enforcement: `IN REPAIR`

Attachment enforcement: `IN REPAIR`

Workspace synchronization: `PARTIAL`

End-to-end author delivery: `PARTIAL`

Unattended pipeline production readiness: `NOT CERTIFIED`

## Implementation Response

PROGRAM-006 is hardened to:

- require branded HTML and plain text;
- require package inventory and response choices;
- materialize real author-safe artifacts from SharePoint through Microsoft Graph;
- validate attachment checksums against Dataverse artifact records;
- reject portal-only package delivery;
- require `/01_Titles` workspace authority evidence;
- reject dispatch before response-clock start when preflight fails;
- keep idempotency on the natural business key.
