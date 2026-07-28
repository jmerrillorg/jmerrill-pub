# OR-2026-002A Secure Consumption Architecture

## Recommendation

Use a small server-side secure-consumption boundary instead of allowing Power Automate to hold or call the credential-bearing Precoa feed URL directly.

Preferred target:

Power Automate recurrence
-> managed server endpoint or Azure Function
-> managed identity reads `PRECOA-CALENDAR-FEED-URL` from `jm1-core-vault`
-> server fetches Precoa calendar feed
-> server returns sanitized calendar payload or writes normalized rows
-> Dataverse records carry only operational scheduling data and execution correlation

## Rationale

This keeps the credential-bearing feed endpoint out of:

- Power Automate action definitions;
- run-history inputs and outputs;
- Dataverse environment variable plaintext defaults;
- exported solution packages;
- repository evidence;
- browser/client surfaces.

## Required Controls

- Key Vault secret remains enabled and governed by RBAC.
- Runtime uses managed identity or another approved non-user credential.
- No feed value in source, app settings, Dataverse, Power Automate defaults, logs, or evidence.
- Secure inputs/outputs enabled for any Power Automate action that may carry sensitive request metadata.
- Flow run records contain correlation IDs and counts only, not raw feed contents.
- Retry is bounded and idempotent.
- Failure path records non-sensitive operational status and does not expose the endpoint.

## Existing Consumer Treatment

| Consumer | Treatment |
|---|---|
| `Precoa to Scheduling Calendar` | Replace direct HTTP-to-feed action with call to secure server boundary; remove plaintext URI from definition during authorized remediation. |
| `JM1 - PreNeed Calendar Feed Sync` | Remove plaintext parameter default before activation; repoint to secure boundary if this becomes the canonical sync flow. |
| `JM1 - PreNeed Calendar Outbound Writer` | Keep endpoint-free. Validate downstream records do not contain feed credentials. |

## Non-Goals

This planning package does not authorize production flow edits, secret rotation, consumer repointing, API deployment, permission changes, or run-history deletion.
