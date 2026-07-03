"use strict";

/**
 * Publisher Recommendation review surface for PROGRAM-002.
 *
 * This module reads the existing pre-package Editorial Review result,
 * prepares a safe Publisher-facing review packet for exception cases, and
 * can persist a draft author recommendation. It does not create Opportunities,
 * generate agreements, touch Stripe/BC/royalties, move SharePoint folders, or
 * start production.
 */

const { createAuthorDraftDataverseClient } = require("../dataverse/authorDraftPersistenceClient");
const { persistAuthorResponseDraft } = require("../author/authorDraftPersister");
const {
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS,
  TEMPLATE_NAME
} = require("../author/authorResponseDraftBuilder");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const {
  DIAGNOSTIC_STATUS,
  RECOMMENDED_IMPRINT_LABELS
} = require("./preContractEditorialReviewGate");

const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const INTAKE_ENTITY_SET = "jm1_publishingintakes";
const CONTACT_ENTITY_SET = "contacts";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";

const INTAKE_FIELD = Object.freeze({
  referenceCode: "jm1_intakereferencecode",
  firstName: "jm1_firstname",
  lastName: "jm1_lastname",
  email: "jm1_email",
  projectTitle: "jm1_projecttitle",
  manuscriptType: "jm1_manuscripttype",
  manuscriptUrl: "jm1_manuscripturl"
});

const RECOMMENDED_PACKAGE_LABELS = Object.freeze({
  196650000: "JMP-PKG-STARTER / Starter Publishing Package",
  196650001: "JMP-PKG-PRO / Professional Publishing Package",
  196650002: "JMP-PKG-SIGNATURE / Signature Publishing Partnership",
  196650003: "JM Prestige Standard",
  196650004: "JM Prestige Premium",
  196650005: "Editorial Evaluation Only",
  196650006: "Editorial Services Only",
  196650007: "Distribution Only",
  196650008: "Decline"
});

const PACKAGE_CODES_BY_VALUE = Object.freeze({
  196650000: "JMP-PKG-STARTER",
  196650001: "JMP-PKG-PRO",
  196650002: "JMP-PKG-SIGNATURE"
});

const WORK_TYPE_LABELS = Object.freeze({
  196650000: "Full-length Book",
  196650001: "Novella",
  196650002: "Children's Picture Book",
  196650003: "Poetry Collection",
  196650004: "Devotional",
  196650005: "Workbook / Journal",
  196650006: "Short Story Collection",
  196650007: "Other"
});

const PUBLISHER_ACTION = Object.freeze({
  APPROVE_SEND: "Approve & Send Recommendation",
  OVERRIDE: "Override Recommendation",
  HOLD: "Hold / Needs Review"
});

const PUBLISHER_REVIEW_REASON_LABELS = Object.freeze({
  SIGNATURE_SIGNAL_PREEXISTING: "JM Signature Candidate",
  SIGNATURE_CANDIDATE_DETECTED: "JM Signature Candidate",
  LOW_CONFIDENCE: "Confidence Review",
  RIGHTS_OR_DISCLOSURE_RISK: "Rights Review",
  NOT_A_FIT_OR_RISK_FLAGGED: "Hard Stop",
  AMBIGUOUS_AFTER_CONTENT_REVIEW: "Confidence Review",
  AI_REVIEW_TECHNICAL_FAILURE: "Confidence Review",
  PACKAGE_MISMATCH: "Doctrine Conflict"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PUBLISHER_RECOMMENDATION_REVIEW_BLOCKED", reason, ...extra };
}

function encodeODataString(value) {
  return String(value).replace(/'/g, "''");
}

async function getJson(apiBase, token, path) {
  const url = `${apiBase.replace(/\/$/, "")}/${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.error?.code || response.status;
    throw Object.assign(new Error(`Dataverse read failed: ${code}`), {
      safeCode: "DATAVERSE_READ_FAILED",
      httpStatus: response.status
    });
  }
  return body;
}

async function readDiagnosticContext({ apiBase, token, diagnosticId, intakeReferenceCode }) {
  const select = [
    "jm1pub_name",
    "jm1pub_diagnosticstatus",
    "jm1pub_recommendedpackage",
    "jm1pub_recommendedimprint",
    "jm1pub_imprintlocked",
    "jm1pub_signaturereviewrequired",
    "jm1pub_worktype",
    "jm1pub_genreconfirmed",
    "jm1pub_manuscriptwordcount",
    "jm1pub_hardstopflag",
    "jm1pub_rightsconcernflag",
    "jm1pub_legalflag",
    "jm1pub_ethicsflag",
    "jm1pub_permissionsrequired",
    "jm1pub_thirdpartycontentdetected",
    "jm1_authordraftsubject",
    "jm1_authordraftbody",
    "jm1_authordrafttemplate",
    "jm1_authordraftsendstatus",
    "jm1_authordraftapprovalstatus",
    "jm1_authordraftpreparedon",
    "jm1_authordraftpreparedby",
    "jm1_authordraftapprovalnotes",
    "jm1_authorvisibilitymailbox",
    "_jm1pub_publishingintake_value",
    "_jm1pub_authorcontact_value"
  ].join(",");
  const diagnostic = await getJson(
    apiBase,
    token,
    `${DIAGNOSTIC_ENTITY_SET}(${diagnosticId})?$select=${select}`
  );

  const intakeId = diagnostic._jm1pub_publishingintake_value || null;
  const contactId = diagnostic._jm1pub_authorcontact_value || null;
  let intake = {};
  let contact = {};
  if (intakeId) {
    intake = await getJson(
      apiBase,
      token,
      `${INTAKE_ENTITY_SET}(${intakeId})?$select=${Object.values(INTAKE_FIELD).join(",")}`
    );
  }
  if (contactId) {
    contact = await getJson(
      apiBase,
      token,
      `${CONTACT_ENTITY_SET}(${contactId})?$select=fullname,firstname,lastname,emailaddress1`
    );
  }

  const referenceFromIntake = normalizeString(intake[INTAKE_FIELD.referenceCode]);
  if (intakeReferenceCode && referenceFromIntake && referenceFromIntake.toUpperCase() !== intakeReferenceCode.toUpperCase()) {
    return { ok: false, reason: "INTAKE_REFERENCE_MISMATCH" };
  }

  const logFilter = [
    `jm1_sourcerecordid eq '${encodeODataString(diagnosticId)}'`,
    "jm1_actiontype eq 'PRE_PACKAGE_EDITORIAL_REVIEW_PERFORMED'"
  ].join(" and ");
  const logResult = await getJson(
    apiBase,
    token,
    `${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,createdon,jm1_sourceentity,jm1_sourcerecordid&$filter=${encodeURIComponent(logFilter)}&$orderby=createdon desc&$top=1`
  );

  return {
    ok: true,
    diagnostic,
    intake,
    contact,
    executionLog: Array.isArray(logResult.value) && logResult.value.length > 0 ? logResult.value[0] : null
  };
}

function parseLogDescription(description) {
  const text = normalizeString(description);
  const pick = (pattern) => {
    const match = text.match(pattern);
    return match ? normalizeString(match[1]) : null;
  };
  return {
    contentAwareReviewPerformed: /Content-aware manuscript review performed: true/i.test(text),
    wordCountFitConfirmed: /Word count fit confirmed: true/i.test(text),
    agreementReadiness: pick(/Agreement readiness: ([^.]+)\./i),
    imprintOutcome: pick(/Imprint outcome: ([^.]+)\./i),
    recommendedPackageCode: pick(/Recommended package: ([^.]+)\./i),
    alternatePackageCode: pick(/Alternate package: ([^.]+)\./i),
    humanReviewReason: pick(/requires human decision \(([^)]+)\)/i),
    authorFacingSummaryGenerated: /Author-facing scoring summary generated/i.test(text)
  };
}

function buildPackageRationale({ diagnostic, logSummary }) {
  const code = logSummary.recommendedPackageCode || PACKAGE_CODES_BY_VALUE[diagnostic.jm1pub_recommendedpackage] || "unknown";
  const alternate = logSummary.alternatePackageCode || (code === "JMP-PKG-PRO" ? "JMP-PKG-STARTER" : null);
  const pieces = [
    `${code} is recommended because the manuscript is a substantial full-length work and needs a professional editorial path before agreement/onboarding.`,
    alternate ? `${alternate} remains the lower-scope alternative if Jackie chooses a narrower starting path.` : null,
    "Payment options, contracts, production, and workspace movement remain blocked until author acceptance and later lifecycle gates."
  ].filter(Boolean);
  return pieces.join(" ");
}

function buildAuthorRecommendationDraftBody({ authorName, projectTitle, packageLabel, alternatePackageCode, imprintLabel }) {
  return [
    `Hello ${authorName},`,
    "",
    `Thank you for giving J Merrill Publishing the opportunity to review ${projectTitle}. We have completed our initial editorial review and believe the best next publishing path is the ${packageLabel}.`,
    "",
    alternatePackageCode
      ? `If you would like a narrower starting point, we can also discuss ${alternatePackageCode} as an alternative path.`
      : "If you would like to talk through scope before deciding, we can discuss the best path together.",
    "",
    imprintLabel
      ? `The imprint recommendation for this project is ${imprintLabel}.`
      : "If an imprint question remains, we will address it before agreement preparation.",
    "",
    "The next step is a publisher conversation or reply confirming how you would like to proceed. You may accept this recommendation, request a different package, or send questions before agreement/payment steps begin.",
    "",
    "Warmly,",
    "J Merrill Publishing"
  ].join("\n");
}

function buildRecommendationView(context, { diagnosticId, intakeReferenceCode }) {
  const { diagnostic, intake, contact, executionLog } = context;
  const logSummary = parseLogDescription(executionLog?.jm1_actiondescription);
  const authorName = normalizeString(contact.fullname) ||
    [contact.firstname || intake[INTAKE_FIELD.firstName], contact.lastname || intake[INTAKE_FIELD.lastName]].map(normalizeString).filter(Boolean).join(" ") ||
    "Author";
  const authorEmail = normalizeString(contact.emailaddress1 || intake[INTAKE_FIELD.email]);
  const projectTitle = normalizeString(intake[INTAKE_FIELD.projectTitle]) || "your manuscript";
  const packageValue = diagnostic.jm1pub_recommendedpackage;
  const packageCode = logSummary.recommendedPackageCode || PACKAGE_CODES_BY_VALUE[packageValue] || null;
  const packageLabel = RECOMMENDED_PACKAGE_LABELS[packageValue] || packageCode || "Recommendation pending";
  const imprintLabel = diagnostic.jm1pub_recommendedimprint != null
    ? RECOMMENDED_IMPRINT_LABELS[diagnostic.jm1pub_recommendedimprint] || String(diagnostic.jm1pub_recommendedimprint)
    : null;
  const flags = {
    hardStop: diagnostic.jm1pub_hardstopflag === true,
    rightsConcern: diagnostic.jm1pub_rightsconcernflag === true,
    legal: diagnostic.jm1pub_legalflag === true,
    ethics: diagnostic.jm1pub_ethicsflag === true,
    permissionsRequired: diagnostic.jm1pub_permissionsrequired === true,
    thirdPartyContentDetected: diagnostic.jm1pub_thirdpartycontentdetected === true,
    signatureReviewRequired: diagnostic.jm1pub_signaturereviewrequired === true
  };
  const flagList = Object.entries(flags).filter(([, value]) => value).map(([key]) => key);
  const publisherReviewReason = flags.signatureReviewRequired
    ? "JM Signature Candidate"
    : (flagList.includes("hardStop") ? "Hard Stop" :
      flagList.includes("legal") ? "Legal Review" :
        flagList.includes("rightsConcern") || flagList.includes("permissionsRequired") || flagList.includes("thirdPartyContentDetected") ? "Rights Review" :
          flagList.includes("ethics") ? "Ethics Review" :
            PUBLISHER_REVIEW_REASON_LABELS[logSummary.humanReviewReason] || null);
  const publisherReviewRequired = Boolean(publisherReviewReason);
  const packageRationale = buildPackageRationale({ diagnostic, logSummary });
  const authorDraft = {
    subject: `Publishing recommendation for ${projectTitle}`,
    body: buildAuthorRecommendationDraftBody({
      authorName,
      projectTitle,
      packageLabel,
      alternatePackageCode: logSummary.alternatePackageCode,
      imprintLabel
    }),
    templateName: TEMPLATE_NAME,
    sendStatus: DRAFT_STATUS,
    approvalStatus: DRAFT_APPROVAL_STATUS,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX
  };

  return {
    diagnosticId,
    intakeReferenceCode,
    dataverse: {
      diagnosticEntity: DIAGNOSTIC_ENTITY_SET,
      diagnosticStatus: diagnostic.jm1pub_diagnosticstatus,
      diagnosticStatusLabel: publisherReviewRequired ? "Publisher Review Required" : "Recommendation Ready/Sent"
    },
    author: { name: authorName, email: authorEmail || null },
    project: {
      title: projectTitle,
      workType: WORK_TYPE_LABELS[diagnostic.jm1pub_worktype] || null,
      genre: normalizeString(diagnostic.jm1pub_genreconfirmed) || null,
      wordCount: diagnostic.jm1pub_manuscriptwordcount ?? null
    },
    editorialSummary: executionLog?.jm1_actiondescription || "Editorial Review summary was not found in execution-log evidence.",
    recommendedPackage: {
      code: packageCode,
      label: packageLabel,
      dataverseValue: packageValue ?? null
    },
    imprintRecommendation: {
      label: imprintLabel,
      dataverseValue: diagnostic.jm1pub_recommendedimprint ?? null,
      locked: diagnostic.jm1pub_imprintlocked === true,
      status: imprintLabel ? (diagnostic.jm1pub_imprintlocked === true ? "Assigned and locked" : "Recommended") : "Exception review required"
    },
    editorialPathRecommendation: {
      status: publisherReviewRequired ? "Publisher Review Required" : "Recommendation Ready",
      reason: publisherReviewReason,
      nextStep: publisherReviewRequired
        ? "Jackie resolves the exception, overrides, or holds for review."
        : "Author recommendation may send automatically under publisher-certified automation.",
      agreementReadiness: logSummary.agreementReadiness || (publisherReviewRequired ? "BLOCKED_HUMAN_REVIEW_REQUIRED" : "READY_FOR_AGREEMENT")
    },
    packageOptionsRationale: packageRationale,
    flags: flagList.length > 0 ? flagList : ["none"],
    authorFacingRecommendationDraft: authorDraft,
    actions: publisherReviewRequired ? [
      PUBLISHER_ACTION.APPROVE_SEND,
      PUBLISHER_ACTION.OVERRIDE,
      PUBLISHER_ACTION.HOLD
    ] : [],
    executionLog: executionLog ? {
      id: executionLog.jm1_executionlogid,
      name: executionLog.jm1_name,
      actionType: executionLog.jm1_actiontype,
      createdOn: executionLog.createdon
    } : null,
    persistedDraft: {
      subjectPresent: Boolean(normalizeString(diagnostic.jm1_authordraftsubject)),
      bodyPresent: Boolean(normalizeString(diagnostic.jm1_authordraftbody)),
      sendStatus: normalizeString(diagnostic.jm1_authordraftsendstatus) || null,
      approvalStatus: normalizeString(diagnostic.jm1_authordraftapprovalstatus) || null
    }
  };
}

function buildDraftPayloadFromView(view) {
  return {
    diagnosticId: view.diagnosticId,
    intakeReferenceCode: view.intakeReferenceCode,
    authorName: view.author.name,
    authorEmail: view.author.email,
    projectTitle: view.project.title,
    draftTemplate: TEMPLATE_NAME,
    draftSubject: view.authorFacingRecommendationDraft.subject,
    draftBody: view.authorFacingRecommendationDraft.body,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    sendStatus: DRAFT_STATUS,
    approvalStatus: DRAFT_APPROVAL_STATUS,
    preparedAt: new Date().toISOString(),
    preparedBy: "publisher-recommendation-review",
    diagnosticOutputSummary: view.editorialSummary.slice(0, 500),
    diagnosticRiskFlags: Array.isArray(view.flags) ? view.flags.join(", ") : "none",
    confidence: 0.79,
    reviewDecision: "APPROVE_FOR_AUTHOR_DRAFT",
    reviewStatus: "APPROVED_FOR_AUTHOR_DRAFT",
    requiresHumanReview: true,
    metadata: {
      correlationId: view.executionLog?.id || view.diagnosticId
    },
    visibilityRule: {
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      futureSendMustCopyOrMirror: true,
      futureSendEventMustBeLoggedInDataverse: true
    }
  };
}

async function buildPublisherRecommendationReview(input = {}, deps = {}) {
  if (!isPlainObject(input)) return blocked("INVALID_INPUT");
  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");

  const apiBase = deps.apiBase || process.env.DATAVERSE_WEB_API_BASE_URL;
  const token = deps.token || (deps.getToken ? await deps.getToken(process.env.DATAVERSE_RESOURCE_URL) : null);
  if (!apiBase || !token) return blocked("DATAVERSE_CONFIG_MISSING");

  const context = deps.context || await readDiagnosticContext({ apiBase, token, diagnosticId, intakeReferenceCode });
  if (!context.ok) return blocked(context.reason || "CONTEXT_READ_FAILED");
  const view = buildRecommendationView(context, { diagnosticId, intakeReferenceCode });
  return { ok: true, code: "PUBLISHER_RECOMMENDATION_VIEW_READY", view };
}

async function preparePublisherRecommendationDraft(input = {}, deps = {}) {
  const viewResult = await buildPublisherRecommendationReview(input, deps);
  if (!viewResult.ok) return viewResult;
  const draftPayload = buildDraftPayloadFromView(viewResult.view);
  const dataverseClient = deps.dataverseClient || createAuthorDraftDataverseClient();
  const persistence = await persistAuthorResponseDraft({ draftPayload, dataverseClient });
  return {
    ok: persistence.persisted === true,
    code: persistence.persisted === true ? "PUBLISHER_RECOMMENDATION_DRAFT_READY" : "PUBLISHER_RECOMMENDATION_DRAFT_FAILED",
    view: viewResult.view,
    draft: {
      subject: draftPayload.draftSubject,
      body: draftPayload.draftBody,
      templateName: draftPayload.draftTemplate,
      sendStatus: draftPayload.sendStatus,
      approvalStatus: draftPayload.approvalStatus,
      internalVisibilityMailbox: draftPayload.internalVisibilityMailbox
    },
    persistence
  };
}

module.exports = {
  buildPublisherRecommendationReview,
  preparePublisherRecommendationDraft,
  buildRecommendationView,
  buildDraftPayloadFromView,
  parseLogDescription,
  PUBLISHER_ACTION,
  RECOMMENDED_PACKAGE_LABELS,
  PACKAGE_CODES_BY_VALUE
};
