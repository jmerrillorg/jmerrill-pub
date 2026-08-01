# Migration Register

| Property | Required next action | Blocking dependency | Owner | Retirement eligibility |
|---|---|---|---|---|
| `jmerrill.pub` | None for hosting; preserve App Service operating model | None | JM1 Publishing operations | Eligible; SWA already absent from active inventory |
| `jmerrill.one` | Deploy full public site to `app-jm1-one-prod`, bind domains, validate, then cut DNS | Real-site App Service certification | JM1 web operations | Not eligible |
| `jmerrill.financial` | Deploy full public site to `app-jm1-fin-prod`, bind domains, validate, then cut DNS | Real-site App Service certification | JM1 web operations | Not eligible |
| `jmerrill.foundation` | Deploy full public site to `app-jm1-foundation-prod`, bind domains, validate, then cut DNS | Real-site App Service certification | JM1 web operations | Not eligible |
| `jmerrill.org` | Replace SWA redirector with approved App Service or Azure-native redirect | Redirect architecture and validation | JM1 web operations | Not eligible |
| `jmerrill.productions` | Resolve GATE-W3 Productions production 503 through Microsoft/support lane | Microsoft support entitlement and platform diagnostic | Jackie / Microsoft | Not eligible |
| `www.jmerrill.productions` | Resolve TLS/DNS target and align with Productions migration | Productions App Service exception | JM1 web operations / Microsoft | Not eligible |
| `book.jmerrill.financial` | Replace SWA redirector with approved App Service or Azure-native redirect | Redirect architecture and validation | JM1 web operations | Not eligible |

## Migration Rule

No commercial SWA property may be deleted until:

1. its replacement App Service or approved redirect path is deployed;
2. custom domain and TLS bindings are active;
3. production smoke tests pass;
4. rollback is documented;
5. GitHub deployment authority has moved away from SWA;
6. DNS cutover is complete and stable;
7. stale SWA secrets and workflows are removed; and
8. retirement evidence is preserved.

