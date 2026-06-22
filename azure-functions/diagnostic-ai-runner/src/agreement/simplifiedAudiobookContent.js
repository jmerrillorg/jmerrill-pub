"use strict";

/**
 * Computes the simplified, package-aware audiobook section content
 * model. Pure — no I/O, no document generation.
 *
 * Preserves the legal authorization substance of the canonical
 * Audiobook Addendum (Author authorizes AI/human narration production,
 * distribution, and platform administration) while reframing which
 * election is presented as PRIMARY vs. an alternate/add-on path, based
 * on what the selected package already includes.
 */

const NARRATION_PATH = Object.freeze({
  AI_INCLUDED: "AI_INCLUDED",
  HUMAN_NARRATION_ADDON: "HUMAN_NARRATION_ADDON",
  ROYALTY_SHARE_ADDON: "ROYALTY_SHARE_ADDON",
  DISTRIBUTION_ONLY_ADDON: "DISTRIBUTION_ONLY_ADDON"
});

/**
 * @param {{ packageCode: string, audiobookIncludedInPackage: boolean }} input
 * @returns {{
 *   primaryElection: string, primaryElectionLabel: string,
 *   feeNote: string, alternatePaths: { path: string, label: string, whenApplicable: string }[],
 *   legalAuthorizationNote: string
 * }}
 */
function buildSimplifiedAudiobookSection(input = {}) {
  const audiobookIncluded = input.audiobookIncludedInPackage === true;

  const alternatePaths = [
    { path: NARRATION_PATH.HUMAN_NARRATION_ADDON, label: "Professional human narration", whenApplicable: "Selected as an add-on, replacing AI narration ($3,000-$5,000)" },
    { path: NARRATION_PATH.ROYALTY_SHARE_ADDON, label: "Royalty share coordination (ACX)", whenApplicable: "Selected as an alternate distribution/royalty path" },
    { path: NARRATION_PATH.DISTRIBUTION_ONLY_ADDON, label: "Distribution setup only (author-produced files)", whenApplicable: "Selected when Author supplies completed, mastered audio files" }
  ];

  if (!audiobookIncluded) {
    return {
      primaryElection: null,
      primaryElectionLabel: null,
      feeNote: "AI audiobook production is not included in this package — available as an add-on if selected.",
      alternatePaths,
      legalAuthorizationNote: "Author authorization for audiobook production, narration, distribution, and platform administration applies only if an audiobook production model is selected."
    };
  }

  return {
    primaryElection: NARRATION_PATH.AI_INCLUDED,
    primaryElectionLabel: "AI narration (included in this package)",
    feeNote: "Included in the Professional Publishing Package — no additional $699 fee applies.",
    alternatePaths,
    legalAuthorizationNote: "Author authorizes Publisher to prepare, produce, distribute, market, and administer an audiobook edition of the Work using AI narration as the default production method, consistent with the Audiobook Production & Distribution Addendum."
  };
}

module.exports = { buildSimplifiedAudiobookSection, NARRATION_PATH };
