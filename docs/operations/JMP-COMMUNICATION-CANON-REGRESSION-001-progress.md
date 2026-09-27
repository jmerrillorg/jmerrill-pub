# Publishing Communication Canon Regression - Bounded Repair

Packet: JMP-COMMUNICATION-CANON-REGRESSION-001
Related: JMP-JACKULINE-WHOLE-ONBOARDING-RECOVERY-002 and JMP-JACKULINE-WHOLE-LIFECYCLE-RECOVERY-003
Recorded: 2026-09-27 UTC
Status: IN_PROGRESS. This is not a production closure certificate.

## Historical Authority

The September 26 recovery communication to Jackuline had substantively correct
content and successful delivery, but failed presentation canon. No formatting-only
resend is authorized or initiated. The original communication remains historical
evidence; renderer version changes do not justify a duplicate communication.

The durable original event was inbound_message_event_6cfaba64b1357ce7e90affb62c398dac.
Provider message: 0f268303-3724-493f-875e-4a1c83f9c100.
Dataverse communication: 44087444-13ba-f111-aaac-7c1e525b15c2.
Actual send: 2026-09-27T01:32:27.804Z.

## Root Cause

The persistent inbound service supplied correspondence text to a relay helper
that constructed paragraph-only HTML. It bypassed the enterprise renderer used
by branded editorial communications. ACS accepted HTML and text; transport success
did not prove presentation correctness. This was a producer/renderer bypass, not
a reason to regenerate editorial artifacts or resend Jackuline's message.

## Source Repair

Canonical source: lib/server/jm1-enterprise-communication-renderer.ts, version 1.0.1.
Function packages consume generated CommonJS builds of that exact TypeScript
source and its design tokens. Source/runtime checksums prevent independent drift.
Regenerate with node scripts/build_publishing_communication_runtime.mjs.

Service content passes through the shared renderer before command preparation.
The relay verifies rendered service metadata and content hashes and fails closed
on rendering failure. Other routine author-response producers are canonically
projected at the relay rather than retaining caller HTML. Existing certified
editorial/package validators remain in place. Payment-election and onboarding
templates supply content to the same renderer, not independent layouts.

OTP, first-payment, and Stripe Connect invitation producers now use the canonical
renderer. Inquiry and agreement relay builders also use it. Access-code messages
have a narrowly scoped allowance to name the author account without an editorial
portal CTA. Editorial reply-only restrictions remain enforced.

## Source Send-Path Census

This census describes inspected source, not unverified production commissioning.

| Producer/class | Rendering/transport authority | Remaining proof |
| --- | --- | --- |
| Inquiry/intake acknowledgment | Shared renderer / ACS acknowledgment route | Production readback |
| Onboarding invitation | Registry content / shared renderer / enterprise relay | Production readback |
| OTP/access | Shared renderer / approved-response relay | Production readback |
| Agreement package | Shared renderer / agreement relay | Production readback/version persistence |
| Payment election | Registry content / shared renderer / enterprise relay | Production readback |
| First-payment communication | Shared renderer / approved-response relay | Production readback |
| Observed/additional payment service | Existing canonical renderer / approved-response relay | Historical/runtime census |
| Stripe Connect invitation | Shared renderer / approved-response relay | Production readback |
| Stripe Connect reminders | Approved-response relay canonical projection | Producer/version readback |
| Inbound service/exception recovery | Shared renderer in producer and relay | Production readback |
| Editorial cadence / package dispatch | Existing canonical renderer and semantic package gates | Production census by stage |
| Atta title decision sender | Approved-response relay | Runtime census |
| Legacy Publishing orchestrator | Approved-response relay | Determine current production reachability |
| Direct package notification | Existing canonical render validator / ACS SDK | Runtime reachability/readback |
| Operating-center/internal notifications | Internal-only diagnostic messages | Confirm recipient containment |
| Form integration Graph notification | Internal/shared notification fallback | Verify configuration/recipient authority |

Do not infer that an unused stage has an active commissioned send capability.
Do not claim zero raw author paths until the full runtime census and containment
checks, including legacy and internal fallback paths, are complete.

## Regression Controls

Six golden hash fixtures cover recovery, developmental delivery, payment,
informational, CTA, and no-CTA messages. Tests check header, layout, signature,
footer, multipart hashes, and deterministic output. Function package tests verify
compiled renderer source authority. Relay and web guards run without live sends.
Presentation monitoring is deployment/test-owned, not a recurring Cody task.

## Whole Lifecycle Evidence Readback

Local delegated Graph and legacy application reads returned access denied. The
absence of an editorial response in durable ingestion storage is not proof that
no response exists in the mailbox. A bounded read-only endpoint uses the existing
commissioned Function identity and existing diagnostic authentication to read
author/title records and mailbox correspondence. It requires exact immutable
contact/title binding, a maximum 90-day window, canonical Graph origin/mailbox
pagination, and explicit opt-in for bounded native HTML evidence.

It cannot send, patch Dataverse, transition a stage, create an onboarding record,
or move a workspace. Its production render fixture has zero effects. A rendering
fixture alone does not prove provider acceptance or human-readable delivery.
Private mailbox evidence must not be committed to source.

Whole's delivered Developmental work must not be reversed because a Stage 06
projection is stale. No author approval is inferred. Onboarding reconstruction,
fresh correspondence readback, lifecycle projection repair, and any justified
system-owned follow-up remain separate open work under the related packets.

## Remaining Closure Gates

1. Merge/deploy the bounded repair and independently read runtime authority.
2. Obtain fresh mailbox/attachment and native presentation evidence.
3. Complete historical and production send-path census/containment.
4. Prove safe internal provider acceptance and delivery, without active-author tests.
5. Finish render-version persistence and full success-contract/read-model checks.
6. Complete Whole field reconstruction and lifecycle recovery from proven evidence.

No financial, agreement, editorial decision, or lifecycle mutation is authorized
merely to fix presentation. Phase 7 remains held. Protected original workspaces
remain untouched. Do not treat this progress packet as final closure.
