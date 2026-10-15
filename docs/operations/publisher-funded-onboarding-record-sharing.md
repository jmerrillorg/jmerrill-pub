# Publisher-Funded Onboarding Record Sharing

Status: prepared implementation; automatic sharing is disabled and has not been
live-certified. The five October 14 existing records were separately authorized
for exact ReadAccess shares. That approval does not grant a new website privilege.

## Proven Cause

The website creates `jm1pub_submission` attempt receipts as application user
`e0e307e1-2fb0-f111-aaac-000d3a14673b`. The existing Function user
`cb6e97e5-1d6a-f111-a826-000d3a9eacee` has Basic Submission Read and does not own
those rows. Exact shares solve this without changing owner or table-level Read.
Its managed-identity principal is `e8c51a80-bdb0-46fa-b398-9109719d6427` and
application ID is `dc8d1429-8c1b-473b-83ca-f9545fad8074`.

Native `RetrieveUserPrivilegeByPrivilegeName` returned an empty RolePrivileges
array for the website's `prvSharejm1pub_Submission` on October 14. Source search
found no existing governed onboarding share broker. Do not substitute an admin
credential or run an operator loop as the durable mechanism.

## Prepared Path

The existing receipt writer calls the bounded sharing helper after durable
creation. It verifies the website/organization, pinned recipient, exact record
ownership and creator, title/contact/issued agreement binding, and complete
saved payload. Admission remains limited to the five authorized funded titles;
external-author automation is not enabled.

Only `ReadAccess` may be granted to the existing Function. Relationship metadata
must prove no cascading shares; broader existing rights, broader Share depth,
changed ownership/content or uncertain readback fail closed. Recovery reads
actual access first, so an ambiguous successful grant does not cause another
write. No new scheduler, identity, table-wide access, stage advancement, email,
invoice or provider action is introduced.

Receipt creation and sharing are not an atomic provider transaction. A sharing
failure preserves the accepted receipt and reports HTTP202 awaiting processor
access, with a privacy-safe receipt reference and deterministic routing evidence.
An identical retry reuses the existing receipt. Do not ask the author to resubmit
as operational recovery; the owner must reconcile the retained receipt.

## Exact Additional Permission Decision

Proposed: add **Basic Share only** for `prvSharejm1pub_Submission` to the website's
existing `JMP Author Onboarding Submission Capture` role
`4cbbbeb6-10ba-f111-aaac-6045bdd69738`. No new Read, Write, Create, Assign, Delete,
Append, administrator, Local or Global permission is proposed. Verify that the
role is not shared with unintended principals before any authorized change.

October 14 12:09 UTC readback found this role assigned only to the website user,
with no team assignments. Exact Share privilege ID:
`426898a2-d694-4364-b251-ab64acb6f2e9`. Recheck immediately before any future
authorized grant; this snapshot is not permission to apply it.

This is an additional delegation capability, not the five record shares already
approved. At the platform level Basic Share is not restricted to a particular
recipient or to Read-only grants: application guards restrict this implementation
to the pinned processor and ReadAccess. This residual security distinction must
be approved explicitly before granting it. No permission is applied by this PR.

Intended duration: while this governed capture workflow operates. Rollback:
disable `JM1_ONBOARDING_PROCESSOR_READ_SHARING_ENABLED`, remove only the added
Basic Share privilege after confirming role drift, and retain existing exact
Read shares needed for receipt validation/replay. Do not revoke prior grants or
alter submissions as a side effect of disabling future sharing.

After authorization, independently verify effective Basic Share, release through
the existing website path, and enable only this bounded mechanism. Prove same-ID
recovery, record ownership/content preservation, exact Function Read, and denial
on unrelated records using a separately governed fixture or the next eligible
real submission. Do not resubmit the five completed author forms to test it.

## Evidence

Existing packet: `JMP-JACKIE-TITLE-COMMISSIONING-20261008`, checkpoint
`stage05-five-signing-v1/artifact.md`. Private exact-ID access, before/after,
runtime receipts and custody evidence remain there, not in public source logs.

Microsoft authority:
[Sharing and assigning](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/security-sharing-assigning)
and [Data operations and access rights](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/security-access-rights).

## October 15 authorization and isolated acceptance

The Publisher approved Basic Share on the existing capture role, explicitly
acknowledging the platform/application restriction distinction. Native readback
confirmed Basic and unchanged unrelated privileges. This supersedes the pending
permission decision above, not the preserved historical evidence.

The five real receipts must not be replaced or resubmitted for this test. The
internal `/api/publishing/onboarding/acceptance` route uses the existing worker
key and only an empty JSON object. It generates one fixed synthetic payload from
`JM1_ONBOARDING_ACCESS_ACCEPTANCE_KEY` (32 lowercase hex characters) and a bounded
`JM1_ONBOARDING_ACCESS_ACCEPTANCE_EXPIRES_AT` (maximum four hours). No caller may
choose content, recipient, title, contact or record ID. The fixture has no author
attestation, title/contact linkage or workflow stage, and uses separate synthetic
capture/routing action types. The ordinary author endpoint cannot select this
policy. Both paths use the same deterministic receipt writer and sharing guard.

Set `JM1_ONBOARDING_ACCESS_ACCEPTANCE_HOLD=true` only for the fixture to fail
before sharing. Confirm a durable HTTP202 receipt and denied Function read. Set
the hold false and retry the same fixed fixture: require identical record bytes,
ID, owner and ETag, one exact Read share, and no additional receipt. The existing
Function source-registration endpoint accepts `ONBOARDING_ACCESS_ACCEPT` only
within the same fixed window. It reads that exact record under its own identity,
checks ReadAccess only, and writes an immutable private acceptance receipt under
`onboarding-access-acceptance/<key>/receipt.json`. It never completes Stage06 or
advances a real title. Repeated/restarted calls must retain the same receipt.

After acceptance remove the fixture key/expiry/hold settings from both runtimes;
verify the test paths fail closed. Keep ordinary automatic sharing enabled and
preserve synthetic evidence, real title receipts and their Stage07 folders.
No new scheduler, identity, table privilege, author communication or paid model
operation is introduced by the acceptance facility.
