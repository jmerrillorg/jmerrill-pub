# SWA Resource Retirement

## Resource Deleted

| Field | Value |
| --- | --- |
| Name | `jmerrill-pub` |
| Resource group | `jmerrill-pub` |
| Type | `Microsoft.Web/staticSites` |
| Default hostname | `calm-plant-0f4f58410.6.azurestaticapps.net` |
| Repository | `https://github.com/jmerrillorg/jmerrill-pub` |
| Location | Central US |
| SKU | Free |

## Deletion Proof

`az staticwebapp list` returned no `jmerrill-pub` resource after deletion.

`https://calm-plant-0f4f58410.6.azurestaticapps.net/` returned 404 after deletion.

## Domains

Before deletion, SWA custom-domain metadata listed:

- `jmerrill.pub`
- `www.jmerrill.pub`

After deletion, these domains remain bound and healthy on App Service.

