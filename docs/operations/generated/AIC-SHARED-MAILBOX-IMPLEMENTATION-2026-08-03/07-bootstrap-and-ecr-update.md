# Bootstrap And ECR Update

## Bootstrap

The JM1 bootstrap now recognizes the Agape Shared Mailbox Implementation initiative and loads AIC-specific production authority:

- Brand: Agape International Cathedral
- Tenant: JM1
- Primary domain: agapeic.org
- Legacy `.com` scope: excluded
- Separate tenant migration: not planned
- Mailbox model: role-based shared mailboxes
- Direct shared-mailbox sign-in: prohibited
- Communication renderer: JM1 Enterprise Communication Renderer
- Brand overlay: `agapeInternationalCathedral`

## Fail-Closed Codes

- `AIC_UNAPPROVED_SENDER`
- `AIC_LEGACY_DOMAIN_SELECTED`
- `AIC_SHARED_MAILBOX_DIRECT_SIGNIN`
- `AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED`
- `AIC_ECR_OVERLAY_NOT_LOADED`
- `AIC_DOMAIN_NOT_PRESENT_IN_M365`
- `AIC_DOMAIN_NOT_VERIFIED_IN_M365`
- `AIC_EXCHANGE_READINESS_NOT_CONFIRMED`

## ECR Overlay

The Agape overlay uses:

- Brand name: Agape International Cathedral
- Primary domain: agapeic.org
- Primary email: info@agapeic.org
- Administrative email: office@agapeic.org
- Website: agapeic.org

The overlay does not describe Agape as a public division of J Merrill One. It records infrastructure governance within the JM1 tenant while preserving Agape International Cathedral as the public identity.

