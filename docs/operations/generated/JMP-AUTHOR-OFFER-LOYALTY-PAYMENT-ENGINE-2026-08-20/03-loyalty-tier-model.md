# Loyalty Tier Model

## Canonical Rule

Automatic returning-author benefit against eligible base package fee:

| Prior eligible JMP titles | Benefit |
|---:|---:|
| 0 | 0% |
| 1 | 10% |
| 2-3 | 15% |
| 4+ | 20% |

## Implementation

Function: `returningAuthorPercent(priorEligibleTitleCount)`.

The benefit is automatic and does not require author election.

## Boundary

The engine accepts a prior eligible title count as input. Production derivation from title history remains integration work; stale manual contact fields must not silently override governed title history.

