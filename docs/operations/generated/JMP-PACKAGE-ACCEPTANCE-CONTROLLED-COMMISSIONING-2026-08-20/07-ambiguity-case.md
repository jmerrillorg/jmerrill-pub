# Ambiguity Case

Last verified: 2026-08-21

## Acceptance Classifier Evidence

| Case | Result | Reason |
|---|---|---|
| Explicit Professional package acceptance | `ACCEPTED` | `EXPLICIT_PACKAGE_ACCEPTANCE` |
| Sole Starter recommendation plus clear yes | `ACCEPTED` | `SOLE_STARTER_RECOMMENDATION_ACCEPTED` |
| Multiple packages plus ambiguous yes | `CLARIFICATION_REQUIRED` | `AMBIGUOUS_YES_WITH_MULTIPLE_PACKAGES` |
| Vague enthusiasm | `NO_ACCEPTANCE` | `NO_PACKAGE_ACCEPTANCE` |
| Duplicate acceptance | `DUPLICATE` | `DUPLICATE_PACKAGE_ACCEPTANCE` |

## Boundary

Ambiguous replies with multiple presented packages fail closed. Duplicate package acceptance does not create a second acceptance event.
