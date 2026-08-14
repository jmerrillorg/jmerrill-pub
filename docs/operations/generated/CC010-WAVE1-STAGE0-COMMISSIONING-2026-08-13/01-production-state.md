# Production State

Last verified: 2026-08-13T23:58:30Z

## Repository Verification

```text
origin https://github.com/jmerrillorg/jmerrill-pub.git
```

Execution was performed from the J Merrill Publishing runtime repository, not `jm1-ops`.

## Function App

| Field | Value |
|---|---|
| Function App | `func-jm1-diagnostic-ai-runner` |
| Resource group | `rg-jm1-ai` |
| State | `Running` |
| Runtime | `Node|22` |
| Worker runtime | `node` |
| Hostname | `func-jm1-diagnostic-ai-runner.azurewebsites.net` |

## Release SHA

| Measure | Value |
|---|---|
| Intended canonical SHA | `603f9cb62da43a52bc4ab16cd37a4a0556bc705c` |
| Production `JM1_RELEASE_SHA` readback | `603f9cb62da43a52bc4ab16cd37a4a0556bc705c` |
| PR | `#501` |
| PR head | `c9c9219d0a85651a70730caab4d9b3525cdd4ab9` |

## Trigger and Protection

| Check | Result |
|---|---|
| `run-stage0-diagnostic` indexed | PASS |
| Invoke URL | `https://func-jm1-diagnostic-ai-runner.azurewebsites.net/api/run-stage0-diagnostic` |
| No-key route probe | `401 {"status":"error","code":"UNAUTHORIZED"}` |
| `WEBSITE_RUN_FROM_PACKAGE` app setting | ABSENT |
| `AZURE_OPENAI_ENABLE_RESPONSE_FORMAT_JSON_OBJECT` app setting | ABSENT |

## Deployment Artifact

The current production function package was built from merge SHA `603f9cb62da43a52bc4ab16cd37a4a0556bc705c`.

| Artifact | Value |
|---|---|
| Zip file | `/tmp/jm1-stage0-function-603f9cb.zip` |
| Zip SHA-256 | `099a53ffcb71ef49cad6f12108991e6e60125dea7a59fb1fde20c04df6b13887` |

