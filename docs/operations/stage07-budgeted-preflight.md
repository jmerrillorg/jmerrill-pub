# Stage 07 Five Title Budget Preflight

Status: implementation awaiting protected release and live preflight. No paid
dispatch is enabled by default. A source test is not live acceptance.

The Publisher authorized at most USD50 total for the five fresh Jackie titles
and six accepted source components, including failed billable requests and no
more than twelve additional attempts. This is not the former Stage03 budget.
Stage08 remains closed. The existing title scope and source/version authority
must be checked by the owning runtime before any paid execution.

## Durable spending boundary

`stage07BatchBudget` uses one private blob and ETag compare-and-swap for the whole
batch. A plan-hash-bound task allowlist prevents inventing new normal tasks to
evade the retry limit. Reserve the maximum possible billed amount before a
provider request. Concurrent reserved amounts count toward the same USD50 cap.
An existing attempt never authorizes dispatch again, including after restart.
Unknown outcomes retain their entire reservation without expiry. Settle only
against a durable provider usage receipt; billable failure is still spending.
An unexpected overage is retained as fact and freezes subsequent dispatch.

The `newSubmissionStage07` adapter binds the existing commissioning endpoint.
Activation requires
verified tariff, pinned model/version readback, exact request token counting,
maximum billed output enforcement, response receipt persistence, and complete
source/owner checks. No local evidence directory may be an operational runtime
dependency. No provider retry or fallback may occur outside this shared ledger.

`stage07BudgetedAttempt` implements the single-attempt reserve/receipt/settle
contract with injected owner dependencies. It rejects changed model/version,
unverified tariff/source, hidden retries and fallback. It persists the response
before settlement; a missing receipt or usage report keeps the full reservation.
Its tests prove recovery without a second dispatch. The owning adapter verifies
the exact accepted Stage06 sources and current Stage07 folder projection, reads
the actual registered model before each attempt, counts the complete provider
request and persists results in the existing private runtime container.
The separate Stage07 flag and approval hash must match the reviewed six-source
policy. Broad stage, review and wait workers must remain disabled.

## Complete source and hierarchical review

The deterministic coverage plan owns every non-whitespace source span exactly
once. Paragraphs remain intact; a paragraph longer than the target is flagged,
never silently split. Editing target is 900 words, with up to 200 read-only
context words on either side. Context is excluded from assembled output.

Planning uses contiguous paragraph-preserving sections targeted at 6,000 words.
Every complete rendered request must fit 32,000 counted input tokens including
its instructions, tool schema, and safety allowance. Repartition an oversized
section before dispatch. All section ledgers then feed a complete component
brief. If that synthesis exceeds its bound, use another explicit ledger level;
do not discard sections. The edited component receives the corresponding
full-coverage section review and complete component-level consistency synthesis.
Recount the actual edited text and generated ledgers before dependent calls.
The 100,000-token/minute live deployment quota is distinct from model context
capacity; pacing must include input plus output reservations across consumers.

The `JMP-STAGE07-BUDGETED-V1` provider route uses 8,192 maximum editing output tokens,
2,048 maximum planning/review output tokens and
zero hidden retries. It must remain on the approved deployment/model/version;
source content cannot switch tool selection by embedding another task marker.
Output truncation, malformed structured output, missing coverage and unchanged
fallback text are not successful editorial completion.

Consistency sections target 3,000 words and include the complete corresponding
original and proposed text. Groups of at most eight complete child ledgers form
the explicit planning and consistency hierarchy. All 987 current normal task
IDs are plan-bound, not an inference-call quota. Capacity reservations share the
budget serialization point and pace at 80,000 tokens per minute, below the
registered quota; unrelated deployment consumers are not granted capacity here.

Package assembly is non-inference work. It requires every validated task, no
blocking consistency findings, exact source hashes and complete paragraph
coverage. Proposed Word and tracked-change review files retain the source ZIP
parts; fields/links that cannot safely be rewritten hold rather than lose
semantics. Memo, questions and coverage/receipt records remain component-scoped.
Deterministic private files and a write-once manifest support partial-write
recovery. Package status stays DOCUMENT_RENDERING_REVIEW_REQUIRED until actual
rendering and editorial acceptance; the adapter never advances Stage08.

## Preserved gates

Intentional Leader components have separate plans, packages and receipts.
Establishing Glory is not split. Chad and Me may not acquire invented scenes,
quotes, memories, chronology, outcomes or facts. Every package retains author
voice and separates author questions from internal rights or production notes.
No source, Stage06 receipt, folder, agreement, payment, signature or author
communication is changed by preflight. Model spend remains disabled until every
preflight requirement is established; a passing unit test is not live acceptance.
