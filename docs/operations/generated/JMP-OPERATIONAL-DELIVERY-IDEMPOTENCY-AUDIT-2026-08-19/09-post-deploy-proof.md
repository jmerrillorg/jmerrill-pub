# Post-Merge Verification

## Merge status
- PR #517: **MERGED**, squash SHA `0ec66d1f576126f3d003bfa9483ca00096522762`
- PR #518: **MERGED**, squash SHA `c8c98d0a35b993b4fae9d0a72b0bb05cda0f15c1`
- `origin/main` HEAD at time of Long Watch reconciliation: `c8c98d0a35b993b4fae9d0a72b0bb05cda0f15c1` (confirmed via `git log -1`)

## Deployment: gap found, not resolved

**No CI/CD pipeline exists in this repository for deploying to `app-jm1-pub-prod-v2`** (searched `.github/workflows/` — only `azure-static-web-apps.yml`, which targets unrelated Static Web Apps). The App Service's deployment source shows no GitHub Action integration (`isGitHubAction: false`, `repoUrl: null`) — it is deployed by some external/manual process not visible in this repository.

**I did not attempt to build and deploy the Next.js app to production myself.** That is a materially different, higher-risk action than reviewing and merging code, and I have no confidence I'd replicate whatever the correct release process actually is — a mistake there risks the live Publisher/Author portals, not just this one fix.

**Practical consequence**: the actual reconciliation (Before You Were Born and The Long Watch) was performed by running the real, merged `origin/main` code directly (via `tsx`) against production Dataverse — not through the deployed App Service, which may still be running pre-fix code until someone runs the real deployment process. `origin/main` SHA and the live App Service's running SHA are **not confirmed equal** — this should be treated as an open item, not resolved.

## What was verified
- `npx tsc --noEmit`: clean, 0 errors, both post-#517 and post-#518-with-tests.
- #517: 25/25 tests pass (fresh worktree, fresh `npm install`).
- #518: 6/6 new deterministic tests pass; live idempotency proof (3 consecutive calls → 1 execution log) for a disposable test package, and again for the real Long Watch reconciliation (1 replay → idempotent, no duplicate, no clock change).
