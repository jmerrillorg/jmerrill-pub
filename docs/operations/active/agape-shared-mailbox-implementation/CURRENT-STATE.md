# Current State - Agape Shared Mailbox Implementation

Updated: 2026-08-03

## Authority

- Brand: Agape International Cathedral.
- Tenant: JM1.
- Primary domain: `agapeic.org`.
- Separate Agape tenant: NOT PLANNED.
- Legacy `.com` scope: EXCLUDED.
- Mailbox model: role-based shared mailboxes with licensed JM1/AIC delegates.
- Direct shared-mailbox sign-in: PROHIBITED.

## Readback

- Azure DNS zone `agapeic.org`: CONFIRMED in `agape-international-cathedral-rg`.
- Nameservers: Azure DNS.
- Website DNS: PRESERVED in current plan.
- Microsoft 365 domain present: NO.
- Microsoft 365 domain verified: NO.
- Exchange services configured: NO.

## Held

- Domain verification must complete before Exchange mailbox mutation.
- Delegates must be resolved before permissions are granted.
- Pilot shared mailboxes cannot be created until `agapeic.org` is present and verified in Microsoft 365.

## Must Not

- Do not create, alias, migrate, restore, forward, or preserve any `@agapeic.com` mailbox or alias.
- Do not change nameservers.
- Do not delete the Azure DNS zone.
- Do not create `donate@agapeic.org` or `seed@agapeic.org` as standalone mailboxes.
- Do not create `bishopmcintoshspeaks@agapeic.org` without later approval.
- Do not enable DMARC enforcement beyond `p=none` without separate authorization.

## Next Authorized Action

Add `agapeic.org` to Microsoft 365, obtain the TXT verification record, add it to the current Azure DNS zone, and verify the domain. Stop before mailbox mutation until Exchange readiness and delegate identity resolution are confirmed.
