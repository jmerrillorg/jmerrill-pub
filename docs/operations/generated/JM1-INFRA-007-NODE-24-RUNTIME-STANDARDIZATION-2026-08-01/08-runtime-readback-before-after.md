# Runtime Readback Before / After

## Azure Supported Runtime Readback

Command class:

`az webapp list-runtimes --os linux`

Result:

- `NODE|24-lts` present
- `NODE|22-lts` present

## App Service Staging Before

Target: `app-jm1-pub-prod/staging`

```json
{
  "alwaysOn": true,
  "appCommandLine": "node server.js",
  "ftpsState": "Disabled",
  "linuxFxVersion": "NODE|20-lts"
}
```

App settings readback:

```json
[
  { "name": "WEBSITE_RUN_FROM_PACKAGE", "value": "1", "slotSetting": false },
  { "name": "WEBSITE_NODE_DEFAULT_VERSION", "value": "~20", "slotSetting": false },
  { "name": "JM1_RELEASE_SHA", "value": "bc64b314c949cfd177b5b8e59efa1a6208cacc4a", "slotSetting": true }
]
```

## App Service Staging After

Pending until staging-only runtime update and deployment certification complete.

