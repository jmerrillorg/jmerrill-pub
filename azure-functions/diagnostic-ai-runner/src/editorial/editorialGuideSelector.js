"use strict";

const {
  CANON_SOURCE,
  PROJECT_STYLE_SHEET,
  getCompanionGuideById,
  getStyleGuideById
} = require("./editorialStyleGuideRegistry");

const GUIDE_POLICY_VERSION = "EDITORIAL-GUIDE-SELECTION-V1";

const MANUSCRIPT_CLASS_RULES = Object.freeze([
  { id: "children", tests: ["children", "picture_book", "early_reader", "middle_grade"] },
  { id: "poetry", tests: ["poetry", "verse", "chapbook", "spoken_word"] },
  { id: "academic_humanities_thesis", tests: ["thesis", "dissertation", "academic_humanities", "seminary"] },
  { id: "international_academic_uk_facing", tests: ["uk", "british", "international_academic", "harvard", "mhra", "oxford"] },
  { id: "social_sciences", tests: ["social_sciences"] },
  { id: "education", tests: ["education"] },
  { id: "psychology", tests: ["psychology"] },
  { id: "humanities", tests: ["humanities"] },
  { id: "literature", tests: ["literature"] },
  { id: "medical_health", tests: ["medical", "health", "wellness"] },
  { id: "journalism_media", tests: ["journalism", "media"] },
  { id: "public_sector_government", tests: ["government", "public_sector", "policy_manual", "agency"] },
  { id: "legal_institutional", tests: ["legal", "institutional", "case_law", "statute"] },
  { id: "technical_scientific", tests: ["technical", "scientific", "engineering", "chemistry", "biology", "life science", "science"] }
]);

const PRIMARY_GUIDE_MAP = Object.freeze({
  children: "JMP-SG-CMOS",
  poetry: "JMP-SG-CMOS",
  social_sciences: "JMP-SG-APA",
  education: "JMP-SG-APA",
  psychology: "JMP-SG-APA",
  humanities: "JMP-SG-MLA",
  literature: "JMP-SG-MLA",
  academic_humanities_thesis: "JMP-SG-TURABIAN",
  international_academic_uk_facing: null,
  medical_health: "JMP-SG-AMA",
  journalism_media: "JMP-SG-AP",
  public_sector_government: "JMP-SG-GPO",
  legal_institutional: null,
  technical_scientific: null,
  trade_default: "JMP-SG-CMOS"
});

const SECONDARY_GUIDE_MAP = Object.freeze({
  children: [],
  poetry: [],
  social_sciences: ["JMP-SG-CMOS"],
  education: ["JMP-SG-CMOS"],
  psychology: ["JMP-SG-CMOS"],
  humanities: ["JMP-SG-CMOS"],
  literature: ["JMP-SG-CMOS"],
  academic_humanities_thesis: ["JMP-SG-CMOS"],
  international_academic_uk_facing: ["JMP-SG-CMOS"],
  medical_health: ["JMP-SG-CMOS"],
  journalism_media: ["JMP-SG-CMOS"],
  public_sector_government: ["JMP-SG-CMOS"],
  legal_institutional: [],
  technical_scientific: []
});

const LEGAL_GUIDES = Object.freeze(["JMP-SG-BLUEBOOK"]);
const TECHNICAL_GUIDES = Object.freeze(["JMP-SG-IEEE", "JMP-SG-ACS", "JMP-SG-CSE"]);
const INTERNATIONAL_ACADEMIC_GUIDES = Object.freeze(["JMP-SG-HARVARD", "JMP-SG-MHRA", "JMP-SG-OXFORD"]);

function norm(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeList(values) {
  if (!Array.isArray(values)) return [];
  return values.map(norm).filter(Boolean);
}

function deriveSignals(input) {
  const signals = [
    norm(input.manuscriptType),
    norm(input.genre),
    norm(input.subgenre),
    norm(input.imprint),
    norm(input.audience),
    norm(input.language),
    norm(input.format)
  ];

  const authorPrefs = normalizeList(input.approvedAuthorPreference);

  return {
    allSignals: signals.concat(authorPrefs).filter(Boolean),
    authorPrefs
  };
}

function resolveManuscriptClass(input) {
  const { allSignals } = deriveSignals(input);
  const matched = MANUSCRIPT_CLASS_RULES.filter((rule) =>
    rule.tests.some((needle) => allSignals.some((signal) => signal.includes(needle)))
  );

  if (matched.length === 0) {
    return { manuscriptClass: "trade_default", conflicts: [] };
  }

  const hasLegal = matched.some((rule) => rule.id === "legal_institutional");
  const hasTechnical = matched.some((rule) => rule.id === "technical_scientific");
  const hasMedical = matched.some((rule) => rule.id === "medical_health");

  const conflicts = [];
  if (hasLegal && (hasTechnical || hasMedical)) {
    conflicts.push("LEGAL_AND_TECHNICAL_STYLE_COLLISION");
  }

  const selected = matched[0].id;
  return { manuscriptClass: selected, conflicts };
}

function selectLegalGuide(input) {
  return "JMP-SG-BLUEBOOK";
}

function selectTechnicalGuide(input) {
  const signals = deriveSignals(input).allSignals;
  if (signals.some((signal) => signal.includes("chem"))) return "JMP-SG-ACS";
  if (signals.some((signal) => signal.includes("biology") || signal.includes("life science"))) return "JMP-SG-CSE";
  return "JMP-SG-IEEE";
}

function selectInternationalAcademicGuide(input) {
  const signals = deriveSignals(input).allSignals;
  if (signals.some((signal) => signal.includes("mhra"))) return "JMP-SG-MHRA";
  if (signals.some((signal) => signal.includes("oxford"))) return "JMP-SG-OXFORD";
  return "JMP-SG-HARVARD";
}

function selectCompanionGuides(input) {
  const companions = [];
  const stage = norm(input.editorialStage);
  const signals = deriveSignals(input).allSignals;

  if (stage === "editorial_diagnostic" || stage === "editorial_review") {
    companions.push("JMP-CG-EDITORIAL-REVIEW-V1");
  }
  if (stage === "developmental_editing" || stage === "developmental") {
    companions.push("JMP-CG-DEVELOPMENTAL-V1");
  }
  if (stage === "line_editing" || stage === "copy_editing" || stage === "proofreading" || stage === "independent_quality_review") {
    companions.push("JMP-CG-LINE-COPY-PROOF-V1");
  }
  if (signals.some((signal) => ["faith", "christian", "devotional", "inspirational", "ministry"].some((needle) => signal.includes(needle)))) {
    companions.push("JMP-CG-FAITH-OVERLAY-V1");
  }

  return companions.map(getCompanionGuideById).filter(Boolean);
}

function selectStyleGuides(input = {}) {
  const { manuscriptClass, conflicts } = resolveManuscriptClass(input);
  const titleSpecificException = norm(input.titleSpecificException);
  const stage = norm(input.editorialStage);

  const allConflicts = conflicts.slice();
  if (!stage) {
    allConflicts.push("EDITORIAL_STAGE_REQUIRED");
  }

  let primaryGuideId = PRIMARY_GUIDE_MAP[manuscriptClass] || PRIMARY_GUIDE_MAP.trade_default;
  let secondaryGuideIds = SECONDARY_GUIDE_MAP[manuscriptClass]
    ? SECONDARY_GUIDE_MAP[manuscriptClass].slice()
    : [];

  if (manuscriptClass === "legal_institutional") {
    primaryGuideId = selectLegalGuide(input);
    secondaryGuideIds = ["JMP-SG-CMOS"];
  }

  if (manuscriptClass === "technical_scientific") {
    primaryGuideId = selectTechnicalGuide(input);
    secondaryGuideIds = ["JMP-SG-CMOS"];
  }

  if (manuscriptClass === "international_academic_uk_facing") {
    primaryGuideId = selectInternationalAcademicGuide(input);
    secondaryGuideIds = ["JMP-SG-CMOS"];
  }

  if (titleSpecificException && !titleSpecificException.includes("approved")) {
    allConflicts.push("TITLE_EXCEPTION_NOT_APPROVED");
  }

  const projectStyleSheetStages = new Set(PROJECT_STYLE_SHEET.lifecycle);
  const projectStyleSheetRequired = manuscriptClass === "children" || projectStyleSheetStages.has(stage);

  const primaryGuide = getStyleGuideById(primaryGuideId);
  const secondaryGuides = secondaryGuideIds.map(getStyleGuideById).filter(Boolean);
  const companionGuides = selectCompanionGuides(input);

  const unresolved = allConflicts.length > 0 || !primaryGuide;

  return {
    ok: !unresolved,
    policyVersion: GUIDE_POLICY_VERSION,
    canonSourceVersion: CANON_SOURCE.documentId,
    manuscriptClass,
    selectedPrimaryGuide: primaryGuide,
    selectedCompanionGuides: companionGuides,
    secondaryGuides,
    styleGuideIds: [primaryGuide?.id, ...secondaryGuides.map((guide) => guide.id)].filter(Boolean),
    companionGuideIds: companionGuides.map((guide) => guide.id),
    projectStyleSheetPolicy: {
      required: projectStyleSheetRequired,
      sheet: PROJECT_STYLE_SHEET,
      initializationStage: PROJECT_STYLE_SHEET.initializationStage,
      currentStage: stage || null
    },
    precedenceExplanation: [
      "Enterprise requirements and publisher authority outrank all editorial guide choices.",
      `Primary style guide selected from the knowledge.md Section 3 matrix for manuscript class: ${manuscriptClass}.`,
      "Companion guides were added from stage doctrine and internal overlay doctrine only when the title and stage qualified.",
      "The Project Style Sheet is a governed internal layer and is not counted as one of the 14 external guides."
    ],
    conflicts: allConflicts,
    unresolvedException: unresolved ? "HUMAN_REVIEW_REQUIRED" : null,
    humanReviewRequired: unresolved || companionGuides.length > 0,
    advisoryNotes:
      manuscriptClass === "poetry"
        ? ["Poet's own established form may inform execution, but it is advisory and not part of the 14-guide canonical roster."]
        : []
  };
}

module.exports = {
  GUIDE_POLICY_VERSION,
  LEGAL_GUIDES,
  TECHNICAL_GUIDES,
  INTERNATIONAL_ACADEMIC_GUIDES,
  resolveManuscriptClass,
  selectStyleGuides
};
