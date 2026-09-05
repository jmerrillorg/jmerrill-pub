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
- Production promotion: not authorized and not executed.

The final application run and release SHA are appended after the staging workflow completes.
