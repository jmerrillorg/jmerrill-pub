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

```json
{
  "alwaysOn": true,
  "appCommandLine": "node server.js",
  "ftpsState": "Disabled",
  "linuxFxVersion": "NODE|24-lts"
}
```

App settings readback:

```json
[
  { "name": "WEBSITE_RUN_FROM_PACKAGE", "value": "1", "slotSetting": false },
  { "name": "WEBSITE_NODE_DEFAULT_VERSION", "value": "~24", "slotSetting": false },
  { "name": "JM1_RELEASE_SHA", "value": "matched deployed workflow head SHA", "slotSetting": true }
]
```

## Azure Functions Runtime Readback

Azure Functions supported runtime readback included `Node|24`.

| Function App | Before | Node 24 attempt | Final |
| --- | --- | --- | --- |
| `func-jm1-acs-email-relay` | `Node|22` | `Node|24`, protected probe 503 | `Node|22`, protected probe 401 |
| `func-jm1-diagnostic-ai-runner` | `Node|22` | `Node|24`, protected probe 503 | `Node|22`, protected probe 401 |
