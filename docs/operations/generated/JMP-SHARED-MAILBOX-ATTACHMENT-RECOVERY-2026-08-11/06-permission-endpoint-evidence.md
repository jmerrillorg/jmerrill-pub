# Permission and Endpoint Evidence

Last verified: 2026-08-11T12:00:30Z

Reusable runtime probe:

```json
{
  "ok": false,
  "code": "PUBLISHING_MAILBOX_READ_BLOCKED",
  "reason": "GRAPH_ATTACHMENT_METADATA_READ_FAILED",
  "httpStatus": 403,
  "sourceMailbox": "publishing@jmerrill.one",
  "sourceMessageIdMatches": true,
  "attachmentCount": 0,
  "attachments": []
}
```

Outlook connector probe:

```text
HTTPError: 404: Item '<shared-message-id>' doesn't belong to the targeted mailbox 'a9ed4c6d-388f-4642-9366-97724c219670'.
```

Interpretation:

- The reusable Graph endpoint pattern is now implemented.
- The current local credential path cannot read the shared mailbox attachment metadata.
- The generic Outlook attachment connector is not shared-mailbox aware for attachment listing/fetching.
- No attachment bytes were retrieved.

