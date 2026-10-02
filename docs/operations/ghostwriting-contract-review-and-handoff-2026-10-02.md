# Ghostwriting contract review and handoff preparation

Packet: JMP-GHOSTWRITING-COMMISSIONING-001

Status: INACTIVE_REVIEW_DRAFT. Ghostwriting commissioning remains FAIL.

## Authority readback

The two current source-registry templates are JMP Publishing Agreement v1.3.1
(HYBRID) and JM Signature Publishing Agreement v1.0 (JM_SIGNATURE). Their full
DOCX text, tables, headers and footers were read. Their SHA-256 values match the
August 5 governed template register:

- Publishing: `6ee5fb05558b7af755749061034effaecfdccace96b9e9fb6af5b5e769468745`
- Signature: `c793e6e3f2950ed76138bc2a09bb4cf29dd345b148c807434d2de65dc266ff25`

No ghostwriting agreement is registered. The existing selector continues to
reject all five ghostwriting SKUs. The Signature legal template does not
reactivate the superseded Signature commercial package.

A fresh read-only catalog query confirmed SHORT $7,500, STANDARD $15,000,
EXTENDED $25,000, PREMIUM $35,000, and ANTHOLOGY quote-only. All five remain
active. No catalog, payment or agreement record was changed.

## Review artifacts and lineage

The existing founder terms matrix and checkpoint remain unchanged. New evidence
and five complete review documents are under:

`/Volumes/UsersExternal/Developer/evidence/JMP-GHOSTWRITING-COMMISSIONING-001/review-draft-2026-10-02/`

- Ghostwriting Services Agreement v0.1: 14 proposed clauses.
- Offer SOW v0.1: all five offers, scoped deliverables and proposed milestones.
- Anthology Addendum v0.1: six contributor, rights, credit and permission clauses.
- Clause Provenance v0.1: all 25 sections, source/version, adaptation rationale,
  new terms and founder/counsel decision codes.
- Decision Sheet v0.1: six founder decisions, five counsel topics and activation gates.

These are not active templates, signature documents or billing authority. New
revision allowances, interview allowances, milestone terms, liability terms and
other proposals are explicitly not established catalog policy. Copyright
assignment is proposed; blanket work-made-for-hire language is not imported.
Counsel must assess actual creation facts, signed rights chains, applicable law
and enforceability. The full source extraction, catalog readback, source hashes,
rendered page QA and test log accompany the drafts.

## Independent implementation

`src/agreement/ghostwritingCompletionPreparation.js` in the diagnostic Functions
project adds a non-effect preparation boundary and injectable canonical reader.
It does not register a route, reader, adapter, timer, queue, template or workflow.
There is no production activation in this change.

Preparation requires exact engagement/author/contact/title identity, one of the
five SKUs, approved and active terms with founder/legal references, executed
agreement/SOW bound to the terms version and hash, current governed manuscript,
attributable nonrevoked exact-version acceptance, bound rights/payment clearance,
and an explicit client path election. A Publishing election additionally needs
the existing intake owner's exact destination binding. Writing-only completion
rejects a Publishing destination.

Output is `PREPARED_NOT_EXECUTED`. Its semantic key binds source engagement and
acceptance decision; its canonical payload hash binds the complete request.
Serialization/replay tests preserve the result and reject altered replay. This
is not an atomic production journal, a cryptographic signature or proof of an
executing handoff. The function trusts only a future governed reader, not caller
supplied HTTP approval flags. The hash detects drift against durable stored
evidence; it does not authenticate an adversary who can replace both fields.

## Existing runtime integration point

Fresh source readback supersedes the old draft-only PR #909 checkpoint: #909 is
merged, with head `23a4b6005785e2b0e8f542513876ee0c9dcbea4f`; this branch starts
from main `88222fa5972cd90f1155eb4b8842b51b24b75872`. This is source evidence,
not proof that ghostwriting is deployed or commissioned.

The accepted manuscript must enter through the existing owner in
`lib/server/publishing-intake-manuscript-binding.ts`, then the canonical lifecycle
authority and `stageRuntimeProcessor.js` dispatch. Never impersonate a public
form or continuation-token holder. A new Publishing engagement retains normal
inquiry/intake eligibility; an existing engagement keeps its legitimate progress.
Ghostwriting completion does not authorize a stage transition or substitute for
the separate Publishing agreement. No second publishing pipeline is introduced.

After approval, the existing engagement/intake owners must supply a live reader,
atomic completion/outbox persistence, destination resolution and idempotent
consumption. Existing retry/wait/reconciliation controls must own recovery.
Production failure, restart, duplicate and both exit paths still need live proof.
This change deliberately does not invent unapproved source schema or billing
rules to make a synthetic end-to-end test pass.

## Validation and activation gates

All 2,695 Functions tests passed, including 14 new preparation/denial/replay
tests. Existing production template selection remains unchanged.

Activation requires, in order:

1. Jackie accepts or revises the six proposed business choices; counsel approves
   the legal terms, contributor instruments and writer rights chain.
2. Freeze approved version, scope, effective date, hashes and approval records.
3. Separately register the approved template/SOW in the agreement owner with
   safe selection and assembly tests; no reuse of HYBRID as a ghostwriting alias.
4. Commission the live reader, existing-owner handoff, durable persistence,
   retries and readback under normal review/deployment controls.
5. For each client, obtain executed terms, exact-version acceptance, required
   permissions, payment clearance and the actual path election.

No production mutation, signature dispatch, invoice, author communication,
workspace move or stage advancement occurred in this drafting packet.
