# Security and Rollback

Last verified: 2026-08-07T20:52:37.069456Z

## Security Posture

Repo-side lifecycle standard and guard are now present. The governed federated PAC identity is commissioned. Production deployment proof passed in GitHub Actions run `31247571393`.

No secret values were committed.

## Production Change Performed

A narrow solution-boundary repair was performed in JM1-Core using PAC: the already-existing generated BPF entity `jm1pub_publishingopportunityprocess` was added to `JM1PublishingSales` with required components. This was required because PAC export failed without it.

2026-08-08 commissioning change: existing option sets `jm1pub_imprint` and `jm1_manuscripttype` were added to the JM1PublishingSales solution boundary, and a Dataverse application user for `jm1-pub-github-actions-oidc` was created with the `System Customizer` role. No business data was changed.

## Rollback

No business data rollback is required. If solution-boundary rollback were required, remove the BPF entity component from `JM1PublishingSales`; however, doing so would restore the export blocker.
