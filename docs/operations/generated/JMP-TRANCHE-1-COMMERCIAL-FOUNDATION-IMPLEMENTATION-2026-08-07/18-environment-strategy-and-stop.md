# Environment Strategy and Stop Decision

Last verified: 2026-08-07

## Decision

`DEVELOPMENT_SANDBOX_REQUIRED`

JM1-Dev remains the named development candidate, but the current production-exported `JM1PublishingSales` package cannot be imported safely into JM1-Dev in this pass.

## Why JM1-Dev Was Not Remediated

The missing dependency register contains 335 unique required components across 692 dependency edges.

- Microsoft first-party dependencies include a small Tranche 1-aligned Sales/Lead/Product set plus a much larger set of Field Service, Service Scheduling, Sales Insights, Accelerated Sales, Marketing/CXP, Power Pages, Omnichannel, Business Central integration, and other applications that are not authorized for Tranche 1.
- JM1-owned dependencies include 38 `Active` solution components with no governed prerequisite package located in this repository.
- Installing every resolvable Microsoft app would violate the instruction not to install unrelated first-party apps.
- Recreating JM1 Active-layer components by hand would violate the instruction not to copy isolated components or silently rebuild production dependencies.

## Sandbox Check

JM1-Test was checked read-only. It has fewer JM1 prerequisite solutions than JM1-Dev and does not provide a parity target for `JM1PublishingSales`.

## Result

No prerequisite imports were executed. No Microsoft applications were installed. No Dataverse schema or data was changed. Tranche 1 implementation did not resume.
