# Production Configuration Readback

Azure subscription:

- subscription = JM1 - Nonprofit Core (2025 Grant)
- subscription id = 9ee13245-2303-4010-8b6d-35f7cbcfdc0e
- tenant id = 352d075e-8e17-4169-9f8e-22e6946ce66d
- signed-in operator = jm1-admin@jmerrill.one

Production App Service:

- app = app-jm1-pub-prod-v2
- resource group = rg-jm1-web-prod-premium

System-assigned managed identity:

- principal id = ce363f5a-94f3-4ea9-9ba3-061404fca098
- client/app id = e7b7f038-4016-4a3a-93d8-cecd0eda9159
- tenant id = 352d075e-8e17-4169-9f8e-22e6946ce66d
- identity type = SystemAssigned

Safe app-setting readback after cutover:

- PUBLISHER_RUNTIME_AUTH_MODE = MANAGED_IDENTITY
- JM1_RELEASE_SHA = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- DATAVERSE_CLIENT_SECRET = present, retained for rollback, value not exposed
- SHAREPOINT_CLIENT_SECRET = present, retained for rollback, value not exposed

Legacy app identifiers observed as safe metadata:

- DATAVERSE_CLIENT_ID = 71ec4dd0-d261-4ffc-9f5a-626d885ecc85
- SHAREPOINT_CLIENT_ID = 71ec4dd0-d261-4ffc-9f5a-626d885ecc85
- PUBLISHER_OPERATING_CENTER_CLIENT_ID = 7bd27a68-fda7-4330-9198-d493f2a0a5ef

No secret values, tokens, private keys, OTP material, or recovery codes were recorded in this evidence packet.
