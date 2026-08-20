# Source Inventory

## Located Repository Sources

| Source | Location | Status |
|---|---|---|
| Manual editorial canon cache | `docs/implementation/canon-cache/jm1-publishing-editorial/` | FOUND |
| Skill router | `docs/implementation/canon-cache/jm1-publishing-editorial/SKILL.md` | FOUND / UPDATED |
| Source manifest | `docs/implementation/canon-cache/jm1-publishing-editorial/SOURCE-MANIFEST.md` | FOUND / UPDATED |
| PR #519 alignment evidence | `docs/operations/generated/JMP-MANUAL-AUTONOMOUS-PIPELINE-ALIGNMENT-2026-08-19/` at PR head `6fb982f4...` | FOUND VIA GIT |

## Updated Manual Source Package

PR #519 identifies the updated manual GPT source package as `JMP-GPTs_2.zip`.
That package was not located in the repository, Codex attachment paths, or the
searched OneDrive paths during this synchronization pass.

Classification: `SOURCE_PACKAGE_NOT_LOCATED_LOCALLY`

Because the zip was not reachable, this pass synchronized the repository's
manual canon cache as the available repo-backed mirror and applied Founder
corrections over older conflicting cache language.

## Repo Gaps Found

`SKILL.md` referenced files that were missing from `origin/main`:

- `references/editorial-review.md`
- `references/distribution-review.md`
- `references/cover-intelligence.md`
- `references/brand-infrastructure.md`
- `references/blog-editorial.md`

This pass restored the Publishing editorial components in scope:

- `references/editorial-review.md`
- `references/distribution-review.md`
- `references/cover-intelligence.md`
- `references/jmp_cover_genre_guide.md`
- `references/jmp_cover_layout_guide.md`
- `references/jmp_cover_production_specs.md`

Brand Infrastructure and Blog Editorial are outside this instruction's seven
manual editorial components.
