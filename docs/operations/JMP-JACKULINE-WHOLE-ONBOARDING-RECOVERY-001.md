# Whole Onboarding Service Recovery

Packet: JMP-JACKULINE-WHOLE-ONBOARDING-RECOVERY-001

## Proven Failure

Production web logs show `jm1pub_submissions` reads failing with HTTP 403 for
the web managed-identity application user. The broad portal context resolver
converted that supplemental failure into a fallback context without the
author/title relationship. The onboarding route rejected the request before
submission ingestion. Contact, title primary-author lookup, and active author
profile independently establish the relationship.

Quoted iPhone reply history also contaminated inbound service intent extraction.
The prior system's own advice about a different email was misclassified as a
new author contact-change request.

## Bounded Repair

- Verify immutable contact/title relationship independently of portal projections.
- Preserve authenticated partial answer receipts separately from completed forms.
- Give different answer sets distinct immutable submission identities; replay the
  same answers idempotently.
- Strip quoted reply headers before deciding service intent.
- Recover failed onboarding through the existing persistent inbound service and
  ACS relay. Preserve prior communications and deny duplicate recovery sends.
- Keep the recovery waiting state publisher-owned, not author-owned.
- Scope submission privileges to the existing web managed identity. Do not modify
  shared roles or add System Administrator. The role provisioning script defaults
  to read-only planning and checks platform defaults against authority already held.

## Truth and Outstanding Gates

Three original inbound service messages were preserved. At diagnosis time, no
Whole onboarding answers were found in the queried submission storage or bounded
title workspace inventory. Logs prove rejection before persistence. This repair
does not reconstruct answers that were never saved, invent preferences, or assert
zero historical data loss.

The recovery response must not claim saved answers or stage advancement without
evidence. No author retry, duplicate profile/title/workspace, financial effect,
editorial decision, or Phase 7 activation is authorized by these changes.

Current engagement/lifecycle readback, true business completeness, historical
answer recovery, deployment readback, and actual mailbox-copy verification remain
separate acceptance gates. A passing fixture or a sent acknowledgment does not
close the whole recovery packet.

## Evidence

Restricted host evidence is under
`/Volumes/UsersExternal/Developer/evidence/JMP-JACKULINE-WHOLE-ONBOARDING-RECOVERY-001`.
Do not commit raw mailbox messages, author answers, tokens, or runtime logs.
