# Atta Approved Tail Owner Invocation

Packet: JMP-ATTA-PROVIDER-SAFE-TAIL-ADJUSTMENT-001.
Approval: JM1-VERTICAL-OPERATING-COMMISSIONING-001, existing Founder-approved
exact plan. No new financial policy or second billing runtime.

## Release and invocation boundary

This is a bounded addition inside the existing Publishing payment owner. The
default-off `/api/author/stripe/payment/approved-tail` route requires the existing
payment-recovery key and `JMP_ATTA_APPROVED_TAIL_ENABLED=true`. It accepts only
`{"packet":"JMP-ATTA-PROVIDER-SAFE-TAIL-ADJUSTMENT-001","action":"EXECUTE_APPROVED_PLAN"}`.
No caller-supplied agreement, amount, credential, provider path, payload, price,
source hash, callback or recovery override is accepted.

GET performs a read-only source check and nonpersistent invoice preview. POST
uses the already deployed `executeGovernedScheduleMutation` and shared durable
agreement guard, then repeats complete preflight inside the claim. The runtime
uses only its existing managed identity and configured Stripe key. No new grant,
identity, schema, invoice, card charge, refund or correspondence path is added.

Before enablement require normal exact-head review/deployment, correct live SHA,
the independent guard acceptance record, and unchanged Founder authority.
Disable the bounded route after acceptance or any failure. Do not broaden the
key or identity when the provider or Dataverse denies access.

## Source and calculation binding

`atta-approved-tail-authority.json` contains hashes, not customer/card secrets.
The hashes bind the existing approved evidence snapshot at
`JMP-ATTA-PROVIDER-SAFE-TAIL-ADJUSTMENT-001/2026-10-03T02-45-30-444Z` and the
Founder instruction hash. It is not an editable public policy input.

Fresh complete collection reads cover the agreement, eight requirements,
financial evidence, customer, expanded subscription/schedule, all subscriptions
and schedules, invoices, PaymentIntents, charges/refund indicators, invoice
items, balance transactions, tax IDs and per-invoice credit notes. Pagination
is bounded and fail-closed. Compare all financial/configuration fields; ignore
only OData transport annotations and expiring receipt/document URLs. Guard
records and this exact operation's two deterministic audit rows are not money.
Other financial/audit observations remain included and cause changed preflight.

The exact pinned 2019-10-17 request, key, phase dates, price IDs, quantity one,
send-invoice terms and no-proration behavior remain the approved package values.
The four regular 25,988-cent invoices plus final 25,983 cents total 129,935.
October remains due October 27; final schedule end is March 20, 2027.

An immutable intent stores the approved payload/key, preimages, source hashes
and read receipts before the Stripe write. A second source read immediately
before the write must remain unchanged. Independent post-provider reads must
show only the approved phase/proration changes and no extra financial object.
Refresh the October preview again.

The atomic Dataverse changeset appends one deterministic result audit and uses
ETags to cap February to 25,983, mark March CANCELLED (not paid), and update
the derived agreement balance version. The existing model hashes obligation
amount/status; leaving that version unchanged would be inconsistent. The
balance, October pointer, past payments and all other requirement fields remain
unchanged. The audit records the previous and resulting model version and the
confirmed additional-principal reason. Exact post-write snapshot hashes and
five-obligation cents conservation must pass.

## Failure and recovery

There is no automatic provider retry, automatic claim expiration or rollback
to the oversized tail. A timeout or ambiguous result leaves the shared claim
blocking. Inspect exact provider state and durable audit first. Never resend
because an HTTP response was lost. The Stripe key may be pruned after 24 hours;
durable intent and actual provider state govern recovery.

Provider success / projection failure must be recovered forward by the existing
financial owner under exact claim, quiescence and readback evidence. The bounded
HTTP route deliberately exposes no generic recovery or force-release action.
The existing guard recovery API requires the owner's verified evidence. A
separate reviewed recovery invocation is needed if this failure actually occurs;
do not restore the old schedule or use a broader local credential.

On complete replay, read the deterministic audit and revalidate live financial
state before returning ALREADY_APPLIED. Do not call Stripe write or append
another financial audit. A later legitimate financial change causes a held
readback, not permission to overwrite that change.

## Validation and residual limits

Non-live integration tests exercise the actual orchestration wrapper/shared
guard with deterministic owner adapters; mocks are not provider commissioning.
Tests cover cents/request identity, default-off/authentication, no free-form
request surface, drift rejection, exact replay, and failure after provider
effect. Full payment regression, typecheck, build and normal PR CI are required.

The existing Stripe key cannot read account-wide tax registrations. Subscription,
phase/customer tax state and invoice previews are bound; this is not certification
of an account-wide tax policy. Shared JM1 guards do not block external Stripe
settlement or provider operators. Fresh before/after reads remain mandatory.

References: https://docs.stripe.com/api/subscription_schedules/update and
https://docs.stripe.com/api/idempotent_requests.
