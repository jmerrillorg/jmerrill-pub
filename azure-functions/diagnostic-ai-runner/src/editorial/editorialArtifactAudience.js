"use strict";

const ARTIFACT_AUDIENCE = Object.freeze({
  AUTHOR: "AUTHOR",
  INTERNAL_EDITORIAL: "INTERNAL_EDITORIAL",
  INTERNAL_PRODUCTION: "INTERNAL_PRODUCTION",
  RIGHTS_LEGAL: "RIGHTS_LEGAL",
  SYSTEM_EVIDENCE: "SYSTEM_EVIDENCE",
  PROVIDER: "PROVIDER"
});

const EDITORIAL_AUTHORITY = Object.freeze({
  SYSTEM_AUTHORIZED_EDIT: "SYSTEM_AUTHORIZED_EDIT",
  AUTHOR_DECISION_REQUIRED: "AUTHOR_DECISION_REQUIRED",
  PUBLISHER_DECISION_REQUIRED: "PUBLISHER_DECISION_REQUIRED",
  FACT_CHECK_REQUIRED: "FACT_CHECK_REQUIRED",
  RIGHTS_LEGAL_REVIEW_REQUIRED: "RIGHTS_LEGAL_REVIEW_REQUIRED"
});

const AUTHOR_NOTE_CLASSES = Object.freeze([
  "EDITOR_NOTE",
  "AUTHOR_QUESTION",
  "AUTHOR_DECISION_REQUIRED"
]);

const INTERNAL_NOTE_CLASSES = Object.freeze([
  "PUBLISHER_INTERNAL",
  "RIGHTS_LEGAL_INTERNAL",
  "FACT_CHECK_INTERNAL",
  "PRODUCTION_INTERNAL",
  "PROVIDER_INTERNAL",
  "SYSTEM_INTERNAL",
  "AI_INTERNAL"
]);

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function artifactAudience(stageCode, outputName) {
  const name = normalize(outputName).toLowerCase();
  if (name.includes("internal evidence") || name.includes("qa evidence") || name.includes("change ledger")) {
    return ARTIFACT_AUDIENCE.SYSTEM_EVIDENCE;
  }
  if (name.includes("clean edited")) return ARTIFACT_AUDIENCE.INTERNAL_PRODUCTION;
  if (
    name.includes("author-review") ||
    name.includes("author review") ||
    name.includes("developmental editorial review") ||
    name.includes("edited manuscript") ||
    name.includes("proofread manuscript") ||
    name.includes("review instructions") ||
    name.includes("cover note")
  ) {
    return ARTIFACT_AUDIENCE.AUTHOR;
  }
  if (stageCode === "EDITORIAL_REVIEW") return ARTIFACT_AUDIENCE.INTERNAL_EDITORIAL;
  return ARTIFACT_AUDIENCE.INTERNAL_EDITORIAL;
}

function isAuthorVisibleAudience(audience) {
  return audience === ARTIFACT_AUDIENCE.AUTHOR;
}

function classifyNotes(notes = []) {
  const authorVisible = [];
  const internal = [];
  const invalid = [];
  for (const note of Array.isArray(notes) ? notes : []) {
    const noteClass = normalize(note?.class || note?.noteClass);
    if (AUTHOR_NOTE_CLASSES.includes(noteClass)) authorVisible.push({ ...note, class: noteClass });
    else if (INTERNAL_NOTE_CLASSES.includes(noteClass)) internal.push({ ...note, class: noteClass });
    else invalid.push({ ...note, class: noteClass || "UNCLASSIFIED" });
  }
  return { authorVisible, internal, invalid };
}

function validateAuthorityActions(actions = []) {
  const allowed = new Set(Object.values(EDITORIAL_AUTHORITY));
  const invalid = (Array.isArray(actions) ? actions : []).filter((action) => !allowed.has(normalize(action?.classification)));
  return { ok: invalid.length === 0, invalid };
}

module.exports = {
  ARTIFACT_AUDIENCE,
  AUTHOR_NOTE_CLASSES,
  EDITORIAL_AUTHORITY,
  INTERNAL_NOTE_CLASSES,
  artifactAudience,
  classifyNotes,
  isAuthorVisibleAudience,
  validateAuthorityActions
};
