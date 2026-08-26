# Human-First UI

Last Verified: 2026-08-26T23:40:00Z

## Author-Facing States

| State | Meaning |
| --- | --- |
| NOT_STARTED | Setup has not started |
| SETUP_IN_PROGRESS | Stripe still needs the author to continue |
| MORE_INFORMATION_NEEDED | Stripe needs more information |
| UNDER_REVIEW | Stripe has received submitted information and is reviewing |
| SETUP_COMPLETE | Setup is complete |
| SUPPORT_REQUIRED | JMP support should help issue a fresh setup link |

## Copy Controls

The page title and CTA now use direct-deposit language.

Blocked from the setup journey:

- activation code
- governed recovery
- payment readiness
- author-facing/internal system terminology
- runtime
- requirements object
- Connect account status token

The setup page tells authors that Stripe, not JMP, supplies any Stripe verification code.
