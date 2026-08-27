# Reminder State Machine

Last verified: 2026-08-27T10:30:00Z

Implementation:

- `scripts/stripe_connect_reminder_cadence.mjs`
- `scripts/stripe_connect_post_remediation_closure.mjs`

Flow:

`CURRENT_STRIPE_STATE -> REMINDER_ELIGIBILITY -> CADENCE_ELAPSED -> ACTIVE_SUPPORT -> SEND / NO_SEND`

Reminder-eligible states:

- `NOT_STARTED`
- `SETUP_LINK_READY`
- `SETUP_IN_PROGRESS`
- `MORE_INFORMATION_NEEDED`

Stop/pause states:

- `SETUP_COMPLETE`
- `UNDER_REVIEW`
- `IDENTITY_REVIEW`
- `DUPLICATE_REVIEW`
- `EXTERNAL_BLOCK`
- `ACTIVE_SUPPORT`
- reminder suppression

After `FINAL_REMINDER`, disposition becomes `AUTOMATION_COMPLETE`.

