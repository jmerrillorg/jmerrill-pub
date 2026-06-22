"use strict";

/**
 * Computes the package-specific content model for the author-facing
 * Package Addendum — i.e. which sections apply to the author's actual
 * selected package only. Pure — no I/O, no document generation.
 *
 * This is a CONTENT MODEL, not a document generator: it answers "what
 * should appear" for a given package. Producing the actual single-
 * package-only addendum document requires either (a) a new, simplified,
 * single-package canonical template authored and approved by the
 * Publisher (recommended — safer than algorithmically deleting rows
 * from the existing multi-package template), or (b) Adobe Sign form-
 * field branching once that integration exists. Neither is built by
 * this module; it only defines the content that either approach must
 * present.
 */

const PACKAGE_CONTENT = Object.freeze({
  "JMP-PKG-PRO": Object.freeze({
    packageLabel: "Professional Publishing Package (JMP-PKG-PRO)",
    includedServices: Object.freeze([
      "Structural editorial review + line editing + copy editing + proofreading (up to 75,000 words)",
      "Enhanced cover design (3 concepts, 3 revision rounds, full wrap)",
      "Advanced interior layout & typography",
      "eBook conversion (EPUB via Ingram Content)",
      "Hardcover formatting (optional hardcover edition)",
      "ISBN assignment",
      "Ingram Content distribution setup",
      "Advanced metadata optimization",
      "Author profile page",
      "Launch planning session + marketing guidance",
      "AI audiobook production (included — no additional fee)"
    ]),
    complimentaryCopies: Object.freeze({ paperback: 10, hardcover: 2, ebook: 1 }),
    audiobookIncluded: true,
    estimatedDelivery: "10-12 weeks from manuscript receipt (audiobook: +2-3 weeks)"
  })
});

const EXCLUDED_PACKAGE_LABELS = Object.freeze([
  "Starter Publishing Package",
  "Signature Publishing Partnership",
  "Children's Book Publishing Package"
]);

/**
 * @param {string} packageCode
 * @returns {{
 *   ok: boolean, error: string|null,
 *   packageLabel: string|null, includedServices: string[]|null,
 *   complimentaryCopies: object|null, audiobookIncluded: boolean|null,
 *   estimatedDelivery: string|null, excludedSections: string[]
 * }}
 */
function buildPackageSpecificAddendumSections(packageCode) {
  const code = typeof packageCode === "string" ? packageCode.trim().toUpperCase() : "";
  const content = PACKAGE_CONTENT[code];

  if (!content) {
    return {
      ok: false,
      error: "PACKAGE_CONTENT_NOT_DEFINED",
      packageLabel: null,
      includedServices: null,
      complimentaryCopies: null,
      audiobookIncluded: null,
      estimatedDelivery: null,
      excludedSections: []
    };
  }

  return {
    ok: true,
    error: null,
    packageLabel: content.packageLabel,
    includedServices: content.includedServices,
    complimentaryCopies: content.complimentaryCopies,
    audiobookIncluded: content.audiobookIncluded,
    estimatedDelivery: content.estimatedDelivery,
    // Every other package's table, plus unrelated add-on tables and
    // empty unselected checkboxes, are excluded from the single-package
    // content model by construction — listed here only for traceability.
    excludedSections: [...EXCLUDED_PACKAGE_LABELS, "unrelated add-on tables", "empty unselected package checkboxes"]
  };
}

module.exports = { buildPackageSpecificAddendumSections, PACKAGE_CONTENT, EXCLUDED_PACKAGE_LABELS };
