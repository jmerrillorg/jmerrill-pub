# Application User Readback

- Reused import identity: `JMP JM1-INFRA-PAM-Automation`.
- Application ID: `1e60cddf-dd28-4933-a927-dbc03bb89737`.
- JM1-Test system user: `c7796849-2fa9-f111-aaab-002248046451`.
- State: enabled; non-interactive application user.
- Existing role: `System Administrator`.
- This packet created no identity and changed no role assignment.

The shared import identity is sufficient for native solution transport but is overbroad for a dedicated Phase 6 runtime. Production promotion is blocked until the calling runtime is identified and bound to a reviewed least-privilege role. Do not remove or alter the shared role from this workstream because its cross-workstream dependencies are not established.
