# Precoa Dataverse Outlook Calendar Sync Repair Report

Date: 2026-08-05
Environment: JM1-Core
Target mailbox: scheduling@jmerrill.one
Classification: COMPLETE

## Root Cause

FLOW_B_PARTIAL_LOOP_TERMINATION and FLOW_B_STALE_OUTLOOK_EVENT_ID.

The active Dataverse-to-Outlook writer processed cancelled rows before active rows. A cancelled-row cleanup action attempted to delete stale admin-calendar Outlook event IDs through the corrected scheduling-calendar connection. The scheduling calendar correctly returned NotFound for those old admin IDs. Because the active appointment loop depended on the cancelled cleanup loop succeeding, the active loop was skipped and valid Precoa appointments remained active in Dataverse without Outlook event IDs.

Some appointments appeared because they already had usable scheduling-calendar IDs, or were written before the cancelled cleanup started failing. Others did not appear because the active writer never reached them.

## Production Correction

Flow: JM1 - Appointment to Outlook Sync
Workflow ID: 98c97488-1e2a-f111-8342-7c1e525b15c2

Applied changes:

- Active appointment loop now runs after the active Dataverse row list succeeds.
- Active appointment loop no longer depends on cancelled cleanup success.
- Cancelled cleanup now targets only scheduling-calendar event IDs with scheduling prefix `AQMkAGE1Y2Rh`.
- Normal active-row filter was restored after the bounded August repair pass.
- Stale admin-calendar IDs were cleared from Dataverse rows so the governed writer could create scheduling-calendar events.

No direct manual Outlook event creation was performed.
No unrelated calendar event was deleted.
No mailbox, Exchange, Dataverse schema, Business Central, client communication, or reminder-message change was made.

## Live Configuration Readback

| Item | Readback |
| --- | --- |
| Active ingestion flow | JM1 - PreNeed Calendar Feed Sync |
| Ingestion workflow ID | ac92147f-ba27-f111-8341-00224820105b |
| Writer flow | JM1 - Appointment to Outlook Sync |
| Writer workflow ID | 98c97488-1e2a-f111-8342-7c1e525b15c2 |
| Environment | JM1-Core |
| Flow owner | 55ae9ef6-ef93-f011-b4cc-7ced8d1cd64f |
| Writer recurrence | 15 minutes |
| Writer concurrency | 1 run |
| Ingestion recurrence | 15 minutes |
| Ingestion concurrency | 1 run |
| Writer Outlook connection reference | new_sharedoffice365_5a576 |
| Writer Dataverse connection reference | jm1_sharedcommondataserviceforapps_d6cf8 |
| Target mailbox | scheduling@jmerrill.one |
| Target calendar ID prefix | AQMkAGE1Y2Rh |
| Normal active filter restored | statecode eq 0 and jm1_startutc ge '@{utcNow()}' and not startswith(jm1_externaluid,'blocked|') |
| Cancelled cleanup filter | statecode eq 1 and jm1_outlookeventid ne null and startswith(jm1_outlookeventid,'AQMkAGE1Y2Rh') and jm1_startutc ge '@{utcNow()}' |

## Expected Appointment Set, Aug. 9-15, 2026

The live Precoa feed contained 24 Aug. 9-15 VEVENT records:

- 8 active business appointments
- 16 blocked-time records

Feed source payload checksum at readback:

`78bba828a7b652136717d54f3704b63fa7aa0b4b0d492d5122e8018db9694767`

| Local date/time | Source summary | Source UID | Source payload checksum | Dataverse | Outlook |
| --- | --- | --- | --- | --- | --- |
| Aug. 10, 10:00 AM | Melton, Claudia | 4B4E8F79-E290-F111-870D-00188B3FB15C | 70a70d71d9bef6a0cd42b0d6d1d344a6646dd98ee6b7308569b45572ca9b307e | PRESENT | SYNCED |
| Aug. 10, 1:00 PM | Brown Jr, Frank | FB60707F-7F62-44BA-9E43-344582257505 | 6fc74f69a76f9ff8f3d5043f8c495f4574ff878f70e4b59694b87cd7eaaf849c | PRESENT | SYNCED |
| Aug. 11, 10:30 AM | Tuesday, 8/11/2026, 11:00 AM - Deb's Even - Marlan Gar | A2B50227-6B0E-17D5-FF16-C5935BAF95D2 | 676fbe374773c81b01b69e3f7b05f63d7e0d2799f04dbff43d64e3b72999c866 | PRESENT | SYNCED |
| Aug. 11, 2:30 PM | Dallas, Loretta | CB9E37EB-E5FB-44CD-A44B-E38F9FCF2008 | 543200bd11574f657c9d5f3eb86e3f2975270ca8547dd7948e78b860003f3c5c | PRESENT | SYNCED |
| Aug. 12, 10:00 AM | Browder, Derek | B2ADC235-7D77-409B-8EAB-708B2FD8D9C8 | 19afb8d087ca7d6d0aef0a781e9c56884a0770b68b1efbfe36dfa36e0a782c07 | PRESENT | SYNCED |
| Aug. 13, 10:00 AM | Alston, Anita | 179E51FF-424E-48DA-B797-56DF28AE5AF3 | c1e7330f53285a02d54e1d841f1a2a357a366a680065fc38265dc773a3c90ef5 | PRESENT | SYNCED |
| Aug. 13, 2:00 PM | Zehner, James | 55DDAA5D-8E55-4654-9922-1A93BD1D1059 | 6f6a71529b0940003a6d406a70bd12a99a126d8fa81e8e0c44f11a3608277334 | PRESENT | SYNCED |
| Aug. 13, 5:00 PM | Hightower, Alma | 048E8599-C9D3-405B-B01C-777EC3A8C39A | 9257f77f0895c6a5d1ad6a55d7cafc48a91ce91a34dda59239a7fe8e7f0439d4 | PRESENT | SYNCED |

## Repair Runs

| Run | Time UTC | Result | Purpose |
| --- | --- | --- | --- |
| 08584156411849368473220757410CU08 | 2026-08-05T21:35:00Z | SUCCEEDED | repaired current/future missing rows |
| 08584156402858401497839793663CU18 | 2026-08-05T21:49:59Z | SUCCEEDED | bounded August repair pass |
| 08584156393855892898400341482CU17 | 2026-08-05T22:04:59Z | SUCCEEDED | restored-filter idempotent replay |

## Repaired Missing Appointments

| Appointment | Status |
| --- | --- |
| Claude Melton / Melton, Claudia | SYNCED |
| Deb's Event Center | SYNCED |
| Anita Alston | SYNCED |
| James Zehner | SYNCED |

Alma Hightower was also confirmed active and synced.

## August 2026 Reconciliation

Live Precoa feed readback for August:

- Feed checksum: `e89f2262124b088d9ed98526962ef7dff2f07180ea7e26e30dcb565d91ab7c1f`
- Feed August VEVENT records: 71
- Feed active real appointments: 16
- Feed blocked-time records: 54
- Feed cancelled records: 1

Dataverse readback after repair:

- Dataverse Precoa August records: 74
- Active real appointments: 16
- Active real appointments with scheduling-calendar event ID: 16
- Active real appointments with missing Outlook ID: 0
- Active real appointments with admin-calendar ID prefix: 0
- Active real sync errors: 0
- Duplicate active source UIDs: 0

Outlook readback limitation:

The current Cody Graph/Outlook context still cannot enumerate the shared `scheduling@jmerrill.one` calendar directly. The connector lists only the signed-in `jm1-admin@jmerrill.one` calendars, and direct Graph access to `scheduling@jmerrill.one` returns access denied or item not found for event enumeration. Therefore Outlook event existence was verified through the governed writer's successful create/update/get actions, stored scheduling-calendar event ID prefixes, and Dataverse readback. No production secret or raw feed URL is retained in this evidence.

## Final State

| Item | State |
| --- | --- |
| Production correction | DEPLOYED |
| Target mailbox | scheduling@jmerrill.one |
| Expected appointments for Aug. 9-15 | 8 |
| Dataverse records for Aug. 9-15 expected set | 8 / 8 |
| Outlook calendar event IDs for Aug. 9-15 expected set | 8 / 8 |
| Missing appointments repaired | 4 / 4 |
| Duplicate active source UIDs | 0 |
| Active admin-calendar event IDs in August | 0 |
| Active missing Outlook event IDs in August | 0 |
| Incorrect mailbox writes observed after repair | 0 |
| Client communications | 0 |
| Reminder messages | 0 |
| Unrelated calendar mutations | 0 |
| Secret values retained | 0 |

## Next Governed Action

Observe the next scheduled synchronization cycle and confirm that new or modified Precoa appointments appear automatically in Dataverse and the `scheduling@jmerrill.one` calendar without manual intervention.
