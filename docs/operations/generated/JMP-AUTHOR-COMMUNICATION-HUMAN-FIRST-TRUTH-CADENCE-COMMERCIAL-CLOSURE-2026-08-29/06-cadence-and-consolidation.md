# Cadence And Consolidation

Last Verified: 2026-08-29T12:04:54Z

Minimum author-facing rhythm:

- Non-emergency related author-facing sends are held for at least 24 hours after the last author-facing send.
- Immediate exceptions are allowed for security/access recovery, time-sensitive authorization, material correction, payment/account action, and deadline author decisions.

Jackuline disposition:

- Three messages were generated within hours.
- The corrected model would consolidate/supersede intermediate messages where possible.
- No fourth message is sent solely to correct formatting/pricing because the next legitimate interaction can carry the commercial detail without creating another avoidable burst.

Implemented in:

- `evaluateCadence`
- `resolveSupersession`

Evidence Source: cadence tests in `authorCommunicationPreflight.test.js`.
