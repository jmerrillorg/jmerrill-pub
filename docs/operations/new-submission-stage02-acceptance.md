# Five-original Stage 02 acceptance

Stage 01 remains immutable. `SUBMISSION_02_PREFLIGHT`, `SUBMISSION_02_EXECUTE` and `SUBMISSION_02_READBACK` share the protected source-registration entry. Caller-supplied source, author, policy, approval and delivery claims are rejected. Execution requires `JM1_NEW_SUBMISSION_STAGE02_ENABLED=true` and the exact title allowlist; broad editorial/stage/wait workers must remain false.

The controlling requirement is `EDITORIAL_SYSTEM_STAGE_CONTRACTS['02_INTAKE']`: `PUBLISHING.INTAKE_NORMALIZATION`, original author submission to QA-passed `EDITORIAL_WORKING_SOURCE`, source lineage, checksum/version and governed SharePoint persistence. The adapter creates lossless separate working files beside the preserved original folder and a normalized provenance manifest. It does not edit manuscript substance, concatenate components, infer component order, import historical completion or create an approval.

Each source must match the exact completed ordinary Stage 01 receipt and current author/source authority. Working copies use create-only deterministic paths, independent byte readback and exact ETag/path verification. Existing lease/CAS/backoff execution ownership handles retry and expired claims. Replay returns the completed receipt only after revalidating SharePoint custody. Conflicts remain held; no overwrite or duplicate send is permitted.

The five supplied sources do not require an additional author submission. The canonical Stage 02 contract has no author approval requirement; this path sends no Stage 01 acknowledgment and invents no redundant Stage 02 request. A genuinely absent/unusable source is held, not treated as accepted. Any subsequently necessary author-input request must use the existing canonical communication/response owner with exact source/request/delivery binding.

Stage 03 remains NOT_STARTED. This bounded acceptance produces working-source artifacts and durable execution receipts, not activation of the broad 16-stage worker or inherited V2 lifecycle history. A multi-component source remains a collection; editorial assembly/order authority must be resolved before any subsequent component-order-dependent execution.
