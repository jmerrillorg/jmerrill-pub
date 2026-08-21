# 25 - Production Deployment Readback

## Classification

State as of 2026-08-21 01:27 UTC: `FRONT_DOOR_DEPLOYED_AND_CONTROLLED_COMMISSIONING`.

The redesigned JMP `/join` front door is merged to `main`, deployed to the Premium App Service, and externally reachable on the canonical production domains. It is not certified as `FRONT_DOOR_FULLY_COMMISSIONED` until a human Turnstile-valid synthetic submission and an authenticated Publisher Operating Center email-manuscript binding run are completed against production.

## Merge and Deployment Proof

| Item | Evidence |
| --- | --- |
| Redesign PR | `https://github.com/jmerrillorg/jmerrill-pub/pull/545` |
| Redesign merge commit | `d0a43b1e37e1909045a98efa31ea368025360e39` |
| Hardening PR | `https://github.com/jmerrillorg/jmerrill-pub/pull/546` |
| Hardening merge commit | `eb67a493fc35ba39052a41f6d82ef3b02f7a06f6` |
| Deployment workflow | `Deploy J Merrill Publishing to Premium App Service` run `32436188945` |
| Deployment result | success |
| Deployment job | `Build, Package, Deploy` job `96637763723` |
| Deployment guard | success |
| Build | success |
| Artifact deploy | success |
| Health probe | success |

## Production Health Readback

`https://jmerrill.pub/api/health` returned `status=ready` with release `eb67a493fc35ba39052a41f6d82ef3b02f7a06f6`.

Dependency readback:

| Dependency | Status |
| --- | --- |
| configuration | ready |
| dataverse | ready |
| graph | ready |
| acs | ready |
| artifact | ready |
| authorPortal | ready |
| stripeEnrollment | ready |

## Canonical Domain Readback

| Probe | Result |
| --- | --- |
| `GET https://jmerrill.pub/join` | HTTP 200 |
| `GET https://www.jmerrill.pub/join` | HTTP 200 |
| `/join` cache policy | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `GET https://jmerrill.pub/api/publishing/intake/config` | returned Turnstile site key |
| Release serving production | `eb67a493fc35ba39052a41f6d82ef3b02f7a06f6` |

## Origin and Failure-Mode Readback

| Probe | Result |
| --- | --- |
| `OPTIONS` from `https://jmerrill.pub` | HTTP 204, `access-control-allow-origin: https://jmerrill.pub` |
| `OPTIONS` from `https://www.jmerrill.pub` | HTTP 204, `access-control-allow-origin: https://www.jmerrill.pub` |
| `OPTIONS` from `https://evil.example` | HTTP 403, no allowed origin |
| `POST` from `https://evil.example` | HTTP 403, `origin_not_allowed` |
| `POST` from `https://jmerrill.pub` with invalid Turnstile token | HTTP 400, `turnstile_verification_failed` |

These failure-mode probes intentionally do not create a durable intake record.

## Commissioning Holds

The following gates require a production human/browser/operator session and remain open:

1. Human Turnstile-valid synthetic `/join` submission that proves Dataverse persistence, reference issuance, duplicate replay, internal notification, and Publisher Operating Center queue visibility.
2. Authenticated Publisher Operating Center run of `email-manuscript-bind` against a controlled Microsoft mailbox message in `publishing@jmerrill.one` with an exact attachment id.
3. Authenticated continuation-token upload proof against a synthetic manuscript-later intake.

Known prospect recovery remains on hold until those gates pass. The known prospect must not be asked to resubmit yet.
