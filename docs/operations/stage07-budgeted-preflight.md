# Stage 07 Five Title Budget Preflight

Status: preparation only. No paid dispatch is enabled by these modules.

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

This module is not yet the complete paid execution adapter. Activation requires
verified tariff, pinned model/version readback, exact request token counting,
maximum billed output enforcement, response receipt persistence, and complete
source/owner checks. No local evidence directory may be an operational runtime
dependency. No provider retry or fallback may occur outside this shared ledger.

`stage07BudgetedAttempt` implements the single-attempt reserve/receipt/settle
contract with injected owner dependencies. It rejects changed model/version,
unverified tariff/source, hidden retries and fallback. It persists the response
before settlement; a missing receipt or usage report keeps the full reservation.
Its tests prove recovery without a second dispatch. Binding those dependencies
to the live owner is still required; this module does not expose a paid endpoint.

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

The `JMP-STAGE07-BUDGETED-V1` provider route uses 8,192 maximum output tokens and
zero hidden retries. It must remain on the approved deployment/model/version;
source content cannot switch tool selection by embedding another task marker.
Output truncation, malformed structured output, missing coverage and unchanged
fallback text are not successful editorial completion.

## Preserved gates

Intentional Leader components have separate plans, packages and receipts.
Establishing Glory is not split. Chad and Me may not acquire invented scenes,
quotes, memories, chronology, outcomes or facts. Every package retains author
voice and separates author questions from internal rights or production notes.
No source, Stage06 receipt, folder, agreement, payment, signature or author
communication is changed by preflight. Model spend remains disabled until every
preflight requirement is established; a passing unit test is not live acceptance.
