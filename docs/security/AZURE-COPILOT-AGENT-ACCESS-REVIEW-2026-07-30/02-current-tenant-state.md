# Current Tenant State

Tenant: 352d075e-8e17-4169-9f8e-22e6946ce66d  
Observed account: jm1-admin@jmerrill.one  
Directory: J Merrill Foundation, Inc.  
MFA: Present during portal session

## Azure CLI Subscription Readback

Subscriptions visible to Azure CLI:

- JM1 Commercial Hub PAYG: 5188eaf9-af40-4753-a271-34782dc9002a
- JM1 Nonprofit Core: 9ee13245-2303-4010-8b6d-35f7cbcfdc0e

Observed provider registration:

- Microsoft.SecurityCopilot: NotRegistered in both visible subscriptions
- Microsoft.OperationalInsights: Registered in JM1 Nonprofit Core, NotRegistered in JM1 Commercial Hub PAYG
- Microsoft.PolicyInsights: Registered in both visible subscriptions

Observed Copilot-specific role assignments:

- Copilot role assignment count across visible subscriptions: 0
- Role definition containing "Copilot" observed in this CLI context: Edge Management Copilot User
- Copilot for Azure User role definition was not returned by the CLI query in this session

## Azure Portal Readback

The Azure Copilot admin center was reachable through Azure Portal search. Access management displayed a prerequisite warning that adjusting Azure Copilot availability requires access to all Azure subscriptions and management groups in the tenant.

Tenant-level Azure Copilot enablement state: Not proven writable in this session  
Agents preview request state: Not proven writable in this session

