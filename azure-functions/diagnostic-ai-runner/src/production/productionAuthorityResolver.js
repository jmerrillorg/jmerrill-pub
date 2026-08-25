"use strict";

const AUTHOR_SELECTION = "AUTHOR_ONBOARDING";
const GENRE_DEFAULT = "GENRE_DEFAULT";
const LIFECYCLE_AUTHORITY = "LIFECYCLE_AUTHORITY";
const DERIVED_VALUE = "DERIVED_VALUE";
const JMP_EXCEPTION = "JMP_EXCEPTION";

const NON_RELEASE_INTENTS = new Set([
  "COMMISSIONING",
  "INTERNAL",
  "PROTOTYPE",
  "PROOF",
  "ARCHIVAL",
  "NON_RELEASE",
  "ARCHIVAL_NON_RELEASE"
]);

const PROFILE_STATUS = {
  CANON: "CANON",
  CANON_CANDIDATE: "CANON-CANDIDATE"
};

const PRODUCTION_PROFILES = Object.freeze({
  STANDARD_TEXT_FORWARD_NONFICTION: Object.freeze({
    profileId: "JMP-PROD-STANDARD-TEXT-NONFICTION-v1.0",
    genreOrBookType: "STANDARD_TEXT_FORWARD_NONFICTION",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5 x 8", "5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM", "60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  LEADERSHIP_BUSINESS: Object.freeze({
    profileId: "JMP-PROD-LEADERSHIP-BUSINESS-v1.0",
    genreOrBookType: "LEADERSHIP_BUSINESS",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE", "STANDARD_COLOR"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM", "60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  MEMOIR: Object.freeze({
    profileId: "JMP-PROD-MEMOIR-v1.0",
    genreOrBookType: "MEMOIR",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5 x 8", "5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE", "STANDARD_COLOR"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM", "60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  DEVOTIONAL: Object.freeze({
    profileId: "JMP-PROD-DEVOTIONAL-v1.0",
    genreOrBookType: "DEVOTIONAL",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5 x 8", "5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM", "60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  POETRY: Object.freeze({
    profileId: "JMP-PROD-POETRY-v1.0",
    genreOrBookType: "POETRY",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5 x 8", "5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  NOVEL_NARRATIVE_FICTION: Object.freeze({
    profileId: "JMP-PROD-NOVEL-NARRATIVE-FICTION-v1.0",
    genreOrBookType: "NOVEL_NARRATIVE_FICTION",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "CREAM",
      paperStock: "55_CREAM",
      paperWeight: "55 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["5 x 8", "5.5 x 8.5", "6 x 9"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE"]),
      paperColor: Object.freeze(["WHITE", "CREAM"]),
      paperStock: Object.freeze(["50_WHITE", "55_CREAM", "60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  CHILDRENS_PICTURE_BOOK: Object.freeze({
    profileId: "JMP-PROD-CHILDRENS-PICTURE-BOOK-v1.0",
    genreOrBookType: "CHILDRENS_PICTURE_BOOK",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "PREMIUM_COLOR",
      paperColor: "WHITE",
      paperStock: "60_WHITE",
      paperWeight: "60 lb",
      paperbackFinish: "GLOSS",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "GLOSS"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["8.5 x 8.5", "8 x 10"]),
      interiorColorMode: Object.freeze(["STANDARD_COLOR", "PREMIUM_COLOR"]),
      paperColor: Object.freeze(["WHITE"]),
      paperStock: Object.freeze(["60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  }),
  WORKBOOK_JOURNAL: Object.freeze({
    profileId: "JMP-PROD-WORKBOOK-JOURNAL-v1.0",
    genreOrBookType: "WORKBOOK_JOURNAL",
    profileVersion: "1.0",
    status: PROFILE_STATUS.CANON_CANDIDATE,
    defaults: Object.freeze({
      interiorColorMode: "BLACK_AND_WHITE",
      paperColor: "WHITE",
      paperStock: "60_WHITE",
      paperWeight: "60 lb",
      paperbackFinish: "MATTE",
      hardcoverConstruction: "CASE_LAMINATE",
      hardcoverFinish: "MATTE"
    }),
    allowed: Object.freeze({
      trimSize: Object.freeze(["6 x 9", "8 x 10"]),
      interiorColorMode: Object.freeze(["BLACK_AND_WHITE", "STANDARD_COLOR"]),
      paperColor: Object.freeze(["WHITE"]),
      paperStock: Object.freeze(["60_WHITE"]),
      paperbackFinish: Object.freeze(["MATTE", "GLOSS"]),
      hardcoverConstruction: Object.freeze(["CASE_LAMINATE"]),
      hardcoverFinish: Object.freeze(["MATTE", "GLOSS"])
    })
  })
});

const PROFILE_ALIASES = Object.freeze({
  BUSINESS: "LEADERSHIP_BUSINESS",
  LEADERSHIP: "LEADERSHIP_BUSINESS",
  LEADERSHIP_BUSINESS: "LEADERSHIP_BUSINESS",
  BIOGRAPHY_MEMOIR: "MEMOIR",
  MEMOIR: "MEMOIR",
  DEVOTIONAL: "DEVOTIONAL",
  CHRISTIAN_FAITH: "DEVOTIONAL",
  INSPIRATIONAL: "STANDARD_TEXT_FORWARD_NONFICTION",
  POETRY: "POETRY",
  FICTION: "NOVEL_NARRATIVE_FICTION",
  NOVEL: "NOVEL_NARRATIVE_FICTION",
  NARRATIVE_FICTION: "NOVEL_NARRATIVE_FICTION",
  CHILDRENS: "CHILDRENS_PICTURE_BOOK",
  CHILDREN_S: "CHILDRENS_PICTURE_BOOK",
  CHILDRENS_PICTURE_BOOK: "CHILDRENS_PICTURE_BOOK",
  EARLY_READER: "CHILDRENS_PICTURE_BOOK",
  WORKBOOK: "WORKBOOK_JOURNAL",
  JOURNAL: "WORKBOOK_JOURNAL",
  WORKBOOK_JOURNAL: "WORKBOOK_JOURNAL",
  ACADEMIC: "STANDARD_TEXT_FORWARD_NONFICTION",
  TRADE: "STANDARD_TEXT_FORWARD_NONFICTION",
  STANDARD_TEXT_FORWARD_NONFICTION: "STANDARD_TEXT_FORWARD_NONFICTION"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function resolvePublicationIntent(value) {
  const key = normalizeKey(value);
  if (!key) return "COMMERCIAL_RELEASE";
  if (key === "NONRELEASE") return "NON_RELEASE";
  if (key === "ARCHIVAL_NON_RELEASE") return "ARCHIVAL_NON_RELEASE";
  return key;
}

function commercialMetadataPolicy(publicationIntent, input = {}) {
  const intent = resolvePublicationIntent(publicationIntent);
  const nonRelease = NON_RELEASE_INTENTS.has(intent);
  return {
    publicationIntent: intent,
    isbnRequired: typeof input.isbnRequired === "boolean" ? input.isbnRequired : !nonRelease,
    barcodeRequired: typeof input.barcodeRequired === "boolean" ? input.barcodeRequired : !nonRelease,
    distributionRequired: typeof input.distributionRequired === "boolean" ? input.distributionRequired : !nonRelease,
    publicationLaunchRequired: typeof input.publicationLaunchRequired === "boolean" ? input.publicationLaunchRequired : !nonRelease,
    commercialMetadataAuthority: nonRelease ? "PUBLICATION_INTENT_NON_RELEASE" : "PUBLICATION_INTENT_COMMERCIAL_RELEASE"
  };
}

function selectProfile(input = {}) {
  const profileKey = PROFILE_ALIASES[normalizeKey(input.productionProfile)] ||
    PROFILE_ALIASES[normalizeKey(input.bookType)] ||
    PROFILE_ALIASES[normalizeKey(input.genre)] ||
    "STANDARD_TEXT_FORWARD_NONFICTION";
  return PRODUCTION_PROFILES[profileKey] || PRODUCTION_PROFILES.STANDARD_TEXT_FORWARD_NONFICTION;
}

function authorityRecord(attribute, value, authoritySource, sourceRecord = null) {
  return {
    attribute,
    value,
    authoritySource,
    sourceRecord,
    sourceArtifact: null,
    sourceTimestamp: null,
    resolvedAt: new Date().toISOString()
  };
}

function resolveSelectableAttribute(attribute, authorValue, profile, validOptions = null) {
  const authorSelection = normalizeString(authorValue);
  if (authorSelection && normalizeKey(authorSelection) !== "RECOMMEND_BEST_OPTION") {
    const allowed = validOptions || profile.allowed?.[attribute] || [];
    const normalizedAuthor = normalizeKey(authorSelection);
    const compatible = allowed.length === 0 || allowed.some((option) => normalizeKey(option) === normalizedAuthor);
    return {
      ...authorityRecord(
        attribute,
        authorSelection,
        compatible ? AUTHOR_SELECTION : JMP_EXCEPTION,
        compatible ? "author_onboarding" : "provider_compatibility"
      ),
      providerCompatible: compatible,
      overrideRequired: !compatible
    };
  }
  const defaultValue = normalizeString(profile.defaults?.[attribute]);
  if (defaultValue) {
    return {
      ...authorityRecord(attribute, defaultValue, GENRE_DEFAULT, profile.profileId),
      providerCompatible: true,
      overrideRequired: false
    };
  }
  return {
    ...authorityRecord(attribute, "", JMP_EXCEPTION, profile.profileId),
    providerCompatible: false,
    overrideRequired: true
  };
}

function resolveProductionAuthority(input = {}) {
  const profile = selectProfile(input);
  const commercial = commercialMetadataPolicy(input.publicationIntent, input);
  const selectable = {
    interiorColorMode: resolveSelectableAttribute("interiorColorMode", input.interiorColorMode, profile),
    paperColor: resolveSelectableAttribute("paperColor", input.paperColor, profile),
    paperStock: resolveSelectableAttribute("paperStock", input.paperStock, profile),
    paperWeight: resolveSelectableAttribute("paperWeight", input.paperWeight, profile),
    paperbackFinish: resolveSelectableAttribute("paperbackFinish", input.paperbackFinish, profile),
    hardcoverConstruction: resolveSelectableAttribute("hardcoverConstruction", input.hardcoverConstruction, profile),
    hardcoverFinish: resolveSelectableAttribute("hardcoverFinish", input.hardcoverFinish, profile)
  };
  const exceptions = Object.values(selectable)
    .filter((item) => item.overrideRequired)
    .map((item) => `${item.attribute}:PROVIDER_OR_PROFILE_EXCEPTION_REQUIRED`);

  return {
    profile: {
      profileId: profile.profileId,
      genreOrBookType: profile.genreOrBookType,
      profileVersion: profile.profileVersion,
      status: profile.status,
      allowed: profile.allowed
    },
    publicationIntent: commercial.publicationIntent,
    commercial,
    selectable,
    lifecycleAuthorities: {
      trimSize: authorityRecord("trimSize", normalizeString(input.trimSize), LIFECYCLE_AUTHORITY, input.trimAuthority || "title_trim_authority"),
      finalPageCount: authorityRecord("finalPageCount", input.pageCount == null ? "" : String(input.pageCount), LIFECYCLE_AUTHORITY, input.pageCountAuthority || "final_approved_interior_proof"),
      imprint: authorityRecord("imprint", normalizeString(input.imprint), LIFECYCLE_AUTHORITY, input.imprintAuthority || "editorial_review_title_authority"),
      backCoverCopy: authorityRecord("backCoverCopy", normalizeString(input.backCoverCopy), LIFECYCLE_AUTHORITY, input.backCoverCopyAuthority || "publisher_approved_back_cover_copy")
    },
    derived: {},
    exceptions
  };
}

module.exports = {
  AUTHOR_SELECTION,
  DERIVED_VALUE,
  GENRE_DEFAULT,
  JMP_EXCEPTION,
  LIFECYCLE_AUTHORITY,
  NON_RELEASE_INTENTS,
  PRODUCTION_PROFILES,
  commercialMetadataPolicy,
  normalizeKey,
  resolveProductionAuthority,
  resolvePublicationIntent,
  selectProfile
};
