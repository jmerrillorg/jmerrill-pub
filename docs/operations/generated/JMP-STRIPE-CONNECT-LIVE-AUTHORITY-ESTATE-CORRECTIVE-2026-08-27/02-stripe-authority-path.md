# Stripe Authority Path

Last Verified: 2026-08-27T17:44:11.052Z

| Item | State |
| --- | --- |
| Working production authority | app-jm1-pub-prod-v2 |
| Resource group | rg-jm1-web-prod-premium |
| Stripe secret source | Azure App Service setting with Key Vault reference |
| Key Vault reference handling | RESOLVED BEFORE STRIPE CLIENT USE |
| Managed identity | SYSTEM ASSIGNED |
| Duplicate credential model | NO |
| Local literal Key Vault reference used as Stripe key | BLOCKED |

The 401 readback defect was caused by treating a Key Vault reference string as the Stripe secret in a local readback path. The reminder and corrective readback paths now resolve governed production app settings through the same Key Vault-backed authority used by the commissioned Connect runtime. Secret values are not recorded in evidence.
