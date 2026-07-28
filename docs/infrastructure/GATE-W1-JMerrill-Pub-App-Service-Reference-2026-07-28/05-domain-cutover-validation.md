# Domain Cutover Validation

## DNS Zone

- Zone: jmerrill.pub
- Zone location: jm1-core-services
- Cutover scope: Publishing only

## Pre-Cutover Snapshot

- Apex A: 172.170.119.25
- www CNAME: calm-plant-0f4f58410.6.azurestaticapps.net
- TTL: 3600

## App Service Verification Records

TXT records were added for:

- asuid.jmerrill.pub
- asuid.www.jmerrill.pub

The verification value was not treated as a secret, but it is omitted here because the important evidence is successful hostname binding.

## Hostname Bindings

- jmerrill.pub: SNI enabled
- www.jmerrill.pub: SNI enabled

## Certificate Bindings

- jmerrill.pub thumbprint: F22F8B44A0E25E8264DD4E200B322062BAF8B2AE
- jmerrill.pub expiration: 2027-01-28T23:59:59+00:00
- www.jmerrill.pub thumbprint: A19F3830D9A89D156F753078894D1E01989D3E62
- www.jmerrill.pub expiration: 2027-01-28T23:59:59+00:00

TLS verification against the App Service IP passed for both hostnames with SSL verify result 0.

## DNS Cutover

Public resolver readback:

- jmerrill.pub resolves to 40.122.114.229
- www.jmerrill.pub resolves through app-jm1-pub-prod.azurewebsites.net to 40.122.114.229

## Canonical Runtime

The canonical apex and www hostnames returned /api/health 200 against the App Service target IP and reported the expected release SHA.

## Propagation Note

Some local resolver paths may retain the old Static Web Apps target until TTL expiry. Authoritative public resolver checks confirmed App Service targets.
