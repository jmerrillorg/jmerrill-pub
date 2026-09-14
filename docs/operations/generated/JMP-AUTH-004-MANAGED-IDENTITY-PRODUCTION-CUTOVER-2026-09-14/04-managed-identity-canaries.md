# Managed Identity Canaries

Canaries were executed from inside the production App Service host using App Service SSH.

## Host managed identity markers

- IDENTITY_ENDPOINT = present
- IDENTITY_HEADER = present
- MSI_ENDPOINT = present
- MSI_SECRET = present
- Node runtime = v24.18.0

## Dataverse canary

Token claims:

- audience = https://jm1hq.crm.dynamics.com
- oid = ce363f5a-94f3-4ea9-9ba3-061404fca098
- appid = e7b7f038-4016-4a3a-93d8-cecd0eda9159
- idtyp = app

Dataverse calls:

- WhoAmI status = 200
- Dataverse application user id = e0e307e1-2fb0-f111-aaac-000d3a14673b
- business unit id = b589d1e7-e690-f011-b4cc-7c1e525b3eb3
- RetrieveCurrentOrganization status = 200

Application-user role readback:

- JM1 Publishing Editorial Writeback - Core
- JM1 Publishing Controlled Activation - Opportunity Update
- JM1 Publishing Intake API - Workspace Writeback
- JM1 Publishing Diagnostic Runner - Least Privilege
- Basic User
- System Administrator absent = true

DATAVERSE_MI_CANARY = PASS

## Graph/SharePoint canary

Token claims:

- audience = https://graph.microsoft.com
- oid = ce363f5a-94f3-4ea9-9ba3-061404fca098
- appid = e7b7f038-4016-4a3a-93d8-cecd0eda9159
- idtyp = app
- roles = Sites.Selected

SharePoint target:

- site = https://jmerrillfoundation.sharepoint.com/sites/publishing
- site read status = 200
- site id = jmerrillfoundation.sharepoint.com,35fb0d98-bc68-4250-9d0d-8c07d68e4024,10208ad5-0028-48f0-9ffa-717812924835
- drive discovery status = 200
- drive name = Documents
- drive id = b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se
- metadata root read status = 200

Bounded safe write/delete canary:

- path = 01_Pre-Pipeline/00_Inquiry/_auth-canary/
- file created = JMP-AUTH-004 timestamped text file
- create status = 201
- created item id = 01DF3SEQNJDN4RZ7QNCRGIWCPY7DWPI2D6
- content sha256 = 1346af9a692471cfcfffc65acc2bf620703c95f18c96e96ce9fb8af794b73ba2
- cleanup delete status = 204

GRAPH_SHAREPOINT_MI_CANARY = PASS

## Final post-cutover compact canary

After the later production deployment, a second compact canary observed:

- release = 28b2e6fd988c92d5b0045593d43a78b6aa97daac
- mode = MANAGED_IDENTITY
- Dataverse token = present
- Dataverse WhoAmI status = 200
- Graph token = present
- Graph site status = 200
- Graph drive discovery status = 200
- Documents drive discovered = true
