# Publishing Communication Acceptance v1.0

Authority: JMP-COMMUNICATION-CANON-REGRESSION-001-C1.

The single source is `lib/server/publishing-communication-acceptance.ts`, compiled
into both Function packages by the existing communications runtime builder.
The established renderer is unchanged.

Communication completion requires validated content, canonical rendering,
durable provider acceptance and verified Publishing mailbox-copy evidence.
Provider acceptance alone is not recipient delivery or service completion.
Mailbox-copy evidence proves receipt in Publishing's mailbox, not author delivery.

## Ownership And Trust

The ACS relay retains the immutable communication reservation and acceptance
evidence in its existing Azure Table store. The existing Publishing Function
managed identity reads the native Publishing mailbox through Microsoft Graph.
The relay calls that verifier using the already-governed machine credential;
no new identity, secret system or Graph grant is introduced. Callers cannot
submit evidence to mark a communication verified.

Native proof requires immutable Graph ID, Internet Message ID with the exact
ACS provider UUID token, canonical sender, exact recipients, subject and required
Publishing copy. Unknown Internet Message ID formats fail closed. The current
ACS format is established by native production evidence, not a promise that
all future provider formats will be identical. Subject/time heuristics are not
proof. Historical body parity remains an additional check, not identity.

## States And Recovery

CREATED, RENDERED, SUBMITTED, PROVIDER_ACCEPTED, MAILBOX_VERIFIED, FAILED and
DELIVERY_UNVERIFIED are defined once in the shared contract. Transport reservation
states remain private idempotency mechanics, not another completion contract.

The technical verification window is 30 minutes with checks at acceptance,
1, 2, 5, 10, 20 and 30 minutes. No existing mailbox-verification window was
defined in the parent packet. This bounded technical policy is not an author
delivery promise or business SLA. The existing durable Function timer processes
due records; no conversation heartbeat or human Outlook check is needed.

Missing evidence within the window remains pending. Expiry creates a durable
service exception and stops timed polling for that command. Native mailbox-copy
ingress or explicit verification can recover the SAME accepted command. Neither
expiry nor verification recovery authorizes another provider send.

## Evidence And Monitoring

The existing relay store retains communication ID, business object/event ID,
correlation ID, canonical recipient address identifier, template/version,
renderer/version, render digests, provider ID/time and native mailbox ID/time.
An address identifier is not falsely described as a Dataverse Contact GUID.
Message bodies are not duplicated in verification evidence.

Authenticated acceptance summary readback reports submitted, accepted, pending,
verified, unverified, provider failures and service exceptions for this contract
version. Timer health is durable. Material expiry/runtime failures emit named
telemetry markers. The bounded monitor reuses the existing Publishing payment
timer's scopes and governed operations action group. Normal eventual-consistency
pending states do not alert.

Historical transport-only records remain duplicate-suppression authority but
are not promoted to verified completion. There is no formatting-only resend.
Whole's onboarding recovery and lifecycle authority remain independently open.
