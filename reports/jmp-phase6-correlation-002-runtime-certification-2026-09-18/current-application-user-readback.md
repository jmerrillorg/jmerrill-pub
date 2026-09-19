# Current JM1-Test Application User

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

JM1-Test has no Phase 6-specific or onboarding-specific security role and no separate custom application user that is currently proven as the Phase 6 runtime caller.
