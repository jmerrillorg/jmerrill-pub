# GitHub Cleanup Register

## Completed

- Publishing SWA workflow cleanup was handled by the prior Publishing SWA retirement work.
- INFRA-013 did not find an active `jmerrill-pub` SWA resource in Azure Static Web Apps.

## Deferred

The following GitHub cleanup must wait until the corresponding production traffic is no longer served by SWA:

- Remove SWA workflows and SWA tokens from `jmerrillorg/jmerrill-one`.
- Remove SWA workflows and SWA tokens from `jmerrillorg/jmerrill-financial`.
- Remove SWA workflows and SWA tokens from `jmerrillorg/jmerrillfoundation`.
- Remove SWA workflows and SWA tokens from `jmerrillorg/jmerrill-productions`.
- Remove or archive SWA redirector repositories only after replacement redirect paths are certified.

## Secret Handling

Only secret names were inspected. No secret values were retrieved or preserved.

