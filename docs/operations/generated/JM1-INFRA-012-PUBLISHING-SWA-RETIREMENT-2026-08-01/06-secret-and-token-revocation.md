# Secret and Token Revocation

## GitHub Actions Secrets

Deleted repository Actions secrets:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_CALM_PLANT_0F4F58410`

Post-delete secret-name scan returned no names matching `AZURE_STATIC_WEB_APPS`, `STATIC_WEB`, or `SWA`.

## Azure SWA Configuration

The SWA resource held obsolete Publishing app settings. The resource was deleted, removing the SWA-hosted configuration copy.

## Contained Output Event

`az staticwebapp appsettings list` returned raw setting values during the initial inventory. The values were visible only in the private Cody terminal session and were not copied into evidence, source, PR comments, generated reports, screenshots, or logs under this package.

Classification: `CONTAINED_OPERATOR_SESSION_OUTPUT`.

Containment performed:

- stopped using raw app-setting output;
- used name/metadata-only queries afterward;
- deleted the obsolete SWA resource;
- preserved only setting names and configuration classes in evidence.

Further action:

- credential rotation for shared production secrets is a separate security-administration decision because App Service uses Key Vault-backed references and those production credentials may have dependencies outside SWA.

