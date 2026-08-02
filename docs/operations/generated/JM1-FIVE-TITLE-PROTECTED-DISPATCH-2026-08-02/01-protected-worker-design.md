# Protected Worker Design

## Authentication

The production dispatch route accepts only a GitHub Actions OIDC bearer token.

Required claims:

- Issuer: `https://token.actions.githubusercontent.com`
- Audience: `jm1-pub-executive-recovery-dispatch`
- Repository: `jmerrillorg/jmerrill-pub`
- Subject: `repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production`

The endpoint verifies the JWT signature using GitHub's OIDC JWKS and rejects incorrect issuer, audience, repository, subject, expired tokens, and future-issued tokens.

## Execution Controls

- Exact five-title allowlist.
- `EXECUTIVE_RECOVERY=true` required for dry-run and confirmed modes.
- Confirmed execution additionally requires `confirmation=EXECUTIVE_RECOVERY`.
- GitHub workflow uses concurrency group `five-title-executive-recovery-dispatch`.
- Dry-run returns readback and proposed mutations without writes or sends.
- Confirmed execution fails closed if title authority, contact, current stage, recipient, package artifacts, or duplicate gate controls do not pass.

## Delivery Controls

Confirmed execution uses the approved ACS relay route:

- From: `publishing@email.jmerrill.one`
- Reply-To: `publishing@jmerrill.one`
- Archive: `publishing@jmerrill.one`

The route writes execution evidence and updates the gate/stage only after ACS accepts delivery.
