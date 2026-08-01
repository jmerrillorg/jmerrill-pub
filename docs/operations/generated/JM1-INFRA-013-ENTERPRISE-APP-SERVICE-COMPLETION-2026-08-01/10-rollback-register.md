# Rollback Register

| Property | Current rollback posture |
|---|---|
| `jmerrill.pub` | App Service production rollback follows Publishing App Service release process. No SWA rollback dependency remains in active inventory. |
| `jmerrill.one` | SWA remains production authority; no App Service cutover occurred. |
| `jmerrill.financial` | SWA remains production authority; no App Service cutover occurred. |
| `jmerrill.foundation` | SWA remains production authority; no App Service cutover occurred. |
| `jmerrill.org` | SWA redirector remains production authority; no replacement cutover occurred. |
| `jmerrill.productions` | SWA remains production authority while App Service production exception is held. |
| `book.jmerrill.financial` | SWA redirector remains production authority; no replacement cutover occurred. |

## Rollback Principle

For remaining migrations, rollback must be property-specific and must include DNS restoration, certificate validation, workflow reversal, and health-probe evidence.

