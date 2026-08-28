# Deployment Readback

Last Verified: 2026-08-28T08:23:19.373Z
Health URL: https://jmerrill.pub/api/health
```json
{
  "service": "jmerrill-pub",
  "status": "ready",
  "release": "f8770aff2b37b1da4d1e21d0ceaf2a16e1ee8608",
  "checkedAt": "2026-08-28T08:24:14.413Z",
  "paymentGate": "disabled",
  "dependencies": {
    "configuration": {
      "status": "ready",
      "required": [
        "NODE_ENV"
      ],
      "present": [
        "NODE_ENV"
      ],
      "missing": []
    },
    "dataverse": {
      "status": "ready",
      "required": [
        "DATAVERSE_TENANT_ID",
        "DATAVERSE_CLIENT_ID",
        "DATAVERSE_CLIENT_SECRET",
        "DATAVERSE_RESOURCE_URL",
        "DATAVERSE_WEB_API_BASE_URL"
      ],
      "present": [
        "DATAVERSE_TENANT_ID",
        "DATAVERSE_CLIENT_ID",
        "DATAVERSE_CLIENT_SECRET",
        "DATAVERSE_RESOURCE_URL",
        "DATAVERSE_WEB_API_BASE_URL"
      ],
      "missing": []
    },
    "graph": {
      "status": "ready",
      "required": [
        "SHAREPOINT_TENANT_ID",
        "SHAREPOINT_CLIENT_ID",
        "SHAREPOINT_CLIENT_SECRET"
      ],
      "present": [
        "SHAREPOINT_TENANT_ID",
        "SHAREPOINT_CLIENT_ID",
        "SHAREPOINT_CLIENT_SECRET"
      ],
      "missing": []
    },
    "acs": {
      "status": "ready",
      "required": [
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL",
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY"
      ],
      "present": [
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL",
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY"
      ],
      "missing": []
    },
    "artifact": {
      "status": "ready",
      "required": [
        "JOIN_WORKSPACE_INQUIRY_ROOT"
      ],
      "present": [
        "JOIN_WORKSPACE_INQUIRY_ROOT"
      ],
      "missing": []
    },
    "authorPortal": {
      "status": "ready",
      "required": [
        "AUTHOR_PORTAL_SESSION_SECRET"
      ],
      "present": [
        "AUTHOR_PORTAL_SESSION_SECRET"
      ],
      "missing": []
    },
    "stripeEnrollment": {
      "status": "ready",
      "required": [
        "STRIPE_CONNECT_SECRET_KEY",
        "JM1_STRIPE_CONNECT_ENABLED",
        "JM1_STRIPE_MODE"
      ],
      "present": [
        "STRIPE_CONNECT_SECRET_KEY",
        "JM1_STRIPE_CONNECT_ENABLED",
        "JM1_STRIPE_MODE"
      ],
      "missing": []
    },
    "relayHost": {
      "status": "ready",
      "required": [
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL"
      ],
      "present": [
        "JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL"
      ],
      "missing": [],
      "notes": [
        "relay_handler_reachable_unauthorized_probe"
      ]
    }
  }
}
```
