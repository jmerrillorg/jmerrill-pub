# Environment Provenance Fix

Root cause: the transition plug-in wrote `JM1-Dev` directly. Both literal writes were replaced by an environment resolver backed by `jmpv2_environmentauthority`.

- Development authority: `JM1-Dev`, organization `579864ae-44cc-f011-95c7-000d3a37fe06`.
- Commissioning/UAT authority: `JM1-Test`, organization `bb7a9d9e-8e73-f111-b27b-000d3a31ff17`, classification `COMMISSIONING_UAT`.
- Managed solution version: `1.0.4.0`.
- UAT application readback: `JM1-Test`.
- `DEV_LABEL_LEAKAGE = 0`.

Evidence is in `evidence/dataverse/schema_environment_evidence.json`, `evidence/dataverse/transition_environment_authority_update.json`, and `evidence/alm/uat_managed_deployment_readback.json`.
