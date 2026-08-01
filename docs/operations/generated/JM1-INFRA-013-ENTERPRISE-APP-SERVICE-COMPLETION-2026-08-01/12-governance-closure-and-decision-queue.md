# Governance Closure and Decision Queue

Date: 2026-08-01
Status: `COMPLETE AT GOVERNED EVIDENCE / EXCEPTION BOUNDARY`

## Closure Decision

JM1-INFRA-013 is closed as:

`APP SERVICE ENTERPRISE COMPLETE - DOCUMENTED EXCEPTIONS REMAIN`

This closure confirms that the enterprise App Service foundation and Publishing App Service operating path are complete, while the remaining commercial web properties require separate controlled migration decisions. No DNS migration, Azure deletion, production traffic movement, or remaining Static Web Apps retirement is authorized by this package.

## Lifecycle Definitions

| State | Meaning |
|---|---|
| `PLATFORM_PROVISIONED` | Target App Service infrastructure exists and can host a governed runtime. |
| `APPLICATION_DEPLOYED` | The actual property application, not only a minimal runtime, is deployed and functionally certified on the target platform. |
| `TRAFFIC_MIGRATED` | Public DNS, custom domains, certificates, and production traffic have moved to the target platform with rollback evidence. |
| `LEGACY_HOST_RETIRED` | The former Static Web Apps or redirector hosting path, workflow authority, deployment tokens, and required-check references have been removed or formally superseded. |

## Enterprise Hosting Register

| Domain or property | Public DNS target | Current platform | Target App Service | Health | `PLATFORM_PROVISIONED` | `APPLICATION_DEPLOYED` | `TRAFFIC_MIGRATED` | `LEGACY_HOST_RETIRED` | Auth | Integrations | Sensitivity | Rollback | Blocker | Gate | Retirement prerequisite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `jmerrill.pub` | Publishing App Service path | Azure App Service | `app-jm1-pub-prod` | Production certified | Yes | Yes | Yes | Yes for Publishing SWA | Public plus governed author and publisher auth | Dataverse, SharePoint, Graph, ACS, App Insights, Key Vault | Author, manuscript, workflow, and publishing evidence | App Service release rollback and retained evidence | None for Publishing SWA retirement | GATE-W1 / INFRA-012 | Complete |
| `jmerrill.one` | Azure Static Web Apps | Azure Static Web Apps | `app-jm1-one-prod` | Minimal App Service runtime healthy; public site still SWA | Yes | No | No | No | Corporate public and future shared-platform auth | Corporate web, shared platform, redirects, observability | Corporate public web and enterprise identity context | Retain SWA until App Service public-site proof passes | Full application not certified on App Service | GATE-W4 decision-ready | Real-site deployment, functional proof, DNS/TLS cutover, rollback, SWA workflow and secret retirement |
| `jmerrill.foundation` | Azure Static Web Apps | Azure Static Web Apps | `app-jm1-foundation-prod` | Minimal App Service runtime healthy; public site still SWA | Yes | No | No | No | Foundation public and future workflow auth | Foundation site, intake or program dependencies, observability | Foundation public web and constituent interaction context | Retain SWA until Foundation proof passes | Dependency assessment complete; migration must follow corporate proof | Future controlled Foundation gate | Dependency review, real-site proof, DNS/TLS cutover, rollback, SWA retirement |
| `jmerrill.financial` | Azure Static Web Apps | Azure Static Web Apps | `app-jm1-fin-prod` | Minimal App Service runtime healthy; public site still SWA | Yes | No | No | No | Financial public and future protected workflows | Financial web, scheduling, compliance-adjacent public posture | Financial services public web; no production financial posting authorized | Retain SWA until Financial proof passes | Separate controlled gate required | Future Financial web gate | Compliance review, real-site proof, DNS/TLS cutover, rollback, SWA retirement |
| `jmerrill.productions` | Existing public path / SWA | Azure Static Web Apps and existing public path | `app-jm1-productions-prod` | Production App Service exception; staging minimal runtime healthy | Yes | No | No | No | Productions public path | Productions web and media-public posture | Public web and media-property context | Retain existing public path until Microsoft/support exception resolves | GATE-W3 administrative exception | GATE-W3 frozen exception lane | Microsoft diagnostic, production App Service health, real-site proof, DNS/TLS cutover, rollback |
| `jmerrill.org` | SWA redirector | Azure Static Web Apps redirector | No certified replacement | Redirector active | No dedicated replacement | No | No | No | Public redirect | Foundation/corporate redirect dependency | Public redirect only | Retain redirector until replacement exists | Redirect architecture not authorized | Redirector decision queue | Approved redirect target and retirement proof |
| `book.jmerrill.financial` | SWA redirector | Azure Static Web Apps redirector | No certified replacement | Redirector active | No dedicated replacement | No | No | No | Public redirect / scheduling entry | Financial booking route | Public scheduling redirect context | Retain redirector until replacement exists | Redirect architecture not authorized | Redirector decision queue | Approved redirect target and retirement proof |

## Remaining Commercial Migration Decision Queue

### A. `jmerrill.one`

Status: `MIGRATION DECISION READY`

Recommended next web gate:

`GATE-W4 - JM1 Corporate Shared-Platform Controlled Proof`

Scope: `jmerrill.one` only.

Decision package requirements:

- Confirm canonical repository and build authority.
- Confirm application inventory and public-site content parity.
- Confirm App Service environment setting contract using secret names and Key Vault references only.
- Confirm monitoring, alerting, and rollback ownership.
- Certify App Service staging with the real corporate application.
- Bind custom domains only after Jackie authorizes production cutover.
- Retire SWA workflow, token secrets, and required-check references only after stable traffic migration.

GATE-W4 status: `DECISION_READY - NOT STARTED`

### B. `jmerrill.foundation`

Status: `DEPENDENCY ASSESSMENT COMPLETE`

Foundation should not migrate before the corporate shared-platform proof is completed and accepted. Its App Service target is provisioned, but the public Foundation application is not certified there. A separate Foundation migration gate must validate content, dependencies, redirects, monitoring, and rollback before any DNS or SWA retirement action.

### C. `jmerrill.financial`

Status: `SEPARATE CONTROLLED GATE`

Financial requires a dedicated migration gate because its public web presence is tied to regulated or compliance-adjacent business posture. The current minimal runtime on `app-jm1-fin-prod` is not a public-site certification and does not authorize DNS cutover or SWA retirement.

### D. `jmerrill.productions`

Status: `GATE-W3 ADMINISTRATIVE EXCEPTION`

Productions remains frozen under the existing GATE-W3 administrative exception. The production App Service issue must not be reopened as INFRA-013 engineering. Resume only when Microsoft support entitlement permits the support lane, or Jackie authorizes a different remediation path.

### E. Redirectors

Status: `INVENTORIED / RETIREMENT NOT AUTHORIZED`

Redirectors remain active because their replacement architecture is not certified. They may be retired only after the target redirect path, DNS behavior, TLS behavior, monitoring, and rollback are governed and validated.

## Workflow Authority Reconciliation

| Property | Repository authority observed | Active deployment authority | Disposition |
|---|---|---|---|
| Publishing | `jmerrillorg/jmerrill-pub` | App Service workflow | Sole active Publishing hosting path |
| Corporate | `jmerrillorg/jmerrill-one` | SWA workflow retained | Move only through GATE-W4 |
| Financial | `jmerrillorg/jmerrill-financial` | SWA workflow retained | Separate controlled gate |
| Foundation | `jmerrillorg/jmerrillfoundation` | SWA workflow retained | Migrate after corporate proof |
| Productions | `jmerrillorg/jmerrill-productions` | SWA workflow retained; App Service exception | GATE-W3 administrative exception |
| Redirectors | Redirector repositories listed in `05-workflow-register.md` | SWA workflows retained | Retirement not authorized |

## Security Boundary

Secret values retained: `0`

This closure package records only secret names, workflow authority, storage class, and disposition. It does not record app-setting values, publishing profiles, deployment tokens, Key Vault values, Dataverse credentials, Stripe credentials, or other secret material.

## Priority After Closure

After INFRA-013 closure, the recommended next governed action is:

Complete the five-title author-review release wave before authorizing GATE-W4 implementation.

