"use strict";

const DEPENDENCY_CLASSES = Object.freeze([
  "HARD_PREREQUISITE", "SOFT_DEPENDENCY", "PARALLELIZABLE",
  "AUTHOR_DEPENDENCY", "PROVIDER_DEPENDENCY", "CADENCE_DEPENDENCY"
]);
const DEVELOPMENTAL_ENTRY_MARKER = "DEVELOPMENTAL_PARALLEL_ENTRY_V1";
const DEVELOPMENTAL_ENTRY_CORRELATION_PREFIX = "DEV-PARALLEL-SOURCE-";

function clean(value) { return String(value || "").trim(); }

function evaluateDevelopmentalEntry(input = {}) {
  const blockers = [];
  if (input.agreementExecuted !== true) blockers.push("AGREEMENT_NOT_EXECUTED");
  if (input.paymentOrPackageAuthoritySatisfied !== true) blockers.push("PAYMENT_OR_PACKAGE_AUTHORITY_NOT_SATISFIED");
  if (input.authoritativeManuscriptAvailable !== true) blockers.push("AUTHORITATIVE_MANUSCRIPT_NOT_AVAILABLE");
  return {
    actionable: blockers.length === 0,
    blockers,
    onboardingBlocksDevelopmentalEditing: false,
    parallelWorkstreams: input.onboardingComplete === true ? ["DEVELOPMENTAL_EDITING"] : ["AUTHOR_ONBOARDING", "DEVELOPMENTAL_EDITING"]
  };
}

function hasDevelopmentalParallelEntryAuthority(stage, sourceArtifactId) {
  const summary = clean(stage?.jm1pub_internaloperationalsummary);
  const exactSource = clean(sourceArtifactId);
  const durableCorrelation = clean(stage?.jm1pub_correlationid);
  return durableCorrelation === `${DEVELOPMENTAL_ENTRY_CORRELATION_PREFIX}${exactSource}` || (
    summary.includes(DEVELOPMENTAL_ENTRY_MARKER)
      && summary.includes(`sourceArtifactId=${exactSource}`)
      && summary.includes("agreementEvidence=")
      && summary.includes("commercialEvidence=")
  );
}

module.exports = {
  DEPENDENCY_CLASSES,
  DEVELOPMENTAL_ENTRY_CORRELATION_PREFIX,
  DEVELOPMENTAL_ENTRY_MARKER,
  evaluateDevelopmentalEntry,
  hasDevelopmentalParallelEntryAuthority
};
