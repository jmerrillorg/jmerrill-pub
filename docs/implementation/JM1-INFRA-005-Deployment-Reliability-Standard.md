# JM1-INFRA-005 Deployment Reliability Standard

Status: Active operational standard
Version: 1.0
Date: 2026-07-27
Owner: JM1 Infrastructure / Publishing Operations

## Purpose

JM1-INFRA-005 governs production deployment reliability for J Merrill Publishing. The standard preserves the current Azure Static Web Apps architecture and adds operational confidence around deployments.

It does not authorize an App Service migration, Author Operating Center redesign, Stripe redesign, or unrelated platform refactor.

## Deployment Lifecycle

Production deployment follows this lifecycle:

1. Build and deploy through GitHub Actions.
2. Run the production health gate after the deployment step.
3. Preserve deployment evidence.
4. Classify the deployment as stable or failed.
5. If failed, follow the JM1-INFRA-005 rollback runbook.

Azure reporting a successful deployment is necessary but not sufficient. A deployment becomes operationally complete only after the health gate passes.

## Production Health Gate

The health gate validates these routes after every production deployment:

| Route | Expected result |
| --- | --- |
| `/` | 200 |
| `/books` | 200 |
| `/authors` | 200 |
| `/author` | 200 |
| `/author/portal` | 200 |
| `/author/financial-setup` | 200 |
| `/api/author/context` | 401 |

The health gate fails on:

- HTTP 500;
- HTTP 503;
- timeout;
- network error;
- unexpected redirect;
- any status other than the route's expected status.

Unauthenticated protected endpoints must fail closed with 401, not 500 or 503.

## Stability Window

The governed production stability window is 10 minutes. The workflow records route, timestamp, status, latency, expected status, and probe number. The default probe interval is 30 seconds with a 20 second timeout.

The stability window may be lengthened during SEV response. It may not be shortened for normal production deployments without a governed change.

## Failure Classification

The health gate classifies repeated failures as:

- Application Startup Failure;
- Static Asset Failure;
- Server Function Failure;
- Platform Availability;
- Unknown.

The classification is evidence for triage. It is not proof of root cause by itself.

## Evidence Package

Each production deployment must preserve:

- deployment SHA;
- GitHub workflow/run ID;
- deployment timestamp;
- health probe results;
- smoke-test status;
- rollback status;
- operator;
- correlation ID;
- duration;
- final result.

GitHub Actions preserves the JSON evidence as a workflow artifact named `jm1-infra-005-production-health`.

## Rollback Gate

Rollback is triggered by repeated 5xx responses, repeated timeouts, deployment-success-with-health-failure, or sustained post-deployment degradation. A single transient failure should be investigated, not automatically rolled back.

Preferred rollback is redeploying the last known-good artifact or rerunning the last known-good GitHub Actions deployment. Git history must be preserved.

## Alerts

Minimum recommended alerts:

- repeated 5xx on public pages;
- repeated timeout from external probe;
- deployment succeeded but health gate failed;
- post-deployment degradation within 30 minutes.

Alerts should notify JM1 operators. Automatic rollback requires separate governed implementation.

## Authority

During SEV-1 production availability incidents, Cody or an authorized operator may perform reversible rollback to the last known-good production deployment without additional Jackie approval. Any destructive action, force-push, production data change, payment action, or platform migration remains separately governed.
