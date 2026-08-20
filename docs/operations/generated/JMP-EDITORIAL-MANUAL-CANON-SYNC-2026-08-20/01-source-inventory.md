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
Jackie provided the package after the initial PR was opened.

| Item | Value |
|---|---|
| Source package path | `/Users/jmerrillone/Downloads/JMP-GPTs_2.zip` |
| SHA-256 | `53a85a57aaf1b7bf7a1d09182dbf033713bc239866b150591447374997708886` |
| Extracted package root | `JMP-GPTs/` |
| Classification | `SOURCE_PACKAGE_LOCATED_AND_IMPORTED` |

The repository cache is synchronized from this source package with Founder
corrections applied where later Founder authority supersedes stale source text.

## Repo Gaps Found

`SKILL.md` referenced files that were missing from `origin/main`:

- `references/editorial-review.md`
- `references/distribution-review.md`
- `references/cover-intelligence.md`
- `references/brand-infrastructure.md`
- `references/blog-editorial.md`

This pass restored the Publishing editorial components in scope and the related
manual-package references now present in the zip:

- `references/editorial-review.md`
- `references/distribution-review.md`
- `references/cover-intelligence.md`
- `references/jmp_cover_genre_guide.md`
- `references/jmp_cover_layout_guide.md`
- `references/jmp_cover_production_specs.md`
- `references/brand-infrastructure.md`
- `references/jackie-personal-blog.md`
- `references/blog-editorial.md`
- `references/jm1_blogging_architecture_decision_framework.md`
- `references/jm1_branch_editorial_matrix.md`
- `references/jm1_enterprise_content_architecture.md`
- `references/jm1_visual_identity_governance.md`
