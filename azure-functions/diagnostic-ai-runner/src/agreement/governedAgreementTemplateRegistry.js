"use strict";

const path = require("node:path");

const GOVERNED_TEMPLATE_ROOT = path.join(
  "Implementation HQ",
  "01_GOVERNANCE",
  "Agreement Templates"
);

const AGREEMENT_TEMPLATE = Object.freeze({
  HYBRID: {
    agreementType: "Hybrid",
    publishingTrack: "Hybrid",
    templateName: "JMP Publishing Agreement",
    version: "v1.3.1",
    status: "ACTIVE",
    filename: "JMP_Publishing_Agreement_v1.3.1.docx",
    governedPath: path.join(GOVERNED_TEMPLATE_ROOT, "JMP_Publishing_Agreement_v1.3.1.docx"),
    sourceBaseline: "JMP_Publishing_Agreement_v1.3.1.docx (approved content baseline: corrective-release clean v1.3.1)",
    supersededVersion: "JMP Publishing Agreement v1.3.0 and earlier operational drafts"
  },
  JM_SIGNATURE: {
    agreementType: "JM Signature",
    publishingTrack: "JM Signature",
    templateName: "JM Signature Publishing Agreement",
    version: "v1.0",
    status: "ACTIVE",
    filename: "JM_Signature_Publishing_Agreement_v1.0.docx",
    governedPath: path.join(GOVERNED_TEMPLATE_ROOT, "JM_Signature_Publishing_Agreement_v1.0.docx"),
    sourceBaseline: "/Volumes/UsersExternal/_INBOX/JM_Signature_Publishing_Agreement.docx",
    supersededVersion: "DRAFT.docx, DRAFT(1).docx, DRAFT(2).docx, DRAFT(3).docx, DRAFT(4).docx, and unmanaged _INBOX copies"
  }
});

function normalizeTrack(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
    : "";
}

function selectAgreementTemplateForTrack(publishingTrack) {
  const normalized = normalizeTrack(publishingTrack);
  if (["hybrid", "standard hybrid", "package", "package based", "package-based"].includes(normalized)) {
    return AGREEMENT_TEMPLATE.HYBRID;
  }
  if (["jm signature", "signature", "traditional", "traditional publishing", "jm signature traditional"].includes(normalized)) {
    return AGREEMENT_TEMPLATE.JM_SIGNATURE;
  }
  throw Object.assign(new Error(`No governed agreement template for Publishing Track '${publishingTrack || ""}'`), {
    safeCode: "AGREEMENT_TEMPLATE_SELECTION_FAILED"
  });
}

module.exports = {
  GOVERNED_TEMPLATE_ROOT,
  AGREEMENT_TEMPLATE,
  selectAgreementTemplateForTrack,
  normalizeTrack
};
