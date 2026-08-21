# 26 - Relay 503 Root Cause

## Classification

`DEPLOYMENT_FAILURE`

## Relay Resource

| Field | Evidence |
| --- | --- |
| Azure resource | `func-jm1-acs-email-relay` |
| Resource group | `rg-jm1-communications` |
| Subscription | `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` |
| Resource type | `Microsoft.Web/sites` |
| Hostname | `func-jm1-acs-email-relay.azurewebsites.net` |
| Region | East US |
| Runtime | Azure Functions v4, Linux, Node 22 |
| Plan | `EastUSLinuxDynamicPlan`, Dynamic Y1 |
| Current state before repair | Azure resource `Running`; public host returned platform `HTTP 503 Site Unavailable` |
| Custom domain | none found |
| Health endpoint | no custom health endpoint; unauthenticated handler probe used |

## Root Cause

The Function App was configured with `WEBSITE_RUN_FROM_PACKAGE` pointing to an Azure Blob package URL whose read-only SAS expired on `2026-08-20T03:26Z`.

Because the Functions host could no longer fetch the configured package, requests failed at the host/platform boundary before any JavaScript handler executed. The expected routes remained visible through Azure function enumeration, but public HTTP requests returned platform `503` instead of relay-level JSON.

## Ruled Out

| Candidate | Result |
| --- | --- |
| `FUNCTION_HOST_STOPPED` | ruled out; Function App state was `Running` |
| `STORAGE_CONFIGURATION_FAILURE` | ruled out; `stjm1acsrelay` existed, was available, network default action allowed |
| `RUNTIME_CONFIGURATION_FAILURE` | no evidence; `FUNCTIONS_WORKER_RUNTIME=node`, `FUNCTIONS_EXTENSION_VERSION=~4`, `linuxFxVersion=Node\|22` |
| `KEY_VAULT_REFERENCE_FAILURE` | no Key Vault reference failure found on relay required settings |
| `MANAGED_IDENTITY_FAILURE` | no relay managed identity dependency was used for the failed package URL |
| `DNS_OR_HOSTNAME_FAILURE` | ruled out; hostname resolved and returned Azure platform response |

## Incident Boundary

Publisher App -> governed communications relay -> host-level 503 -> handler did not execute -> ACS provider never received the failed incident requests.

