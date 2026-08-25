# Full Wrap Runtime Contract

## Repaired Input Classes

Title-specific authorities:

- trim;
- imprint;
- final page count;
- approved front cover;
- current final interior proof;
- approved back-cover copy.

Author-selectable / genre-fallback attributes:

- interior color mode;
- paper color;
- paper stock;
- paper weight;
- paperback finish;
- hardcover construction;
- hardcover finish.

Derived values:

- spine width;
- full-wrap width;
- full-wrap height;
- bleed;
- safe-area constraints.

Conditional commercial metadata:

- ISBN;
- barcode;
- distribution path;
- publication launch requirement.

## Commissioning Behavior

When `publicationIntent` is `NON_RELEASE`, `COMMISSIONING`, `INTERNAL`, `PROTOTYPE`, `PROOF`, `ARCHIVAL`, or `ARCHIVAL_NON_RELEASE`:

- ISBN is not required;
- barcode is not required;
- distribution path is not required;
- publication launch is not required;
- fake commercial placeholders are not generated.

## Commercial Release Behavior

When `publicationIntent` is `COMMERCIAL_RELEASE`, ISBN, barcode, and distribution remain enforced where the edition/format/distribution policy requires them.
