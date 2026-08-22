# 06 - Artifact Contract

The registry defines lifecycle-level artifact expectations without implementing missing artifact producers.

Canonical lineage:

ORIGINAL_AUTHOR_SUBMISSION -> EDITORIAL_WORKING_SOURCE -> EDITORIAL_REVIEW_SOURCE -> DEVELOPMENTAL_ARTIFACT -> APPROVED_DEVELOPMENTAL_ARTIFACT -> LINE_ARTIFACT -> APPROVED_LINE_ARTIFACT -> COPY_ARTIFACT -> APPROVED_COPY_ARTIFACT -> LAYOUT_ARTIFACT -> PROOF_ARTIFACT -> FINAL_INTERIOR -> DISTRIBUTION_ARTIFACT.

Transition validation rejects:

- Line when required approved Developmental artifact is missing;
- Proof when Layout artifact is missing;
- Distribution when distribution artifact is missing;
- author approval when artifact id/checksum do not match.

The lifecycle contract forbids relying only on "latest file" where exact artifact identity is required.
