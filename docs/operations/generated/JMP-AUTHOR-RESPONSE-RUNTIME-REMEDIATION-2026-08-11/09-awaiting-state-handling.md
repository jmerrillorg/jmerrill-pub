# Awaiting State Handling

Last verified: 2026-08-11T11:18:00Z

When a valid correlated response is captured, the runtime closes only the matching response wait by patching the matched approval gate with `jm1pub_awaitingsince: null`.

| State | Result |
| --- | --- |
| Matching awaiting-response state | CLOSED |
| Unrelated awaiting states | UNCHANGED |
| Duplicate inbound retry | IDEMPOTENT / NO REOPEN |
| Production stage | UNCHANGED unless separately authorized |

