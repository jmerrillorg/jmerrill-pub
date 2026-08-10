# Checksum Registration

Last verified: 2026-08-10T02:46:15Z

Checksum handling is exact-artifact based.

The remediation requires the artifact evidence record to carry the deterministic SHA-256 checksum before protected closeout can pass. It does not hash filenames, infer from page count, or accept near-match artifacts.

For The Intentional Leader shadow replay:

| Field | Value |
| --- | --- |
| Approved artifact | intentional-leader-final-pagination-corrected-proof-2026-08-03-v1 |
| Required checksum | 0138d7a474cc4ab2d8369b4ae0642842d8bdbd041ec9029347b15daf051975ed |
| Checksum result | PRESENT / MATCH |

