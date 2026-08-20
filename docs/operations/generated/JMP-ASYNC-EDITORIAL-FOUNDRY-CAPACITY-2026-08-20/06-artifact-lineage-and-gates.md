# Artifact Lineage and Gates

Last Verified: 2026-08-20

The worker pins:

- source artifact ID;
- source checksum;
- prompt version;
- manual canon version;
- provider;
- deployment;
- model;
- chunk plan version.

The worker does not mark an author review gate ready until all chunks complete, ordered aggregation succeeds, QA passes, and artifact certification is recorded.

`nextStageAuthorized` remains `false` after Line certification.

No Copy stage is created by this worker.

