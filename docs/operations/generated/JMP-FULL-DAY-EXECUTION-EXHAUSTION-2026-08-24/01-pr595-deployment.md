# PR #595 Deployment

Last Verified: 2026-08-24T21:46:27.044Z

PR #595 was merged at `c48661150f541747e205701328707d9eeae08c92`.

The diagnostic runner deployment workflow failed because the health endpoint still reported the prior release during the workflow readback window. A direct post-failure live health check returned:

```json
{
  "status": "ready",
  "release": "c48661150f541747e205701328707d9eeae08c92",
  "productionRelease": "c48661150f541747e205701328707d9eeae08c92",
  "node": "v22.23.2"
}
```

The workflow rollback step also failed because the rollback SAS expiry requested 365 days, which Azure user-delegation SAS rejects. This is preserved as deployment evidence; live runtime health is currently ready on the merged release.
