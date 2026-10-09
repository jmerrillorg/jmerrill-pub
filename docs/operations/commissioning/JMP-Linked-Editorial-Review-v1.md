# Linked Editorial Review v1

Owner: Publishing. Scope: existing Jackie-title internal commissioning runs.

## Entry and Exit

Entry requires the exact immutable completed intake receipt, current strict
Jackie author authority, current owner scope, and matching registered source
and retained-artifact versions and bytes. No live title stage is reset.

Editorial Review assesses only. It consumes the verbatim, hash-pinned review
canon and verified existing global knowledge. Existing approved title style,
voice, and ruling artifacts are reused when present; conflicting authorities
deny execution. Missing title context is explicit, not fabricated. This initial
assessment is not the seven-source authority bundle required for editing.

Exit is a validated nine-section assessment with eight 1-5 category scores,
exact source version/word count, suggested-only imprint context, an immutable
JSON receipt, and a readable Markdown artifact with independently verified hash.
The result is advisory and waits for publisher review. It grants no author
approval, imprint assignment, rights clearance, or downstream stage permission.

## Execution and Recovery

The existing commissioning intake timer dispatches review only after intake
completion and `JM1_TITLE_COMMISSIONING_REVIEW_ENABLED=true`. Its existing exact
title allowlist and owner bindings remain controlling. Broad stage and wait
workers stay disabled.

Review reuses the intake worker's CAS claims, bounded attempts, exponential
backoff, and expired-claim recovery in a separate stage namespace. Review leases
last 20 minutes; configured provider retry bounds exceeding 10 minutes deny the
call. The registered Foundry route and existing AI gate remain mandatory;
direct-provider or automatic fallback execution is prohibited.

Within an already-authorized commissioning scope, a composite Contact/profile
reference must resolve by exact IDs to the active canonical Jackie Contact and
active profile, including record versions. Conflicting lookup fields, unknown
text, inactive records, or failed reads deny execution. This does not change
the general authorship guard, alter identity records, or select a manuscript.
Composite proofs are retained in intake/review evidence and rechecked after
inference. Existing strict-contact receipts remain byte-compatible.
The authenticated `COMMISSIONING_IDENTITY_READ_ONLY` mode checks only the four
already identified commissioning title IDs. It returns metadata, creates no
scope/receipt, touches no storage, and dispatches nothing. PASS is identity
preflight, not enrollment, manuscript selection, or stage authorization.

The bound assessment prompt uses one 240-second provider request per worker
attempt, with no provider-level retries. Other prompt routes retain their
configured limits. Safe timeout/transport causes remain in the durable failure
record; raw provider errors and manuscript content do not. The existing five
worker attempts and same-execution backoff remain controlling.

The saved assessment precedes document publication. A document-write failure
recovers that saved assessment, preserving exact rendered bytes without another
model call. Create-only receipt/document persistence rejects conflicting replay.
Inference interrupted before persistence may be retried within the bounded
attempt budget; provider inference is not claimed to be exactly-once.

The existing intake failure alert also observes review failures. No scheduler,
agent, communications owner, or business pipeline is duplicated. Readback adds
an authenticated exact-title review mode; intake mode remains metadata-only.
Review mode exposes the internal assessment, never full source or canon text.

## Effects and Release

Allowed: private linked-run execution state and internal assessment artifacts.
Forbidden: source edits, author mail, payments, fulfillment, public release,
distribution, identifier registration, and live title stage changes.

Deploy through Diagnostic AI Runner CI/CD only after review and required checks.
Before enabling, verify the deployed SHA, native source/authority readback, and
that the existing allowlist contains only the accepted commissioning title.
Disable the review setting to stop new dispatch; preserve in-flight leases and
durable receipts. Disable intake too if containment requires stopping both.
Never delete records or release claims from chat to manufacture recovery.

Source tests and a merged release are not live commissioning. Acceptance needs
the natural scheduled review, durable assessment/document custody, repeat
readback with stable IDs/hashes, and no prohibited effects.
# Exact assessment output and repair recovery

The assessment route uses the nine-section JSON tool schema exported by its
owner contract, not the provider's generic object schema. Existing semantic,
source, identity and approval-boundary validation remains mandatory.

The reviewed `EDITORIAL_REVIEW_EXACT_TOOL_SCHEMA_V1` repair may recover a
`REVIEW_SECTIONS_INVALID` hold once through the normal scoped CAS worker. It
preserves the held preimage and execution identity, respects the existing
attempt limit, and does not recover permission, authority, identity or
substantive editorial holds. A second structural failure remains held.

The subsequent `EDITORIAL_REVIEW_OUTPUT_CUSTODY_V2` repair can recover that
specific previous repair hold once, still within the same five-attempt budget.
It provides private, create-only rejected-candidate custody outside publishable
review receipts and records only its exact reference in execution state.
Candidate bytes never appear in logs or publisher previews. Native readback
exposes the reference only. Replay compares exact bytes, never overwrites them.
Assessment output is bounded at 8,192 tokens; an explicit provider max-token
stop is rejected as truncation, never treated as a complete assessment.
