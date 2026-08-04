# Lane 1 Bootstrap/ECR Readback

## Current Main

- `origin/main`: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`.
- PR #405: MERGED.

## Runtime

- Staging health: 200 / ready.
- Staging release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`.
- Production health: 200 / ready.
- Production release: `fdd01eff41f511f2f1d0970299e4127d34b4cbb8`.

## Guard

`jm1-commissioning-guard` was run in a detached clean current-main worktree because this closeout branch contains evidence commits ahead of `origin/main`.

Result: PASS, 13 / 13.

## Protected Routes

- `/api/publishing/dispatch/author-package`: 401 unauthenticated.
- `/api/publishing/dispatch/author-package/certify`: 401 unauthenticated.
- `/api/publishing/executive-recovery/dispatch`: 401 unauthenticated.
- `/api/publisher/operating-center`: 401 unauthenticated using GET.

## Side Effects

- Author communications: 0.
- Runtime data mutations: 0.
- Secret values retained: 0.
