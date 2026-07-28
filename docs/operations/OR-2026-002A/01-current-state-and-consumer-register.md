# OR-2026-002A Current State and Consumer Register

Date: 2026-07-28
Mode: read-only planning

## Metadata Sources

Repository: `jmerrill-pub`
Branch: `codex/or-2026-002a-secret-safe-reexecution` from `origin/main` at `f3f2a9fc96627fc23327e58b7eddbe6f50365a93`
Power Platform environment: JM1-Core (`https://jm1hq.crm.dynamics.com/`)
Key Vault inspected by metadata only: `jm1-core-vault`

No secret values were retrieved or printed for routine inspection.

## Secret Inventory

| System | Identifier | Status | Notes |
|---|---|---:|---|
| Azure Key Vault | `PRECOA-CALENDAR-FEED-URL` | Enabled | Created/updated 2026-07-28T13:10:41Z. Value not retrieved. |
| Dataverse environment variables | Precoa-named definitions | Not found | No `Precoa`/`precoa` schema or display-name match in JM1-Core environment-variable definitions. |
| App Service staging settings | Precoa-named app settings | Not found | No Precoa-named app setting on `app-jm1-pub-prod` staging slot. |

## Power Automate Consumers

| Flow | Workflow ID | State | Status | Precoa endpoint placement | Active classification |
|---|---|---:|---:|---|---|
| Precoa to Scheduling Calendar | `620f6a7a-2d8f-f011-b4cb-000d3a56db9f` | 0 | 1 | HTTP action `inputs.uri`, plaintext; secure inputs false; secure outputs false | Active/historical status requires Jackie validation of state-code semantics before cutover, but the flow is the primary plaintext-risk consumer. |
| JM1 - PreNeed Calendar Feed Sync | `ac92147f-ba27-f111-8341-00224820105b` | 1 | 2 | Definition parameter default `PN_FEED_URL (jm1fin_PN_FEED_URL)`, plaintext | Candidate newer consumer, currently inactive/disabled by metadata. |
| JM1 - PreNeed Calendar Outbound Writer | `103af4c9-65c1-f011-bbd2-7ced8dcbc0ff` | 0 | 1 | No Precoa endpoint found | Downstream/outbound writer candidate. |
| EndOfYear_Preneed_Followup_2025 | `1bec9d34-c8b9-f011-bbd3-7ced8d1cd64f` | 1 | 2 | No Precoa endpoint found | Related PreNeed automation; not a feed consumer in this scan. |
| Preneed_Reply_Detection_2025 | `3b641b91-4fba-f011-bbd3-7ced8d1cd64f` | 1 | 2 | No Precoa endpoint found | Related PreNeed automation; not a feed consumer in this scan. |

## Architecture Finding

Current secure posture is incomplete because at least one Power Automate definition contains the endpoint as plaintext flow configuration. Key Vault now has a governed secret name, but no inspected active consumer is yet reading the value from Key Vault through a secure service boundary.

No production behavior was changed during this inspection.
