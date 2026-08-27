# Pre-Send Policy

Last Verified: 2026-08-27T10:49:52Z

## Enforced Sequence

```text
PACKAGE_READY
-> FINAL EMAIL RENDER
-> EMAIL LAST-MILE CHECK
-> ACTUAL ATTACHMENT CONTENT CHECK
-> HUMAN-FIRST / WHY-FIRST
-> IDENTITY
-> SEND
```

## Fail-Closed Conditions

The package notification path now rejects physical author-review attachments that expose internal recipient-surface text such as automation metadata, source checksums, artifact wrappers, QA evidence, execution-state language, or raw internal identifiers.

Manuscript-role DOCX attachments must also pass a content sanity profile so a tiny wrapper, memo, manifest, or evidence artifact cannot masquerade as a manuscript solely by filename.

