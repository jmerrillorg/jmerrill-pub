# Branch Protection Update

## GitHub Protection Readback

| Control | Result |
| --- | --- |
| Classic branch protection for `main` | GitHub API returned `Branch not protected` |
| Repository rulesets | GitHub API returned `[]` |
| Required SWA status check | None found |

No required-check deletion was necessary because no classic branch protection or repository ruleset required the SWA check. Governance was not weakened.

## Replacement Governance

Publishing deployment authority remains the App Service workflow:

- type-check, build, guard scripts, artifact packaging, checksum validation, App Service staging deployment, staging health, and governed production promotion.

Open PRs may retain historical SWA check results from runs before retirement. Those checks no longer represent an active Publishing deployment authority once this branch merges because the workflow is disabled and deleted from source.

