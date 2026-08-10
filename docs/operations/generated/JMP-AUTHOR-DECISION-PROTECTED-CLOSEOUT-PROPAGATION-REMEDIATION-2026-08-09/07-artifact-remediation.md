# Artifact Remediation

Last verified: 2026-08-10T02:46:15Z

The durable rule is implemented:

Governed review package identifies artifact plus author decision is APPROVED plus artifact identity is unambiguous equals approved artifact becomes available to protected closeout evidence.

Required artifact evidence:

| Evidence | Required |
| --- | --- |
| Artifact ID | YES |
| Governed location | YES |
| Checksum | YES |
| Review/package correlation | YES |
| Decision correlation | YES |
| Approval timestamp | YES |

The engine fails closed on no candidate artifact, multiple candidate artifacts, missing governed location, missing checksum, or checksum mismatch.

