# Security and Rollback

Last verified: 2026-08-07T20:52:37.069456Z

## Security Posture

Repo-side lifecycle standard and guard are now present. Production deployment workflow is intentionally fail-closed until a governed federated PAC identity is commissioned.

No secret values were committed.

## Production Change Performed

A narrow solution-boundary repair was performed in JM1-Core using PAC: the already-existing generated BPF entity `jm1pub_publishingopportunityprocess` was added to `JM1PublishingSales` with required components. This was required because PAC export failed without it.

## Rollback

No business data rollback is required. If solution-boundary rollback were required, remove the BPF entity component from `JM1PublishingSales`; however, doing so would restore the export blocker.
