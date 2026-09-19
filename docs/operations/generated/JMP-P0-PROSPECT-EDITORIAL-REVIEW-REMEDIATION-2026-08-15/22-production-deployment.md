# Production Deployment

Last verified: 2026-08-16T02:38:45Z

Evidence source: GitHub PR #513 and GitHub Actions run `31921889872`.

Status:

EXECUTED / PRODUCTION HEALTH READBACK PASS.

Deployment lineage:

- PR #513 head: `4291cb49070963b059b4b899e1210673dc57e7b7`
- PR #513 merge commit / `origin/main`: `846920e343703f11410bc6cf3ce900f42fc4bc7f`
- Workflow: `.github/workflows/azure-app-service-publishing.yml`
- Workflow run: `31921889872`
- Workflow head SHA: `846920e343703f11410bc6cf3ce900f42fc4bc7f`
- Build immutable artifact: success
- Deploy App Service staging: success
- Swap staging to production: success

Nuance preserved:

The public production health endpoint reported the canonical release SHA. A raw Azure production app-setting query for `JM1_RELEASE_SHA` returned an older value during closeout. Because the app health endpoint is the release proof consumed by the deployment workflow, this is recorded as a configuration-observation discrepancy, not hidden.
