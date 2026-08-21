# 27 - Relay Recovery

## Repair

A validated package from `azure-functions/acs-email-relay` was uploaded to the existing `stjm1acsrelay/function-releases` container, and the existing Function App was repointed to the fresh package URL.

| Field | Evidence |
| --- | --- |
| Package blob | `20260821072622-b99c23e04a2a-deps.zip` |
| Package SHA-256 | `79039538ea6717347edfb092be4ee91615e4f2cf3e917a2ba834649964289961` |
| Source release SHA | `b99c23e04a2aa217b4051419cb3975005d0b7774` |
| Package URL expiry | `2027-08-21T07:26Z` |
| Function restart | completed |

No relay resource was deleted or recreated. No ACS direct-send bypass was used.

## Validation

| Probe | Result |
| --- | --- |
| `GET /` | HTTP 200 Azure Functions host page |
| `POST /api/send-author-acknowledgment` without relay key | HTTP 401 JSON, `UNAUTHORIZED` |
| `POST /api/send-join-internal-notification` without relay key | HTTP 401 JSON, `UNAUTHORIZED` |
| Function enumeration | expected five routes discovered and enabled |

## Registered Routes

- `send-agreement-package`
- `send-approved-author-response`
- `send-author-acknowledgment`
- `send-internal-author-draft-review-notification`
- `send-join-internal-notification`

## Monitoring Addition

The Publishing `/api/health` route now includes `relayHost`, an unauthenticated handler reachability probe. It expects relay-level `401` JSON from `send-author-acknowledgment`; platform `503` or non-handler responses degrade health.

