"use strict";

const CANON_SOURCE = Object.freeze({
  documentId: "JM1-PUB-Editorial-Knowledge-v1.1",
  effectiveDate: "2026-06",
  sourcePath:
    "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Skills/jm1-publishing-editorial/references/knowledge.md"
});

const CANONICAL_STYLE_GUIDES = Object.freeze([
  {
    id: "JMP-SG-CMOS",
    officialName: "Chicago Manual of Style",
    shorthand: "CMoS",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["trade_fiction", "trade_nonfiction", "children", "poetry"],
      audiences: ["adult", "children"],
      imprints: ["J_MERRILL_PUBLISHING", "JM_WORKS", "JM_LITTLE", "JM_VERSE", "JM_SIGNATURE"]
    },
    primaryFor: ["trade_fiction", "trade_nonfiction", "children", "poetry"],
    fallbackFor: ["social_sciences", "education", "psychology", "humanities", "literature", "medical_health", "journalism_media", "technical_scientific", "legal_institutional"],
    promptPrimer:
      "Use Chicago Manual of Style as the governing default for mechanics while preserving author voice, cadence, and intentional stylistic choices.",
    precedence: 2
  },
  {
    id: "JMP-SG-PUBLISHER-STYLESHEET",
    officialName: "Publisher Style Sheet",
    shorthand: "Publisher Style Sheet",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "INTERNAL_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["children"],
      audiences: ["children"],
      imprints: ["JM_LITTLE"]
    },
    primaryFor: [],
    fallbackFor: ["children"],
    promptPrimer:
      "Apply the publisher's style sheet for established house decisions, recurring terms, capitalization, and internal consistency after the primary guide is set.",
    precedence: 4
  },
  {
    id: "JMP-SG-APA",
    officialName: "APA Style",
    shorthand: "APA",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["social_sciences", "education", "psychology"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["social_sciences", "education", "psychology"],
    fallbackFor: [],
    promptPrimer:
      "Apply APA where the manuscript depends on social-science citation, research framing, or psychology/education conventions.",
    precedence: 4
  },
  {
    id: "JMP-SG-MLA",
    officialName: "MLA Handbook",
    shorthand: "MLA",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["humanities", "literature"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "JM_VERSE"]
    },
    primaryFor: ["humanities", "literature"],
    fallbackFor: [],
    promptPrimer:
      "Apply MLA where the manuscript is rooted in humanities or literature scholarship and expects MLA citation/form conventions.",
    precedence: 4
  },
  {
    id: "JMP-SG-AMA",
    officialName: "AMA Manual of Style",
    shorthand: "AMA",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["medical_health"],
      audiences: ["adult"],
      imprints: ["JM_WORKS", "J_MERRILL_PUBLISHING"]
    },
    primaryFor: ["medical_health"],
    fallbackFor: [],
    promptPrimer:
      "Apply AMA for medical and health manuscripts that require medical terminology, citation, and usage conventions.",
    precedence: 4
  },
  {
    id: "JMP-SG-AP",
    officialName: "Associated Press Stylebook",
    shorthand: "AP",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["journalism_media"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["journalism_media"],
    fallbackFor: [],
    promptPrimer:
      "Apply AP for journalism and media manuscripts where AP newsroom conventions govern usage and presentation.",
    precedence: 4
  },
  {
    id: "JMP-SG-IEEE",
    officialName: "IEEE Editorial Style Manual",
    shorthand: "IEEE",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use IEEE for engineering and technical-science manuscripts when IEEE-style citations or notation govern.",
    precedence: 4
  },
  {
    id: "JMP-SG-ACS",
    officialName: "ACS Style Guide",
    shorthand: "ACS",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use ACS for chemistry-centered technical or scientific manuscripts when ACS citation and nomenclature conventions apply.",
    precedence: 4
  },
  {
    id: "JMP-SG-AIP",
    officialName: "AIP Style Manual",
    shorthand: "AIP",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use AIP for physics and closely related scientific manuscripts when AIP-specific conventions govern.",
    precedence: 4
  },
  {
    id: "JMP-SG-CSE",
    officialName: "CSE Manual",
    shorthand: "CSE",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use CSE for life-science and scientific manuscripts when the Council of Science Editors standard applies.",
    precedence: 4
  },
  {
    id: "JMP-SG-ISO",
    officialName: "ISO Editorial Conventions",
    shorthand: "ISO",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["technical_scientific"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["technical_scientific"],
    fallbackFor: [],
    promptPrimer:
      "Use ISO conventions for standards-oriented technical manuscripts where ISO terminology, numbering, or formatting rules govern.",
    precedence: 4
  },
  {
    id: "JMP-SG-BLUEBOOK",
    officialName: "The Bluebook",
    shorthand: "Bluebook",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["legal_institutional"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["legal_institutional"],
    fallbackFor: [],
    promptPrimer:
      "Use The Bluebook for U.S. legal manuscripts and institutional/legal reference materials where Bluebook citation governs.",
    precedence: 4
  },
  {
    id: "JMP-SG-OSCOLA",
    officialName: "OSCOLA",
    shorthand: "OSCOLA",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["legal_institutional"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["legal_institutional"],
    fallbackFor: [],
    promptPrimer:
      "Use OSCOLA for U.K.-oriented legal manuscripts where OSCOLA citation is the governing legal standard.",
    precedence: 4
  },
  {
    id: "JMP-SG-AGLC",
    officialName: "Australian Guide to Legal Citation",
    shorthand: "AGLC",
    canonicalVersion: "CANON-LIVE",
    externalEditionStatus: "UNSPECIFIED_IN_CANON",
    sourceDocumentVersion: CANON_SOURCE.documentId,
    status: "ACTIVE",
    owner: "J Merrill Publishing",
    appliesTo: {
      editorialLayers: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading"],
      manuscriptTypes: ["legal_institutional"],
      audiences: ["adult"],
      imprints: ["JM_WORKS"]
    },
    primaryFor: ["legal_institutional"],
    fallbackFor: [],
    promptPrimer:
      "Use AGLC for Australian legal manuscripts where Australian Guide to Legal Citation conventions govern.",
    precedence: 4
  }
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
    status: "CANON",
    sourcePath:
      "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Skills/jm1-publishing-editorial/references/developmental-editing 2.md",
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
      "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Skills/jm1-publishing-editorial/references/line-copyedit-proof.md",
    appliesTo: ["line_editing", "copy_editing", "proofreading", "independent_quality_review"],
    promptPrimer:
      "Mechanics are governed by the selected style guide, but voice remains the author's. Correct errors; preserve intentional rhythm, dialect, cadence, and emphasis."
  },
  {
    id: "JMP-CG-FAITH-OVERLAY-V1",
    officialName: "JMP Editorial Overlays — Faith & Inspirational",
    version: "1.0",
    status: "CANON",
    sourcePath:
      "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/Implementation HQ - Architecture/00_CANON/Publishing/Skills/jm1-publishing-editorial/references/faith-editorial-overlay.md",
    appliesTo: ["editorial_diagnostic", "developmental_editing", "line_editing", "copy_editing", "proofreading", "independent_quality_review"],
    appliesWhen: ["faith", "christian", "devotional", "inspirational", "ministry"],
    promptPrimer:
      "Preserve spiritual intent, scripture handling rules, and denominational neutrality. Do not flatten sermonic cadence or normalize faith language into generic prose."
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
  CANONICAL_STYLE_GUIDES,
  COMPANION_GUIDES,
  getCompanionGuideById,
  getStyleGuideById,
  listCanonicalStyleGuides,
  listCompanionGuides
};
