# Pre-Upgrade Validation

## jm1coreservices8242

Resource group: `jm1-core-services`
Region: `eastus`
Pre-upgrade kind: `Storage`
SKU: `Standard_LRS`
Access tier: not applicable before upgrade
Provisioning state: `Succeeded`
HTTPS only: true
Minimum TLS: `TLS1_2`
Public blob access: false
Public network access: enabled
Network rules: no IP or virtual network rules returned
Private endpoints: none identified
File shares: none
Blob containers:

- `app-package-jm1-ed-functions-c3c042f`
- `azure-webjobs-hosts`
- `azure-webjobs-secrets`

Dependent Function App: `jm1-ed-functions`
Pre-upgrade app state: running
Pre-upgrade probe: HTTP 401, expected protected response
Used capacity metric: 653092 bytes

## funcjm1foundationin8054

Resource group: `func-jm1-foundation-intake_group`
Region: `eastus2`
Pre-upgrade kind: `Storage`
SKU: `Standard_LRS`
Access tier: not applicable before upgrade
Provisioning state: `Succeeded`
HTTPS only: true
Minimum TLS: `TLS1_2`
Public blob access: false
Public network access: enabled
Network rules: no IP or virtual network rules returned
Private endpoints: none identified
File shares: none
Blob containers:

- `app-package-func-jm1-foundation-intake-03d9775`
- `azure-webjobs-hosts`
- `azure-webjobs-secrets`

Dependent Function App: `func-jm1-foundation-intake`
Pre-upgrade app state: running
Pre-upgrade probe: HTTP 200
Used capacity metric: 2388443 bytes

## Limitations

Azure CLI Resource Health helper was unavailable in this local environment because the command extension failed to load. ARM state, storage account provisioning state, dependent Function App state, HTTPS probes, and post-upgrade readbacks were used as the operational validation basis.
