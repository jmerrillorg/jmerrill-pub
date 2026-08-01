# Compatibility Assessment

## Toolchain

| Component | Certified version |
| --- | --- |
| Node.js | `v24.18.1` |
| npm | `11.19.0` |
| OS | macOS, local Cody execution environment |

## Platform Support

| Platform | Assessment |
| --- | --- |
| Azure App Service Linux | `NODE|24-lts` confirmed by Azure CLI supported runtime list |
| Azure App Service app setting | Microsoft documentation recommends `WEBSITE_NODE_DEFAULT_VERSION="~24"` |
| Azure Static Web Apps preview | Historical finding only. Publishing SWA: RETIRED UNDER JM1-INFRA-012 |
| Azure Functions runtime | Azure Functions v4 lists Node.js 24 as GA, and Azure CLI listed `Node|24` |
| Function programming model | Existing JavaScript v4 package model with `@azure/functions@^4.7.0`; tests pass under Node 24 |
| JM1 live Function hosts | `Node|24` runtime smoke failed with 503 for protected probes; rollback to `Node|22` restored 401 fail-closed responses |

## Dependency Stack

| Dependency area | Node 24 result |
| --- | --- |
| Next.js 14.2.35 | Build passed |
| React 18.3 | Build passed |
| NextAuth 4.24 | Type-check/build passed |
| TypeScript 5.4 | Type-check passed |
| ESLint 8.57 | Lint passed with existing font warning |
| Azure SDKs | Function tests passed |
| `@azure/functions` 4.7 | Function tests passed |
| Application Insights 2.9 | Diagnostic runner tests passed; pre-existing moderate audit issues remain |
| `docx`, `mammoth`, `jszip` | Diagnostic runner document tests passed |

## Warning Classification

| Warning | Classification | Disposition |
| --- | --- | --- |
| Root npm audit: 9 vulnerabilities | Pre-existing / actionable outside runtime wave | Not fixed to avoid broad dependency modernization |
| Diagnostic runner npm audit: 4 moderate vulnerabilities | Pre-existing / actionable outside runtime wave | Not fixed to avoid broad dependency modernization |
| npm install-scripts approval warning for root dependencies | npm 11 policy warning / safe for this wave | Recorded; no approval change made |
| Next custom font lint warning | Pre-existing / safe | Recorded; not runtime-related |
| Dataverse catalog configuration missing during static generation | Pre-existing / safe local build warning | Expected without production Dataverse secrets in local build |
| SWA deploy action rejected Node 24.13.0 | Historical platform limitation only | Publishing SWA: RETIRED UNDER JM1-INFRA-012; App Service remains the Publishing production path |
