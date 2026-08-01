# Remaining Exceptions

## EX-INFRA013-001 - One App Service Is Not Public-Site Certified

Risk: DNS cutover would replace the public site with a minimal runtime.
Production impact: high if cut over prematurely.
Recommended remediation: deploy and certify the real `jmerrill.one` app on App Service before DNS changes.
Blocking: Yes for `jmerrill.one` SWA retirement.

## EX-INFRA013-002 - Financial App Service Is Not Public-Site Certified

Risk: DNS cutover would replace the public site with a minimal runtime.
Production impact: high if cut over prematurely.
Recommended remediation: deploy and certify the real `jmerrill.financial` app on App Service before DNS changes.
Blocking: Yes for `jmerrill.financial` SWA retirement.

## EX-INFRA013-003 - Foundation App Service Is Not Public-Site Certified

Risk: DNS cutover would replace the public site with a minimal runtime.
Production impact: high if cut over prematurely.
Recommended remediation: deploy and certify the real `jmerrill.foundation` app on App Service before DNS changes.
Blocking: Yes for `jmerrill.foundation` SWA retirement.

## EX-INFRA013-004 - Productions Production App Service Unhealthy

Risk: App Service production endpoint returns 503.
Production impact: high if cut over prematurely.
Recommended remediation: continue frozen GATE-W3 Microsoft/support exception lane for `app-jm1-productions-prod`.
Blocking: Yes for Productions SWA retirement.

## EX-INFRA013-005 - Redirector Replacement Not Certified

Risk: retiring redirector SWAs before replacements would break traffic.
Production impact: medium to high depending on route.
Recommended remediation: replace redirectors with approved App Service or Azure-native redirect path, validate, then retire.
Blocking: Yes for redirector SWA retirement.

## EX-INFRA013-006 - Separate Enterprise Properties

Risk: migrating separate legal/personal/client properties under JM1 commercial authority would cross governance boundaries.
Production impact: variable.
Recommended remediation: handle AIC, personal-brand, and non-JM1 client properties under their own gates.
Blocking: No for JM1 commercial Publishing certification; yes for any universal web-hosting inventory claim.

