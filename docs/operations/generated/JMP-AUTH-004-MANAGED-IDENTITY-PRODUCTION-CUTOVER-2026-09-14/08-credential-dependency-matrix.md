# Credential Dependency Matrix

No credential values were exposed, copied, retired, or modified by this work package.

## Legacy machine application

- client id = 71ec4dd0-d261-4ffc-9f5a-626d885ecc85
- application display name = JM1-PUB-INTAKE-WEBAPI
- application object id = 5fccb406-d90f-49b6-8987-3fbd11267e22
- service principal id = ecc93d0c-029c-4a4a-9961-e0ba53492e99
- service principal account enabled = true
- observed password credentials = 2

Password credentials observed as safe metadata:

- ce1df541-1a1d-4853-a8c1-1c60e3ca3826; display name `jmerrill-pub-intake-api`; starts 2026-06-11T08:14:20Z; ends 2027-06-11T08:14:20Z
- cc059b72-5646-44dc-a98a-b56fee48695e; display name `JM1-PRIME CAP-009 writeback 2026-07-15`; starts 2026-07-15T05:44:03Z; ends 2027-07-15T05:44:03Z

Runtime dependency after cutover:

- migrated Dataverse runtime use = 0 under MANAGED_IDENTITY
- migrated SharePoint/Graph runtime use = 0 under MANAGED_IDENTITY
- retained dependency = rollback only, pending separate retirement review

## Publisher interactive application

- client id = 7bd27a68-fda7-4330-9198-d493f2a0a5ef
- application display name = JM1 Publisher Operating Center
- application object id = 41049585-dc3d-405b-8ac3-b052fb236386
- service principal id = afd40155-c25d-4269-a35f-fc41f68ea5a2
- service principal account enabled = true
- old password credentials before = 3
- old password credentials retired = 0
- old password credentials after = 3

Old password credentials observed as safe metadata:

- 4afb2f1a-28d7-4d38-b30d-097fbce863f3; display name `jmerrill-pub-20260715`; starts 2026-07-15T08:07:24Z; ends 2027-07-15T08:07:24Z
- ee63b16f-c8b1-4237-8a35-c893a27d86a5; display name `jmerrill-pub-20260818-rotation`; starts 2026-08-18T09:52:28Z; ends 2027-08-18T09:52:28Z
- d5194bee-6eac-4631-af19-9edc485a23fe; display name `jmerrill-pub-20260818-rotation`; starts 2026-08-18T09:52:36Z; ends 2027-08-18T09:52:36Z

Interactive dependency:

- OLD_INTERACTIVE_APP_REQUIRED = YES
- CREDENTIALS_RETIREMENT_READY = 0 for the old Publisher interactive app credentials

## Sign-in log readback

Bounded sign-in log queries returned no rows for:

- 7bd27a68-fda7-4330-9198-d493f2a0a5ef
- 71ec4dd0-d261-4ffc-9f5a-626d885ecc85

Therefore individual password credential last-use attribution was not available from the queried sign-in-log surface.

CREDENTIAL_CALLER_MAPPING = INDISTINGUISHABLE at per-password-key level
