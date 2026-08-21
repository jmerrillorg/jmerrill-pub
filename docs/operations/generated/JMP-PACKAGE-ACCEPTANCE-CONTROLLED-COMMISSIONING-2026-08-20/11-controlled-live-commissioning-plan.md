# Controlled Live Commissioning Plan

Last verified: 2026-08-21

## Post-Synthetic Mode

Allowed mode after synthetic pass: `OPERATOR_APPROVED_SEND_READY`.

Unrestricted automatic sends are not authorized.

## First Real Case Criteria

Use the next clean real prospect event after deployment.

Do not use Atta.

The real case must:

- originate through governed Publishing communication authority;
- be routed through `publishing@jmerrill.one`;
- have a clear package acceptance or fail closed;
- generate preview evidence;
- require operator approval before any author-facing send;
- keep auto-send disabled after the first controlled send.

## Explicitly Separate Lanes

Not included in PR #543:

- Joined-the-Family trigger
- referral-credit earning
- Author Workspace onboarding
- existing author recovery
- Atta payment or contract changes
