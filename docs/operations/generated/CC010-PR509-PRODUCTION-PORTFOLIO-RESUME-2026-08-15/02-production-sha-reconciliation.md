# 02 - Production SHA Reconciliation

Last verified: 2026-08-15T13:03:48.566486Z

| Component | Expected | Actual | State |
| --- | --- | --- | --- |
| jmerrill.pub production app | ccd606e5441e6190751f51bcc0df48136d440b84 | ccd606e5441e6190751f51bcc0df48136d440b84 | MATCH |
| func-jm1-diagnostic-ai-runner | ccd606e5441e6190751f51bcc0df48136d440b84 | ccd606e5441e6190751f51bcc0df48136d440b84 | MATCH |

Function app settings readback: `[{"name": "SCM_DO_BUILD_DURING_DEPLOYMENT", "value": "false"}, {"name": "AZURE_OPENAI_DEPLOYMENT_NAME", "value": "jm1-pub-diagnostic-primary"}, {"name": "JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS", "value": "jm1-editorial-devline-primary"}, {"name": "JM1_RELEASE_SHA", "value": "ccd606e5441e6190751f51bcc0df48136d440b84"}, {"name": "AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME", "value": "jm1-editorial-devline-primary"}, {"name": "ENABLE_ORYX_BUILD", "value": "false"}, {"name": "WEBSITE_RUN_FROM_PACKAGE", "value": "PRESENT_SIGNED_PACKAGE_URL_REDACTED"}]`

Function routes indexed: 27.

Stale package pin guard: `WEBSITE_RUN_FROM_PACKAGE` is present as the active immutable package mechanism and the function app `JM1_RELEASE_SHA` matches canonical main. The signed package URL is redacted from evidence.
