# Governance And Authority

Canonical document added:

`docs/governance/publishing/PUB-STD-Onboarding-First-Production-Authority.md`

## Current Authority Model

Author-selectable production attributes resolve in this order:

1. Valid author onboarding selection
2. Governed genre or book-type default
3. Governed JMP production exception

Lifecycle-derived title authorities do not use genre fallback:

- final trim;
- final page count;
- imprint;
- approved back-cover copy;
- ISBN / barcode / distribution requirements.

## Existing Onboarding Production Fields

Current onboarding already exposes:

- preferred trim size;
- interior color preference;
- paper type preference;
- binding type;
- cover finish preference;
- author photo on back cover;
- intended print formats / governed format selection.

Current gap:

- option availability is not yet fully constrained by genre, provider, package, and format in the public onboarding UI.

The runtime remediation does not fabricate legacy author selections. Where no valid author choice exists, it applies a governed profile fallback and records `GENRE_DEFAULT` provenance.

## Genre / Book-Type Profiles

Runtime profile framework established for:

- standard text-forward nonfiction;
- leadership / business;
- memoir;
- devotional;
- poetry;
- novel / narrative fiction;
- children's picture book;
- workbook / journal.

Physical defaults are treated as `CANON-CANDIDATE` profile defaults where recovered provider/title authority is not yet more specific.
