# Clocks, Communications, and System-of-Record Boundaries

Last verified: 2026-08-26

## Clocks and Watchdogs

Active clocks: 14

- Intake SLA
- Editorial response SLA
- Editorial cadence
- Cadence release timer
- Production watchdog
- Release readiness watchdog
- Distribution watchdog
- Marketing watchdog
- Royalty reporting clock
- Royalty payment clock
- Annual distribution fee clock
- Contract milestone clock
- Distribution health clock
- Title review clock

## Communications Authority

| Field | Authority |
|---|---|
| Author-facing sender | `publishing@email.jmerrill.one` |
| Reply-To | `publishing@jmerrill.one` |
| CC | `publishing@jmerrill.one` |
| Format | HTML |

Denied:

- Wrong Publishing sender
- NoReply sender
- Plain-text-only author send
- Wrong author/title binding
- Royalty payment response automation

Allowed:

- Stripe Connect setup emails

## System-of-Record Boundaries

No competing SOR was found in the closure probe. Dataverse, Dynamics 365 Sales, Dynamics 365 Customer Service, Business Central, Stripe, Stripe Connect, Microsoft 365, SharePoint/Graph, external distributors, and marketing platforms each retain bounded authority.
