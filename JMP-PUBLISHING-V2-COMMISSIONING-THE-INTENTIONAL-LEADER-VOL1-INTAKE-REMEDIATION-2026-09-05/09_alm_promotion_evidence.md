# ALM Promotion Evidence

Dataverse followed Development -> validation -> managed export -> JM1-Test managed import.

- Solution: `JMP_PublishingV2`.
- Version: `1.0.4.0`.
- Managed package: `evidence/alm/JMP_PublishingV2_1_0_4_0_managed.zip`.
- Package SHA-256: `10b2c8c09b09fc2df0136e9b521184565b8bd87ca81110569369b0326215a8a9`.
- JM1-Test import/readback: `PASS`.
- UAT application user: `c7796849-2fa9-f111-aaab-002248046451`; role assignment: `System Administrator`; status: `PASS`.
- Publishing host: `app-jm1-pub-prod-v2`; isolated slot: `staging`.
- Staging URL: `https://app-jm1-pub-prod-v2-staging.azurewebsites.net`.
- Application workflow: `https://github.com/jmerrillorg/jmerrill-pub/actions/runs/33970236550`.
- Staging release SHA: `f7574f6b130309b62f7a088a45b9002c6d4c7d28`.
- Build, deployment, and staging health certification: `PASS`.
- Staging health status: `ready`.
- Production release remained `6f79da18de0ae9b918908bb266651f0a95880ae6`.
- Production promotion: not authorized and not executed.

The workflow's production promotion job was skipped. The deployed staging release is isolated from Production and reads from JM1-Test.
