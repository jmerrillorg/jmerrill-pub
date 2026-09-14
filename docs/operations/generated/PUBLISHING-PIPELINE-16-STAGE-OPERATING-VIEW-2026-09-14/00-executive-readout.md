# Publishing Pipeline 16-Stage Operating View

Generated: 2026-09-14
Repository: jmerrill-pub
Baseline: origin/main @ 151f9650
Branch: codex/publisher-pipeline-16-stage

## Result

IMPLEMENTATION_STATUS =
PASS

The repository now has a separate human-facing Publishing Pipeline at `/publisher/pipeline`. It uses the same Publisher Operating Center authentication and the same governed Operating Center snapshot source, then projects current title cards into the approved 16-stage human lifecycle.

The existing Publisher Operating Center remains the diagnostic, exception, reconciliation, and execution-management interface at `/publisher/operating-center`.

## Architecture

AUTHORITATIVE_LIFECYCLE_SOURCE =
Dataverse-backed Publisher Operating Center snapshot plus canonical lifecycle read model

OPERATING_CENTER_READ_MODEL =
buildPublisherOperatingCenterSnapshot()

PIPELINE_READ_MODEL =
buildHumanPublishingPipelineView(snapshot.titleOperatingView.cards, snapshot.generatedAt)

SELECTED_PIPELINE_ROUTE =
/publisher/pipeline

SELECTED_PIPELINE_API =
/api/publisher/pipeline

## Guardrails

- 00 Template is not exposed as a title stage.
- The board declares exactly 16 human-facing stages.
- Browser localStorage and IndexedDB are not used as lifecycle authority.
- Ambiguous or conflicting title lifecycle records are surfaced in reconciliation, not silently placed.
- Pipeline cards link to the Operating Center for deeper diagnostics.
- Operating Center links back to the Pipeline.

## Deployment

DEPLOYMENT_STATUS =
NOT_DEPLOYED

PRODUCTION_MUTATIONS =
0

AUTHOR_COMMUNICATIONS =
0

