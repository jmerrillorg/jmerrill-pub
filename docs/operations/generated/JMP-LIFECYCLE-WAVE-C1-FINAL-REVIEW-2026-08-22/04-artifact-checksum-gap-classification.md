# Artifact Checksum Gap Classification

Classifications: CHECKSUM_FIELD_MISSING, CHECKSUM_NOT_POPULATED, SAFE_EVIDENCE_PERSISTENCE_REQUIRES_SEPARATE_AUTHORIZATION, PROSPECTIVE_CHECKSUM_REQUIRED, LEGACY_CHECKSUM_UNAVAILABLE for inaccessible or unverified legacy bytes.

Historical remediation candidate: accessible legacy files where bytes can be read safely and hashed deterministically.

Prospective authority: every new lifecycle-critical artifact should register checksum/provenance at creation.
