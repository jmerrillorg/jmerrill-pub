# Before / After Authority Matrix

| Authority surface | Before JM1-INFRA-012 | After JM1-INFRA-012 |
| --- | --- | --- |
| Production traffic | App Service | App Service |
| Apex DNS | App Service IP | App Service IP |
| `www` DNS | App Service hostname | App Service hostname |
| Production custom domain binding | App Service and stale SWA metadata | App Service only |
| Production deployment | App Service workflow plus active obsolete SWA workflow | App Service workflow only |
| PR previews | SWA attempted previews and hit capacity | App Service staging is preproduction authority |
| Required SWA check | None found in branch protection/rulesets | None |
| SWA deployment tokens | Present | Deleted |
| SWA preview environments | `341`, `349`, `355` | Deleted |
| SWA resource | Present | Deleted |
| Rollback | App Service plus legacy SWA fallback language | App Service slot swap-back plus immutable artifact |
| Runtime exception | SWA Node 22 active legacy path | SWA exception closed for Publishing |

