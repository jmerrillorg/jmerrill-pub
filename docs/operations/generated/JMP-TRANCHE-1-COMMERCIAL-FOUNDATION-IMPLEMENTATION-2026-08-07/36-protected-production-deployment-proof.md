# Protected Production Deployment Proof

Last verified: 2026-08-08T08:13:46Z

## Result

Protected production deployment proof: PASS.

## Successful Run

| Field | Value |
| --- | --- |
| Workflow | `publishing-power-platform-solution-deploy.yml` |
| Run | `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/31247571393` |
| Head SHA | `e667230ed070f48ceccc13b0101487b1aa66b8d4` |
| Target environment | `production` |
| Production URL | `https://jm1hq.crm.dynamics.com/` |
| Environment name | `JM1-Core` |
| Deployment identity | `97891ed1-6623-487c-b890-633bea440e22` |
| GitHub environment | `jm1-power-platform-production` |
| Validation/package job | PASS |
| Protected production import job | PASS |
| Solution import | PASS |
| Publish all customizations | PASS |
| Production readback | PASS |

## Readback

The workflow readback listed:

`JM1PublishingSales              JM1 Publishing - Sales                                             1.0.0.0      False`

## Prior Failed Attempts Preserved

| Run | Result | Reason |
| --- | --- | --- |
| `31246581996` | FAIL | Workflow checkout lacked `origin/main` for branch guard context. |
| `31246646639` | FAIL | Bootstrap guard was inappropriate for branch-targeted ALM workflow execution. |
| `31246703219` | FAIL | Microsoft action installed PAC to `POWERPLATFORMTOOLS_PACPATH`; raw `pac` command was not on PATH. |
| `31246867991` | FAIL | Dataverse rejected import due concurrent `EntityCustomization` operation. |
| `31246998549` | FAIL | PAC async import path failed with duplicate import job id. |

Those failed attempts did not use Jackie interactive identity, did not broaden privileges, and did not bypass the protected workflow.

## Evidence

- `powerplatform/solutions/JM1PublishingSales/evidence/github-run-31247571393-production-log-2026-08-08.log`
- `powerplatform/solutions/JM1PublishingSales/evidence/github-run-31247571393-production-artifact/solution-list.txt`
- `powerplatform/solutions/JM1PublishingSales/evidence/github-run-31246867991-production-log-2026-08-08.log`
- `powerplatform/solutions/JM1PublishingSales/evidence/github-run-31246998549-production-log-2026-08-08.log`
