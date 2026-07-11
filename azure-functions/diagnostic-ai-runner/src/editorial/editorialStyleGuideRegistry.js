"use strict";

const CANON_SOURCE = Object.freeze({
  documentId: "JM1-PUB-Editorial-Knowledge-v1.0",
  sourceType: "uploaded_governing_copy",
  effectiveDate: "2026-07-11",
  sourcePath: "/Volumes/UsersExternal/_INBOX/md/knowledge.md",
  notes: [
    "Uploaded governing source confirmed by Jackie on 2026-07-11.",
    "Published canon versions are immutable; substantive changes require version increment, effective date, supersession record, and synchronized publication.",
    "Explicit Jackie ruling governs the external style-guide roster: CMoS, APA, MLA, AP, Harvard, Turabian, AMA, ACS, Bluebook, IEEE, CSE, GPO, MHRA, Oxford."
  ]
});

const OVERLAY_SOURCE = Object.freeze({
  documentId: "faith-editorial-overlay.md v1.0",
  sourceType: "uploaded_governing_copy",
  effectiveDate: "2026-07-11",
  sourcePath:
    "/Users/jmerrillone/Developer/jmerrill-pub-diagnostic-runner-remediation/docs/implementation/canon-cache/jm1-publishing-editorial/references/faith-editorial-overlay.md"
});

const PROJECT_STYLE_SHEET = Object.freeze({
  id: "JMP-PSS-LIFECYCLE-V1",
  canonicalName: "JMP Project Style Sheet",
  abbreviation: "Project Style Sheet",
  version: "1.0",
  layer: "PROJECT_STYLE_SHEET",
  activeState: "ACTIVE",
  effectiveDate: "2026-07-11",
  supersededState: "NOT_SUPERSEDED",
  lifecycle: ["editorial_review", "developmental_editing", "line_editing", "copy_editing", "proofreading", "archive"],
  initializationStage: "editorial_review",
  governingReference: "Project style sheet is internal JMP project evidence, not one of the 14 external guides."
});

function createGuide(definition) {
  const canonicalName = definition.canonicalName;
  const abbreviation = definition.abbreviation;
  return Object.freeze({
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    version: "CANON-LIVE",
    activeState: true,
    supersededState: false,
    companionEligibility: false,
    governingReference: CANON_SOURCE.documentId,
    officialName: canonicalName,
    shorthand: abbreviation,
    canonicalVersion: "CANON-LIVE",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    ...definition
  });
}

const CANONICAL_STYLE_GUIDES = Object.freeze([
  createGuide({
    id: "JMP-SG-CMOS",
    canonicalName: "Chicago Manual of Style",
    abbreviation: "CMoS",
    jurisdiction: "General trade / U.S.",
    applicability: ["trade_fiction", "trade_nonfiction", "children", "poetry"],
    defaultEligibility: true,
    secondaryEligibility: true,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["trade_fiction", "trade_nonfiction", "children", "poetry", "social_sciences", "education", "psychology", "humanities", "literature", "medical_health", "journalism_media", "technical_scientific", "public_sector_government", "academic_humanities_thesis", "international_academic_uk_facing"],
      audiences: ["adult", "children"],
      imprints: ["J_MERRILL_PUBLISHING", "JM_WORKS", "JM_LITTLE", "JM_VERSE", "JM_SIGNATURE"]
    },
    primaryFor: ["trade_fiction", "trade_nonfiction", "children", "poetry"],
    fallbackFor: ["social_sciences", "education", "psychology", "humanities", "literature", "medical_health", "journalism_media", "technical_scientific", "public_sector_government", "academic_humanities_thesis", "international_academic_uk_facing"],
    promptPrimer:
      "Use Chicago Manual of Style as the governing default for mechanics while preserving author voice, cadence, and intentional stylistic choices."
  }),
  createGuide({
    id: "JMP-SG-APA",
    canonicalName: "APA Style",
    abbreviation: "APA",
    jurisdiction: "Academic / U.S.",
    applicability: ["social_sciences", "education", "psychology"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["social_sciences", "education", "psychology"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["social_sciences", "education", "psychology"],
    fallbackFor: [],
    promptPrimer:
      "Apply APA where the manuscript depends on social-science citation, research framing, or psychology and education conventions."
  }),
  createGuide({
    id: "JMP-SG-MLA",
    canonicalName: "MLA Handbook",
    abbreviation: "MLA",
    jurisdiction: "Academic humanities / U.S.",
    applicability: ["humanities", "literature"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["humanities", "literature"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "JM_VERSE"]
    },
    primaryFor: ["humanities", "literature"],
    fallbackFor: [],
    promptPrimer:
      "Apply MLA where the manuscript is rooted in humanities or literature scholarship and expects MLA citation conventions."
  }),
  createGuide({
    id: "JMP-SG-AP",
    canonicalName: "Associated Press Stylebook",
    abbreviation: "AP",
    jurisdiction: "Journalism / U.S.",
    applicability: ["journalism_media"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["journalism_media"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["journalism_media"],
    fallbackFor: [],
    promptPrimer:
      "Apply AP for journalism and media manuscripts where AP newsroom conventions govern usage and presentation."
  }),
  createGuide({
    id: "JMP-SG-HARVARD",
    canonicalName: "Harvard Referencing",
    abbreviation: "Harvard",
    jurisdiction: "International academic / UK-facing",
    applicability: ["international_academic_uk_facing"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["international_academic_uk_facing"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["international_academic_uk_facing"],
    fallbackFor: [],
    promptPrimer:
      "Apply Harvard referencing where the manuscript is explicitly international-academic or UK-facing and expects Harvard citation form."
  }),
  createGuide({
    id: "JMP-SG-TURABIAN",
    canonicalName: "Turabian",
    abbreviation: "Turabian",
    jurisdiction: "Academic humanities / thesis",
    applicability: ["academic_humanities_thesis"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["academic_humanities_thesis"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["academic_humanities_thesis"],
    fallbackFor: [],
    promptPrimer:
      "Apply Turabian where the manuscript is a thesis-like or humanities academic work that specifically expects Turabian treatment."
  }),
  createGuide({
    id: "JMP-SG-AMA",
    canonicalName: "AMA Manual of Style",
    abbreviation: "AMA",
    jurisdiction: "Medical / health",
    applicability: ["medical_health"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["medical_health"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["medical_health"],
    fallbackFor: [],
    promptPrimer:
      "Apply AMA for medical and health manuscripts that require medical terminology, citation, and usage conventions."
  }),
  createGuide({
    id: "JMP-SG-ACS",
    canonicalName: "ACS Style Guide",
    abbreviation: "ACS",
    jurisdiction: "Chemistry / scientific",
    applicability: ["technical_scientific"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use ACS for chemistry-centered technical or scientific manuscripts when ACS citation and nomenclature conventions apply."
  }),
  createGuide({
    id: "JMP-SG-BLUEBOOK",
    canonicalName: "The Bluebook",
    abbreviation: "Bluebook",
    jurisdiction: "Legal / institutional / U.S.",
    applicability: ["legal_institutional"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["legal_institutional"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["legal_institutional"],
    fallbackFor: [],
    promptPrimer:
      "Use The Bluebook for U.S. legal manuscripts and institutional or legal reference materials where Bluebook citation governs."
  }),
  createGuide({
    id: "JMP-SG-IEEE",
    canonicalName: "IEEE Editorial Style Manual",
    abbreviation: "IEEE",
    jurisdiction: "Engineering / technical",
    applicability: ["technical_scientific"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use IEEE for engineering and technical-science manuscripts when IEEE notation and citation conventions govern."
  }),
  createGuide({
    id: "JMP-SG-CSE",
    canonicalName: "CSE Manual",
    abbreviation: "CSE",
    jurisdiction: "Life sciences / scientific",
    applicability: ["technical_scientific"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use CSE for life-science and scientific manuscripts when the Council of Science Editors standard applies."
  }),
  createGuide({
    id: "JMP-SG-GPO",
    canonicalName: "U.S. Government Publishing Office Style Manual",
    abbreviation: "GPO",
    jurisdiction: "Public sector / government",
    applicability: ["public_sector_government"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["public_sector_government"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["public_sector_government"],
    fallbackFor: [],
    promptPrimer:
      "Use GPO for public-sector or government manuscripts where government style and institutional usage govern."
  }),
  createGuide({
    id: "JMP-SG-MHRA",
    canonicalName: "MHRA Style Guide",
    abbreviation: "MHRA",
    jurisdiction: "International academic / UK-facing humanities",
    applicability: ["international_academic_uk_facing"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["international_academic_uk_facing"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["international_academic_uk_facing"],
    fallbackFor: [],
    promptPrimer:
      "Use MHRA where the manuscript is UK-facing and humanities-oriented and the MHRA citation regime is the stated fit."
  }),
  createGuide({
    id: "JMP-SG-OXFORD",
    canonicalName: "New Hart's Rules / Oxford Style",
    abbreviation: "Oxford",
    jurisdiction: "International academic / UK-facing",
    applicability: ["international_academic_uk_facing"],
    defaultEligibility: true,
    secondaryEligibility: false,
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["international_academic_uk_facing"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["international_academic_uk_facing"],
    fallbackFor: [],
    promptPrimer:
      "Use Oxford style where the manuscript is explicitly UK-facing and expects Oxford house conventions."
  })
]);

const COMPANION_GUIDES = Object.freeze([
  {
    id: "JMP-CG-EDITORIAL-REVIEW-V1",
    officialName: "JMP Editorial Review — Reference",
    version: "1.1",
    status: "CANON",
    sourcePath:
      "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Skills/jm1-publishing-editorial/references/editorial-review.md",
    appliesTo: ["editorial_diagnostic"],
    promptPrimer:
      "Editorial review is advisory and routing-oriented. Do not rewrite manuscript text, advance stages, or treat recommendations as final author-facing truth."
  },
  {
    id: "JMP-CG-DEVELOPMENTAL-V1",
    officialName: "JMP Developmental Editing — Reference",
    version: "1.0",
    status: "CANON-CANDIDATE",
    sourcePath: "/Users/jmerrillone/Developer/jmerrill-pub-devreview/docs/operations/developmental-editing.md",
    appliesTo: ["developmental_editing"],
    promptPrimer:
      "Developmental editing shapes structure, arc, continuity, and coherence while preserving author voice. Structural suggestions are options, not ownership transfer."
  },
  {
    id: "JMP-CG-LINE-COPY-PROOF-V1",
    officialName: "JMP Line Editing, Copyediting & Proofreading — Reference",
    version: "1.0",
    status: "CANON",
    sourcePath:
      "/Users/jmerrillone/Developer/jmerrill-pub-devreview/docs/implementation/canon-cache/jm1-publishing-editorial/references/line-copyedit-proof.md",
    appliesTo: ["line_editing", "copy_editing", "proofreading", "independent_quality_review"],
    promptPrimer:
      "Mechanics are governed by the selected style guide, but voice remains the author's. Correct errors; preserve intentional rhythm, dialect, cadence, and emphasis."
  },
  {
    id: "JMP-CG-FAITH-OVERLAY-V1",
    officialName: "JMP Editorial Overlays — Internal Doctrine",
    version: "1.0",
    status: "CANON",
    sourcePath: OVERLAY_SOURCE.sourcePath,
    appliesTo: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading", "independent_quality_review"],
    appliesWhen: ["faith", "christian", "devotional", "inspirational", "ministry", "street_lit", "children"],
    internalOnly: true,
    promptPrimer:
      "Apply faith, street-lit, and children's overlay doctrine internally only. Never surface overlay metadata or doctrine labels in author-facing output."
  }
]);

function listCanonicalStyleGuides() {
  return CANONICAL_STYLE_GUIDES.slice();
}

function listCompanionGuides() {
  return COMPANION_GUIDES.slice();
}

function getStyleGuideById(id) {
  return CANONICAL_STYLE_GUIDES.find((guide) => guide.id === id) || null;
}

function getCompanionGuideById(id) {
  return COMPANION_GUIDES.find((guide) => guide.id === id) || null;
}

module.exports = {
  CANON_SOURCE,
  OVERLAY_SOURCE,
  PROJECT_STYLE_SHEET,
  CANONICAL_STYLE_GUIDES,
  COMPANION_GUIDES,
  getCompanionGuideById,
  getStyleGuideById,
  listCanonicalStyleGuides,
  listCompanionGuides
};
