# Live Archive Readback

Generated: 2026-08-02

## Scope

This readback inspected the Publishing shared-mailbox archive copy for the corrected Before You Were Born package associated with protected dispatch run `30738351416`.

It does not certify operational delivery.

## Archive Message Located

Mailbox:
publishing@jmerrill.one

Recipient:
scrowley50@gmail.com

Sender:
publishing@email.jmerrill.one

Received:
2026-08-02T07:43:46Z

Subject:
Corrected Developmental Editing Review Review Package - Before You Were Born

Has attachments:
true

Body content type:
html

## Operational Findings

Subject:
FAILED - duplicated `Review Review`

Body rendering:
FAILED - fetched archive body contains visible `Review Package and Reply` text but did not expose a validated href-backed production action link in connector readback.

Message wording:
PARTIAL - author-facing content is present, but the subject and action presentation do not satisfy the corrected delivery standard.

Archive:
PASS - shared mailbox archive copy exists at the expected corrected-send timestamp.

Attachment payload materialization:
NOT PROVEN - the Outlook connector exposed the shared-mailbox message and `has_attachments: true`, but did not expose a shared-mailbox attachment materialization action. The ordinary attachment reader rejected the item because it belongs to the shared Publishing mailbox.

Recipient usability:
NOT CONFIRMED - no post-replacement Sean confirmation proves that the package files open and the review action works.

## Response Clock Disposition

The reported response clock start `2026-08-02T03:43:28 ET` corresponds to the archive message received at `2026-08-02T07:43:46Z`, but the located message is not operationally certified.

The response clock was invalidated after live Dataverse readback confirmed the gate still carried the failed clock.

Invalidation readback:

- Gate: `e996abe7-2f8e-f111-8077-000d3a14673b`
- Before status: `Awaiting Author Response` (`196650002`)
- Before awaiting-since: `2026-08-02T07:43:28Z`
- After status: `Ready for Author Review` (`196650001`)
- After awaiting-since: `NULL`
- Active gate count: `1`
- Duplicate gates: `0`
- Correlation: `bywb-failed-delivery-clock-invalidated:2026-08-02:47ec6252-d233-4b60-ae97-87b03599780c`
- Execution log action type: `PUBLISHING_DISPATCH_OPERATIONAL_CERTIFICATION_PENDING`

The response clock must not restart until a replacement package is delivered with:

- corrected subject;
- validated clickable action link;
- delivered attachment inventory;
- DOCX/PDF byte and open-test proof;
- Author Operating Center package visibility;
- working response controls;
- recipient usability confirmation.

## Final Classification

Latest replacement communication:
IDENTIFIED

Operational delivery:
FAILED

Before You Were Born:
TECHNICALLY_RELEASED / AUTHOR_PACKAGE_DELIVERY_FAILED

Corrective path:
Merge and deploy PR #391, send one usable replacement through PROGRAM-006, then certify operational delivery from the usable replacement timestamp.
