# Rollback

Rollback is code-only and non-production because this package did not deploy.

To revert the implementation, remove:

- app/publisher/pipeline/page.tsx
- app/api/publisher/pipeline/route.ts
- app/publisher/_components/PublisherPipelineClient.tsx
- lib/publishing/lifecycle/human-pipeline-read-model.ts
- scripts/publisher_pipeline_16_stage_guard.test.mjs
- the package script `publisher-pipeline-16-stage-guard`
- the `/publisher/pipeline` link added to app/publisher/_components/PublisherOperatingCenterClient.tsx

No Dataverse, SharePoint, Azure, Microsoft 365, email, or production state rollback is required.
