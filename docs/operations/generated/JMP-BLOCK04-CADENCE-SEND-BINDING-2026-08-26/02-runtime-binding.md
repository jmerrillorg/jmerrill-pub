# Runtime Binding

Last Verified: 2026-08-26T09:14:05Z

## Implemented Path

The timer path is:

`run-editorial-cadence-release-consumer`

The governed sequence is:

1. Read cadence schedule candidates.
2. Resolve exact editorial stage, title, current approval gate, contact, package completion evidence, and stage artifacts.
3. Reject non-GUID historical source ids.
4. Reject cadence rows marked publisher/internal or non-author-release eligible.
5. Treat existing governed send logs or delivered author gates as already released.
6. Persist/refresh cadence schedule evidence.
7. For due rows, correlate Publishing mailbox delivery and reply evidence.
8. Fail closed on ambiguous correlation or unavailable mailbox correlation.
9. Validate all required send inputs.
10. Materialize required current author-visible attachments and verify checksum/file integrity.
11. Send through governed ACS relay.
12. Patch the approval gate to awaiting author response.
13. Log `PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT`.

## New Runtime Module

`azure-functions/diagnostic-ai-runner/src/editorial/editorialCadenceAuthorPackageSender.js`

Responsibilities:

- select required author-visible artifacts by stage type;
- download source artifacts from governed Microsoft storage;
- validate binary/file integrity;
- render canonical author-facing HTML and plain text;
- route through ACS author communication relay;
- preserve sender, reply-to, CC, template, renderer, attachment checksum, and provider message evidence.

## Fail-Closed Behaviors

The runtime does not send when any of these are true:

- missing title;
- missing stage id;
- missing approval gate;
- missing canonical intake reference;
- missing contact;
- missing author email;
- missing QA/package completion evidence;
- missing required attachment;
- invalid attachment checksum or binary signature;
- ambiguous mailbox delivery evidence;
- mailbox correlation unavailable;
- cadence row is publisher/internal or non-author-release eligible.

