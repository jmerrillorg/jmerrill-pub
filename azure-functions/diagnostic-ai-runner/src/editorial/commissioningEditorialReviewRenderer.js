"use strict";

const { validateEditorialReview, CATEGORIES } = require("./commissioningEditorialReviewContract");
const plain = value => String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
function renderCommissioningEditorialReview(report, binding) {
  validateEditorialReview(report);
  const r = report;
  const rows = ["# J Merrill Publishing Editorial Review", "", "Internal commissioning assessment. Advisory only; no author approval or production-stage transition.", "",
    `Title ID: ${binding.titleId}`, `Source version: ${plain(binding.source.version)}`, `Source SHA-256: ${binding.source.sha256}`, "",
    "## 1. Intake Summary", ...Object.entries(r.intakeSummary).map(([key, value]) => `${key}: ${plain(value)}`), "",
    "## 2. Imprint Alignment", ...Object.entries(r.imprintAlignment).map(([key, value]) => `${key}: ${plain(value)}`), "",
    "## 3. Category Scores (1-5)", ...CATEGORIES.map(key => `${key}: ${r.categoryScores[key]}`), "",
    "## 4. Key Strengths", ...r.strengths.map(value => `- ${plain(value)}`), "",
    "## 5. Risks and Flags", ...r.risks.map(value => `- ${plain(value)}`), "",
    "## 6. Reviewer Notes by Category", ...CATEGORIES.map(key => `${key}: ${plain(r.categoryNotes[key])}`), "",
    "## 7. Integrity, Ethics and Compliance", ...(r.integrityFlags.length ? r.integrityFlags.map(flag =>
      `- ${plain(flag.category)}: ${plain(flag.observation)}${flag.hardStop ? " [HUMAN DISPOSITION REQUIRED]" : ""}`) : ["No flags reported; not a rights clearance or legal certification."]), "",
    "## 8. Style Guide Determination", ...Object.entries(r.styleGuideDetermination).map(([key, value]) => `${key}: ${plain(value)}`), "",
    "## 9. Editorial Recommendation and Next Steps", `Advisory pathway: ${r.recommendation.pathway}`, plain(r.recommendation.rationale),
    ...r.recommendation.forwardChecklist.map(value => `- ${plain(value)}`), `Resubmission eligibility: ${plain(r.recommendation.resubmissionEligibility)}`, "",
    "Editorial assessment provided by J Merrill Publishing, Inc. \u2014 ensuring every manuscript is guided to the appropriate editorial pathway with clarity, integrity, and market awareness.", ""];
  return rows.join("\n");
}

module.exports = { renderCommissioningEditorialReview };
