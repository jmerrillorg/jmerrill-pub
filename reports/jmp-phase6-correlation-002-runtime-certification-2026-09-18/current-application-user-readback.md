# JM1-Test Application User Readback

## Dedicated Phase 6 caller

- Runtime: `func-jm1-publishing-inbound-uat`
- Runtime type: Azure Function / Linux / Node 22 / system-assigned managed identity
- Application user: `JMP Phase 6 func-jm1-publishing-inbound-uat`
- Application ID: `2c9c1fc3-5733-4a64-b4e2-9a3cef50d470`
- Entra object/principal ID: `fd1939f0-8767-4402-af5b-25d9f53de21a`
- Dataverse system user ID: `c8b4a60b-1ab4-f111-aaac-70a8a59b112b`
- Enabled: yes
- Direct security role: `JMP Phase 6 Onboarding Runtime - JM1-Test`
- Effective privileges: 41
- Delete / assign / share / security administration: none
- Token acquisition and live Custom API invocation: pending runtime proof

## Preserved shared administrative identity

- Display name: `JMP JM1-INFRA-PAM-Automation`
- Application ID: `1e60cddf-dd28-4933-a927-dbc03bb89737`
- Entra object ID: `cefcfa8f-5a3c-4fc7-afcb-8c76cfa77c8f`
- Dataverse system user ID: `c7796849-2fa9-f111-aaab-002248046451`
- Enabled: yes
- Direct security role: `System Administrator`
- Team: `jm1test`
- Team security roles: none
- Effective privileges: 7,089 total; 7,047 global; 960 delete; 667 assign; 642 share
- Security-role administration privileges: present

Repository governance proves this identity is shared with editorial and agent/runtime workloads. Removing System Administrator in this packet would create unbounded collateral risk. The current identity therefore cannot prove Phase 6 least privilege while its shared administrator assignment remains effective.

The shared identity remains unchanged for its existing administrative/import workloads. Phase 6 no longer depends on assigning runtime authority to it. It is not the target caller and will not be used as least-privilege proof.
