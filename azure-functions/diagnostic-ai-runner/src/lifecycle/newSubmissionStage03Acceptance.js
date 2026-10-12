"use strict";
const b = require("./newSubmissionStage03Budget");
const canon = require("../../config/commissioning-editorial-review-canon.json");
const contract = require("../editorial/commissioningEditorialReviewContract");
function qualify(report) {
  contract.validateEditorialReview(report);
  const scores = report.categoryScores;
  const average = Object.values(scores).reduce((n, score) => n + score, 0) / 8;
  const supported = [];
  if (report.integrityFlags.some(flag => flag.hardStop)) supported.push("DECLINE");
  else {
    if (average >= 4.2) supported.push("LINE_AND_COPY");
    if ((average >= 3 && average <= 4.1) || scores.STRUCTURE_FLOW <= 3 || scores.MARKET_FIT <= 3) supported.push("DEVELOPMENTAL");
    if ((average >= 2 && average <= 2.9) || scores.CLARITY_GRAMMAR <= 2) supported.push("REWRITE");
  }
  const originalPathway = report.recommendation.pathway;
  // Do not resolve overlapping rules or qualitative decline/fast-track judgments automatically.
  const pathway = supported.includes(originalPathway) ? originalPathway : supported.length === 1 ? supported[0] : null;
  if (!pathway || ["DECLINE", "FAST_TRACK_CONSIDERATION"].includes(originalPathway) && pathway !== originalPathway)
    b.deny("STAGE03_ADVISORY_PATHWAY_REQUIRES_REVIEW");
  return { average, supportedPathways: supported, originalPathway, pathway, corrected: originalPathway !== pathway };
}
async function accept(receipt, prepared, folder, deps) {
  const outputs = [];
  for (const assessment of receipt.assessments) {
    const component = prepared.components.find(c => c.key === assessment.bindingHash);
    const authority = component?.binding.authority.find(a => a.role === "EDITORIAL_REVIEW_CANON");
    if (authority?.sha256 !== canon.sha256 || authority.version !== canon.version) b.deny("STAGE03_QA_CANON_UNBOUND");
    const saved = await b.read(deps.containerClient, assessment.resultReference);
    if (saved.value.reportSha256 !== assessment.reportSha256 || b.sha(JSON.stringify(saved.value.report)) !== assessment.reportSha256)
      b.deny("STAGE03_QA_REPORT_CONFLICT");
    const qa = qualify(saved.value.report);
    const report = structuredClone(saved.value.report);
    report.recommendation.pathway = qa.pathway;
    report.recommendation.rationale = `Canonical score-rule QA: exact average ${qa.average}; supported advisory pathways ${qa.supportedPathways.join(", ")}.
Original model pathway: ${qa.originalPathway}. Validated advisory pathway: ${qa.pathway}. Publisher review remains required; this is not an approved editorial decision.
The original model rationale below is preserved as model evidence, not authoritative score arithmetic or routing:
${saved.value.report.recommendation.rationale}`;
    const header = ["# Stage 03 Validated Assessment Package", "",
      `Original receipt: ${receipt.reference}`, `Original report SHA-256: ${assessment.reportSha256}`,
      `Canon version: ${canon.version}`, `Canon SHA-256: ${canon.sha256}`, "",
      "QA uses the existing canonical score rules, not another model call. Original reports and receipts remain unchanged.",
      "Numeric eligibility does not clear qualitative major-flag or exceptional-originality requirements; the Publisher must review those judgments.",
      "Completeness observations concern the manuscript text, not the accepted intake records. Do not repeat intake or request already-captured information from these suggestions.",
      "Imprint, style, rights, factual claims and editorial recommendations remain advisory and require the appropriate human review. No author consent or clearance is inferred. Stage 04 is unstarted.", ""].join("\n");
    const bytes = Buffer.from(header + require("../editorial/commissioningEditorialReviewRenderer").renderCommissioningEditorialReview(report, {
      titleId: receipt.titleId, source: { version: assessment.component.eTag, sha256: assessment.component.sourceSha256 }
    }));
    const output = await require("./newSubmissionStage02").persistFile(folder,
      `${assessment.component.sourceSha256.slice(0,16)}-Stage03-Validated-Assessment.md`, bytes, "text/markdown; charset=utf-8", deps);
    outputs.push({ ...qa, sourceSha256: assessment.component.sourceSha256, originalReportSha256: assessment.reportSha256,
      validatedReportSha256: b.sha(JSON.stringify(report)), documentSha256: b.sha(bytes), sharePointOutput: output });
  }
  const path = `${b.PREFIX}/acceptance/${receipt.titleId}/${receipt.sourceFingerprint}.json`;
  const prior = await b.optional(deps.containerClient, path);
  if (prior) {
    if (JSON.stringify(prior.value.outputs) !== JSON.stringify(outputs) || prior.value.originalReceiptSha256 !== b.sha(JSON.stringify(receipt)))
      b.deny("STAGE03_ACCEPTANCE_REPLAY_CONFLICT");
    return prior.value;
  }
  return (await b.immutable(deps.containerClient, path, { schemaVersion: 1, titleId: receipt.titleId,
    status: "VALIDATED_ASSESSMENT_PACKAGE", originalReceiptReference: receipt.reference,
    originalReceiptSha256: b.sha(JSON.stringify(receipt)), outputs, canonSha256: canon.sha256,
    publisherReview: "REQUIRED_BEFORE_FORWARD_ACTION", stage04: "NOT_STARTED", modelCalls: 0,
    communications: 0, payments: 0, completedAt: new Date().toISOString(), reference: path })).value;
}
module.exports = { qualify, accept };
