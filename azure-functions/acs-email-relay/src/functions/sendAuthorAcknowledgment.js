const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");

const ALLOWED_INTAKE_CHANNEL = "INT-PUB-005 /join";
const DEFAULT_PROJECT_TITLE = "your book";
const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FIELD_LENGTH = 300;
const MAX_BODY_LENGTH = 6000;
const ACS_PROVIDER_NAME = "acs-email";
const ACS_SENDER = "DoNotReply@email.jmerrill.one";
// Dedicated sender for author-facing approved responses only (Milestone 6
// continuation communication and beyond). Separate from ACS_SENDER, which
// remains DoNotReply for the unrelated intake-acknowledgment and internal-
// notification sends — those are unaffected by this change.
const AUTHOR_RESPONSE_SENDER = "publishing@email.jmerrill.one";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const INTERNAL_NOTIFICATION_TYPE = "AUTHOR_DRAFT_READY_FOR_REVIEW";
const JOIN_INTERNAL_NOTIFICATION_TYPE = "JOIN_INTAKE_RECEIVED";
const APPROVED_AUTHOR_RESPONSE_TYPE = "APPROVED_AUTHOR_RESPONSE";
const INTERNAL_NOTIFICATION_SENT = "INTERNAL_NOTIFICATION_SENT";
const JOIN_INTERNAL_NOTIFICATION_SENT = "JOIN_INTERNAL_NOTIFICATION_SENT";
const AUTHOR_RESPONSE_SENT = "AUTHOR_RESPONSE_SENT";
const DRAFT_STATUS = "DRAFT_ONLY";
const DRAFT_APPROVAL_STATUS = "PENDING_HUMAN_APPROVAL";

const UNSAFE_FIELD_NAMES = new Set([
  "manuscript",
  "manuscriptText",
  "extractedManuscriptContent",
  "prompt",
  "promptBody",
  "rawModelOutput",
  "rawModelResponse",
  "opportunity",
  "opportunityPayload",
  "opportunityReady",
  "flowD",
  "flowDTrigger",
  "flowDReady",
  "secret",
  "secrets",
  "token",
  "tokens",
  "apiKey",
  "key",
  "keys",
  "header",
  "headers",
  "authorization",
  "cookie",
  "cookies",
  "connectionString"
]);

let emailClient;

function getEmailClient() {
  if (emailClient) {
    return emailClient;
  }

  if (process.env.ACS_CONNECTION_STRING) {
    emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);
    return emailClient;
  }

  if (process.env.ACS_ENDPOINT) {
    emailClient = new EmailClient(
      process.env.ACS_ENDPOINT,
      new DefaultAzureCredential()
    );
    return emailClient;
  }

  throw Object.assign(new Error("ACS configuration is missing."), {
    safeCode: "ACS_CONFIG_MISSING"
  });
}

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return safeTrim(value).slice(0, MAX_FIELD_LENGTH);
}

function normalizeBody(value) {
  return safeTrim(value).slice(0, MAX_BODY_LENGTH);
}

function isValidEmail(value) {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isJmerrillPubMailbox(value) {
  return normalizeText(value).toLowerCase().endsWith("@jmerrill.pub");
}

function normalizeRecipients(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item).toLowerCase()).filter(Boolean);
  }

  const single = normalizeText(value).toLowerCase();
  return single ? [single] : [];
}

function hasUnsafeField(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeField(item));
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    if (UNSAFE_FIELD_NAMES.has(key)) {
      return true;
    }

    return hasUnsafeField(nestedValue);
  });
}

function unauthorized(reference) {
  return {
    status: 401,
    jsonBody: {
      status: "error",
      code: "UNAUTHORIZED",
      reference
    }
  };
}

function validationError(code, reference) {
  return {
    status: 400,
    jsonBody: {
      status: "error",
      code,
      reference
    }
  };
}

function serverError(code, reference) {
  return {
    status: 502,
    jsonBody: {
      status: "error",
      code,
      reference
    }
  };
}

function milestoneValidationError(reason, payload = {}) {
  return {
    status: 400,
    jsonBody: {
      accepted: false,
      code: "ACS_RELAY_VALIDATION_FAILED",
      reason,
      intakeReferenceCode: normalizeText(payload.intakeReferenceCode),
      diagnosticId: normalizeText(payload.diagnosticId)
    }
  };
}

function milestoneUnauthorized(payload = {}) {
  return {
    status: 401,
    jsonBody: {
      accepted: false,
      code: "UNAUTHORIZED",
      reason: "UNAUTHORIZED",
      intakeReferenceCode: normalizeText(payload.intakeReferenceCode),
      diagnosticId: normalizeText(payload.diagnosticId)
    }
  };
}

function milestoneServerError(code, payload = {}) {
  return {
    status: 502,
    jsonBody: {
      accepted: false,
      code,
      reason: code,
      intakeReferenceCode: normalizeText(payload.intakeReferenceCode),
      diagnosticId: normalizeText(payload.diagnosticId)
    }
  };
}

function verifyRelayKey(request) {
  const expected = process.env.JM1_RELAY_API_KEY;
  const actual = request.headers.get("x-jm1-relay-key");

  return Boolean(expected && actual && actual === expected);
}

function validatePayload(payload) {
  const reference = normalizeText(payload.reference);
  const to = normalizeText(payload.to).toLowerCase();
  const firstName = normalizeText(payload.firstName);
  const projectTitle = normalizeText(payload.projectTitle) || DEFAULT_PROJECT_TITLE;
  const intakeChannel = safeTrim(payload.intakeChannel);
  const manuscriptUrl = normalizeBody(payload.manuscriptUrl);

  if (!reference || !REFERENCE_PATTERN.test(reference)) {
    return { ok: false, code: "INVALID_REFERENCE", reference };
  }

  if (!to || !isValidEmail(to)) {
    return { ok: false, code: "INVALID_TO", reference };
  }

  if (intakeChannel !== ALLOWED_INTAKE_CHANNEL) {
    return { ok: false, code: "INVALID_INTAKE_CHANNEL", reference };
  }

  if (!firstName) {
    return { ok: false, code: "MISSING_FIRST_NAME", reference };
  }

  return {
    ok: true,
    value: {
      reference,
      to,
      firstName,
      projectTitle,
      intakeChannel,
      hasManuscriptLink: Boolean(manuscriptUrl)
    }
  };
}

function buildAcknowledgmentEmail(payload) {
  const senderAddress = safeTrim(process.env.ACS_EMAIL_SENDER);

  if (!senderAddress || senderAddress !== ACS_SENDER) {
    throw Object.assign(new Error("ACS sender is missing."), {
      safeCode: senderAddress ? "ACS_SENDER_INVALID" : "ACS_SENDER_MISSING"
    });
  }

  const subject = `We received your publishing inquiry — ${payload.reference}`;
  const manuscriptCopy = payload.hasManuscriptLink
    ? [
        "We received your manuscript link with your inquiry. Our Editorial Review Team will begin evaluating the material you provided and the story details you shared.",
        "",
        "If we need anything else before review can continue, we will let you know."
      ]
    : [
        "We did not receive a manuscript file or shareable manuscript link with your inquiry.",
        "",
        "Please reply with your manuscript attached or with a shareable manuscript link when it is ready. Editorial review will begin as soon as we receive access to the manuscript."
      ];
  const plainText = [
    `Good day ${payload.firstName},`,
    "",
    "Thank you for reaching out to J Merrill Publishing and trusting us with the first step of your publishing journey.",
    "",
    `We received your inquiry for ${payload.projectTitle}, and your reference number is:`,
    "",
    payload.reference,
    "",
    ...manuscriptCopy,
    "",
    "Your book is more than a project. It carries your story, your voice, and the people you hope to reach. Our team will review the details you shared and follow up within 7–10 business days with the next right step.",
    "",
    "Please keep this reference number for your records.",
    "",
    "With care,",
    "",
    "J Merrill Publishing",
    "Helping Authors Help Themselves",
    "https://jmerrill.pub"
  ].join("\n");

  return {
    senderAddress,
    content: {
      subject,
      plainText
    },
    recipients: {
      to: [
        {
          address: payload.to,
          displayName: payload.firstName
        }
      ]
    }
  };
}

function validateCommonMilestoneFields(payload) {
  if (hasUnsafeField(payload)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }

  const intakeReferenceCode = normalizeText(payload.intakeReferenceCode);
  const diagnosticId = normalizeText(payload.diagnosticId);

  if (!intakeReferenceCode || !REFERENCE_PATTERN.test(intakeReferenceCode)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID" };
  }

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) {
    return { ok: false, reason: "DIAGNOSTIC_ID_INVALID" };
  }

  return { ok: true, intakeReferenceCode, diagnosticId };
}

function validateInternalNotificationPayload(payload = {}) {
  const common = validateCommonMilestoneFields(payload);
  if (!common.ok) return common;

  const authorEmail = normalizeText(payload.authorEmail).toLowerCase();
  const recipient = normalizeText(payload.recipient || payload.to).toLowerCase();
  const to = normalizeRecipients(payload.to === undefined ? recipient : payload.to);
  const cc = normalizeRecipients(payload.cc);
  const bcc = normalizeRecipients(payload.bcc);
  const allRecipients = [...to, ...cc, ...bcc];

  if (normalizeText(payload.notificationType) !== INTERNAL_NOTIFICATION_TYPE) {
    return { ok: false, reason: "NOTIFICATION_TYPE_INVALID" };
  }

  if (authorEmail && allRecipients.includes(authorEmail)) {
    return { ok: false, reason: "AUTHOR_RECIPIENT_BLOCKED" };
  }

  if (recipient !== INTERNAL_VISIBILITY_MAILBOX || to.length !== 1 || to[0] !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "RECIPIENT_INVALID" };
  }

  if (cc.length > 0 || bcc.length > 0) {
    return { ok: false, reason: "CC_BCC_NOT_ALLOWED" };
  }

  if (allRecipients.some(isJmerrillPubMailbox) || isJmerrillPubMailbox(authorEmail)) {
    return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED" };
  }

  if (normalizeText(payload.draftStatus) !== DRAFT_STATUS) {
    return { ok: false, reason: "DRAFT_STATUS_INVALID" };
  }

  if (normalizeText(payload.approvalStatus) !== DRAFT_APPROVAL_STATUS) {
    return { ok: false, reason: "APPROVAL_STATUS_INVALID" };
  }

  const draftPreview = normalizeBody(payload.draftPreview);
  if (!draftPreview) {
    return { ok: false, reason: "DRAFT_PREVIEW_MISSING" };
  }

  return {
    ok: true,
    value: {
      notificationType: INTERNAL_NOTIFICATION_TYPE,
      diagnosticId: common.diagnosticId,
      intakeReferenceCode: common.intakeReferenceCode,
      authorName: normalizeText(payload.authorName),
      authorEmail,
      projectTitle: normalizeText(payload.projectTitle),
      draftStatus: DRAFT_STATUS,
      approvalStatus: DRAFT_APPROVAL_STATUS,
      draftPreview,
      nextAction: normalizeText(payload.nextAction) || "Review the prepared author-response draft before any author-facing send is considered.",
      recipient: INTERNAL_VISIBILITY_MAILBOX
    }
  };
}

function validateJoinInternalNotificationPayload(payload = {}) {
  if (hasUnsafeField(payload)) {
    return { ok: false, reason: "UNSAFE_FIELD_PRESENT" };
  }

  const reference = normalizeText(payload.reference || payload.intakeReferenceCode);
  const recipient = normalizeText(payload.recipient || payload.to).toLowerCase();
  const to = normalizeRecipients(payload.to === undefined ? recipient : payload.to);
  const cc = normalizeRecipients(payload.cc);
  const bcc = normalizeRecipients(payload.bcc);
  const authorEmail = normalizeText(payload.authorEmail || payload.email).toLowerCase();
  const allRecipients = [...to, ...cc, ...bcc];

  if (normalizeText(payload.notificationType) !== JOIN_INTERNAL_NOTIFICATION_TYPE) {
    return { ok: false, reason: "NOTIFICATION_TYPE_INVALID", reference };
  }

  if (!reference || !REFERENCE_PATTERN.test(reference)) {
    return { ok: false, reason: "INTAKE_REFERENCE_CODE_INVALID", reference };
  }

  if (recipient !== INTERNAL_VISIBILITY_MAILBOX || to.length !== 1 || to[0] !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "RECIPIENT_INVALID", reference };
  }

  if (cc.length > 0 || bcc.length > 0) {
    return { ok: false, reason: "CC_BCC_NOT_ALLOWED", reference };
  }

  if (authorEmail && allRecipients.includes(authorEmail)) {
    return { ok: false, reason: "AUTHOR_RECIPIENT_BLOCKED", reference };
  }

  if (allRecipients.some(isJmerrillPubMailbox) || isJmerrillPubMailbox(authorEmail)) {
    return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED", reference };
  }

  if (!normalizeText(payload.authorName)) {
    return { ok: false, reason: "AUTHOR_NAME_MISSING", reference };
  }

  if (authorEmail && !isValidEmail(authorEmail)) {
    return { ok: false, reason: "AUTHOR_EMAIL_INVALID", reference };
  }

  if (!normalizeText(payload.projectTitle)) {
    return { ok: false, reason: "PROJECT_TITLE_MISSING", reference };
  }

  if (safeTrim(payload.intakeChannel) !== ALLOWED_INTAKE_CHANNEL) {
    return { ok: false, reason: "INVALID_INTAKE_CHANNEL", reference };
  }

  return {
    ok: true,
    value: {
      notificationType: JOIN_INTERNAL_NOTIFICATION_TYPE,
      reference,
      authorName: normalizeText(payload.authorName),
      authorEmail,
      phone: normalizeText(payload.phone) || "not provided",
      projectTitle: normalizeText(payload.projectTitle),
      manuscriptType: normalizeText(payload.manuscriptType) || "not provided",
      manuscriptStatus: normalizeText(payload.manuscriptStatus) || "not provided",
      intakeChannel: ALLOWED_INTAKE_CHANNEL,
      sharePointWorkspaceUrl: normalizeText(payload.sharePointWorkspaceUrl) || "pending workspace routing",
      dataverseIntakeUrl: normalizeText(payload.dataverseIntakeUrl) || "not provided",
      leadUrl: normalizeText(payload.leadUrl) || "pending router completion",
      contactUrl: normalizeText(payload.contactUrl) || "pending router completion",
      stageStatus: normalizeText(payload.stageStatus) || "Intake received",
      nextAction: normalizeText(payload.nextAction) || "Review the new /join intake and confirm routing/workspace completion.",
      recipient: INTERNAL_VISIBILITY_MAILBOX
    }
  };
}

function validateApprovedAuthorResponsePayload(payload = {}) {
  const common = validateCommonMilestoneFields(payload);
  if (!common.ok) return common;

  const authorEmail = normalizeText(payload.authorEmail).toLowerCase();
  const to = normalizeRecipients(payload.to === undefined ? authorEmail : payload.to);
  const cc = normalizeRecipients(payload.cc);
  const bcc = normalizeRecipients(payload.bcc);
  const internalVisibilityMailbox = normalizeText(payload.internalVisibilityMailbox).toLowerCase();
  const allRecipients = [...to, ...cc, ...bcc, internalVisibilityMailbox].filter(Boolean);

  if (normalizeText(payload.messageType) !== APPROVED_AUTHOR_RESPONSE_TYPE) {
    return { ok: false, reason: "MESSAGE_TYPE_INVALID" };
  }

  if (!authorEmail || !isValidEmail(authorEmail)) {
    return { ok: false, reason: "AUTHOR_EMAIL_INVALID" };
  }

  if (to.length !== 1 || to[0] !== authorEmail) {
    return { ok: false, reason: "AUTHOR_RECIPIENT_INVALID" };
  }

  if (internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX || !cc.includes(INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_REQUIRED" };
  }

  if (cc.some((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: "UNAPPROVED_RECIPIENT_PRESENT" };
  }

  if (bcc.length > 0) {
    return { ok: false, reason: "BCC_NOT_ALLOWED" };
  }

  if (allRecipients.some(isJmerrillPubMailbox)) {
    return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED" };
  }

  const subject = normalizeText(payload.subject);
  const body = normalizeBody(payload.body);
  if (!subject) {
    return { ok: false, reason: "SUBJECT_MISSING" };
  }

  if (!body) {
    return { ok: false, reason: "BODY_MISSING" };
  }

  if (!normalizeText(payload.approvedBy)) {
    return { ok: false, reason: "APPROVED_BY_MISSING" };
  }

  if (!normalizeText(payload.approvedOn)) {
    return { ok: false, reason: "APPROVED_ON_MISSING" };
  }

  if (payload.futureSendRequiresInternalCopy !== true) {
    return { ok: false, reason: "FUTURE_INTERNAL_COPY_REQUIRED" };
  }

  if (payload.futureSendRequiresDataverseLog !== true) {
    return { ok: false, reason: "FUTURE_DATAVERSE_SEND_LOG_REQUIRED" };
  }

  return {
    ok: true,
    value: {
      messageType: APPROVED_AUTHOR_RESPONSE_TYPE,
      diagnosticId: common.diagnosticId,
      intakeReferenceCode: common.intakeReferenceCode,
      authorEmail,
      authorName: normalizeText(payload.authorName),
      projectTitle: normalizeText(payload.projectTitle),
      subject,
      body,
      templateName: normalizeText(payload.templateName),
      approvedBy: normalizeText(payload.approvedBy),
      approvedOn: normalizeText(payload.approvedOn),
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX
    }
  };
}

function getAcsSenderAddress() {
  const senderAddress = safeTrim(process.env.ACS_EMAIL_SENDER);

  if (!senderAddress) {
    throw Object.assign(new Error("ACS sender is missing."), {
      safeCode: "ACS_SENDER_MISSING"
    });
  }

  if (senderAddress !== ACS_SENDER || isJmerrillPubMailbox(senderAddress)) {
    throw Object.assign(new Error("ACS sender is invalid."), {
      safeCode: "ACS_SENDER_INVALID"
    });
  }

  return senderAddress;
}

function getAuthorResponseSenderAddress() {
  const senderAddress = safeTrim(process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER);

  if (!senderAddress) {
    throw Object.assign(new Error("ACS author-response sender is missing."), {
      safeCode: "ACS_AUTHOR_RESPONSE_SENDER_MISSING"
    });
  }

  if (senderAddress !== AUTHOR_RESPONSE_SENDER || isJmerrillPubMailbox(senderAddress)) {
    throw Object.assign(new Error("ACS author-response sender is invalid."), {
      safeCode: "ACS_AUTHOR_RESPONSE_SENDER_INVALID"
    });
  }

  return senderAddress;
}

function buildInternalNotificationEmail(payload) {
  const plainText = [
    "Internal notification only.",
    "",
    "An author-response draft is ready for internal review.",
    "",
    `Author: ${payload.authorName || "not provided"}`,
    `Author Email (reference only): ${payload.authorEmail || "not provided"}`,
    `Project: ${payload.projectTitle || "not provided"}`,
    `Intake Reference: ${payload.intakeReferenceCode}`,
    `Diagnostic ID: ${payload.diagnosticId}`,
    `Draft Status: ${payload.draftStatus}`,
    `Approval Status: ${payload.approvalStatus}`,
    "",
    `Next action: ${payload.nextAction}`,
    "",
    "No author email has been sent.",
    "",
    `Safe preview: ${payload.draftPreview}`
  ].join("\n");

  return {
    senderAddress: getAcsSenderAddress(),
    content: {
      subject: `Internal Review Needed - Author Draft Ready - ${payload.intakeReferenceCode}`,
      plainText
    },
    recipients: {
      to: [
        {
          address: INTERNAL_VISIBILITY_MAILBOX,
          displayName: "J Merrill Publishing"
        }
      ]
    }
  };
}

function buildJoinInternalNotificationEmail(payload) {
  const plainText = [
    "Internal notification only.",
    "",
    "A new /join publishing inquiry was received.",
    "",
    `Intake Reference: ${payload.reference}`,
    `Author: ${payload.authorName}`,
    `Book Title: ${payload.projectTitle}`,
    `Email: ${payload.authorEmail || "not provided"}`,
    `Phone: ${payload.phone}`,
    `Manuscript Type: ${payload.manuscriptType}`,
    `Manuscript Status: ${payload.manuscriptStatus}`,
    `Stage/Status: ${payload.stageStatus}`,
    "",
    `SharePoint Workspace: ${payload.sharePointWorkspaceUrl}`,
    `Dataverse Intake: ${payload.dataverseIntakeUrl}`,
    `Lead: ${payload.leadUrl}`,
    `Contact: ${payload.contactUrl}`,
    "",
    `Next action: ${payload.nextAction}`,
    "",
    "No author-facing message was sent by this internal notification."
  ].join("\n");

  return {
    senderAddress: getAcsSenderAddress(),
    content: {
      subject: `New /join Intake - ${payload.reference} - ${payload.projectTitle}`,
      plainText
    },
    recipients: {
      to: [
        {
          address: INTERNAL_VISIBILITY_MAILBOX,
          displayName: "J Merrill Publishing"
        }
      ]
    }
  };
}

function buildApprovedAuthorResponseEmail(payload) {
  return {
    senderAddress: getAuthorResponseSenderAddress(),
    content: {
      subject: payload.subject,
      plainText: payload.body
    },
    // A plain "Reply" (not "Reply All") only honors Reply-To, not Cc — so
    // Reply-To must point to the internal visibility mailbox to guarantee
    // replies are captured even when the author doesn't reply-all.
    replyTo: [
      {
        address: INTERNAL_VISIBILITY_MAILBOX,
        displayName: "J Merrill Publishing"
      }
    ],
    recipients: {
      to: [
        {
          address: payload.authorEmail,
          displayName: payload.authorName || payload.authorEmail
        }
      ],
      cc: [
        {
          address: INTERNAL_VISIBILITY_MAILBOX,
          displayName: "J Merrill Publishing"
        }
      ]
    }
  };
}

async function sendAcsMessage(message) {
  const poller = await getEmailClient().beginSend(message);
  return getOperationId(poller);
}

function getOperationId(poller) {
  if (!poller || typeof poller.getOperationState !== "function") {
    return undefined;
  }

  const state = poller.getOperationState();
  return state && (state.id || state.operationId);
}

function safeErrorCode(error) {
  if (error && error.safeCode) {
    return error.safeCode;
  }

  const statusCode = error && (error.statusCode || error.code);

  if (statusCode === 401 || statusCode === 403) {
    return "ACS_AUTH_FAILED";
  }

  if (statusCode === 429) {
    return "ACS_RATE_LIMITED";
  }

  if (statusCode && Number(statusCode) >= 400 && Number(statusCode) < 500) {
    return "ACS_REQUEST_REJECTED";
  }

  return "ACS_SEND_FAILED";
}

app.http("send-author-acknowledgment", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-author-acknowledgment",
  handler: async (request, context) => {
    let reference = "";

    if (!verifyRelayKey(request)) {
      context.warn("ACS relay rejected request with invalid auth.");
      return unauthorized(reference);
    }

    let body;

    try {
      body = await request.json();
    } catch (error) {
      context.warn("ACS relay rejected malformed JSON.");
      return validationError("INVALID_JSON", reference);
    }

    const validation = validatePayload(body || {});
    reference = validation.value ? validation.value.reference : validation.reference || "";

    if (!validation.ok) {
      context.warn(`ACS relay validation failed: ${validation.code}; reference=${reference}`);
      return validationError(validation.code, reference);
    }

    try {
      const message = buildAcknowledgmentEmail(validation.value);
      const poller = await getEmailClient().beginSend(message);
      const operationId = getOperationId(poller);

      context.info(`ACS relay accepted acknowledgment send; reference=${reference}`);

      return {
        status: 202,
        jsonBody: {
          status: "accepted",
          operationId,
          reference
        }
      };
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`ACS relay send failed: ${code}; reference=${reference}`);

      return serverError(code, reference);
    }
  }
});

app.http("send-internal-author-draft-review-notification", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-internal-author-draft-review-notification",
  handler: async (request, context) => {
    let body = {};

    if (!verifyRelayKey(request)) {
      context.warn("ACS relay rejected Milestone 5 internal notification with invalid auth.");
      return milestoneUnauthorized(body);
    }

    try {
      body = await request.json();
    } catch (_error) {
      context.warn("ACS relay rejected malformed internal notification JSON.");
      return milestoneValidationError("INVALID_JSON", body);
    }

    const validation = validateInternalNotificationPayload(body || {});
    if (!validation.ok) {
      context.warn(`ACS relay internal notification validation failed: ${validation.reason}; reference=${normalizeText(body?.intakeReferenceCode)}`);
      return milestoneValidationError(validation.reason, body);
    }

    try {
      const providerMessageId = await sendAcsMessage(buildInternalNotificationEmail(validation.value));
      context.info(`ACS relay accepted internal notification; reference=${validation.value.intakeReferenceCode}`);

      return {
        status: 202,
        jsonBody: {
          accepted: true,
          messageType: INTERNAL_NOTIFICATION_TYPE,
          deliveryStatus: INTERNAL_NOTIFICATION_SENT,
          recipient: INTERNAL_VISIBILITY_MAILBOX,
          intakeReferenceCode: validation.value.intakeReferenceCode,
          diagnosticId: validation.value.diagnosticId,
          provider: ACS_PROVIDER_NAME,
          providerMessageId
        }
      };
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`ACS relay internal notification send failed: ${code}; reference=${validation.value.intakeReferenceCode}`);
      return milestoneServerError(code, validation.value);
    }
  }
});

app.http("send-join-internal-notification", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-join-internal-notification",
  handler: async (request, context) => {
    let body = {};

    if (!verifyRelayKey(request)) {
      context.warn("ACS relay rejected /join internal notification with invalid auth.");
      return milestoneUnauthorized(body);
    }

    try {
      body = await request.json();
    } catch (_error) {
      context.warn("ACS relay rejected malformed /join internal notification JSON.");
      return milestoneValidationError("INVALID_JSON", body);
    }

    const validation = validateJoinInternalNotificationPayload(body || {});
    if (!validation.ok) {
      context.warn(`ACS relay /join internal notification validation failed: ${validation.reason}; reference=${normalizeText(body?.reference || body?.intakeReferenceCode)}`);
      return milestoneValidationError(validation.reason, {
        intakeReferenceCode: validation.reference || body?.reference || body?.intakeReferenceCode
      });
    }

    try {
      const providerMessageId = await sendAcsMessage(buildJoinInternalNotificationEmail(validation.value));
      context.info(`ACS relay accepted /join internal notification; reference=${validation.value.reference}`);

      return {
        status: 202,
        jsonBody: {
          accepted: true,
          messageType: JOIN_INTERNAL_NOTIFICATION_TYPE,
          deliveryStatus: JOIN_INTERNAL_NOTIFICATION_SENT,
          recipient: INTERNAL_VISIBILITY_MAILBOX,
          intakeReferenceCode: validation.value.reference,
          provider: ACS_PROVIDER_NAME,
          providerMessageId
        }
      };
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`ACS relay /join internal notification send failed: ${code}; reference=${validation.value.reference}`);
      return milestoneServerError(code, {
        intakeReferenceCode: validation.value.reference
      });
    }
  }
});

app.http("send-approved-author-response", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-approved-author-response",
  handler: async (request, context) => {
    let body = {};

    if (!verifyRelayKey(request)) {
      context.warn("ACS relay rejected approved author response with invalid auth.");
      return milestoneUnauthorized(body);
    }

    try {
      body = await request.json();
    } catch (_error) {
      context.warn("ACS relay rejected malformed author response JSON.");
      return milestoneValidationError("INVALID_JSON", body);
    }

    const validation = validateApprovedAuthorResponsePayload(body || {});
    if (!validation.ok) {
      context.warn(`ACS relay author response validation failed: ${validation.reason}; reference=${normalizeText(body?.intakeReferenceCode)}`);
      return milestoneValidationError(validation.reason, body);
    }

    try {
      const providerMessageId = await sendAcsMessage(buildApprovedAuthorResponseEmail(validation.value));
      context.info(`ACS relay accepted approved author response; reference=${validation.value.intakeReferenceCode}`);

      return {
        status: 202,
        jsonBody: {
          accepted: true,
          messageType: APPROVED_AUTHOR_RESPONSE_TYPE,
          deliveryStatus: AUTHOR_RESPONSE_SENT,
          recipient: validation.value.authorEmail,
          internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
          intakeReferenceCode: validation.value.intakeReferenceCode,
          diagnosticId: validation.value.diagnosticId,
          provider: ACS_PROVIDER_NAME,
          providerMessageId
        }
      };
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`ACS relay approved author response send failed: ${code}; reference=${validation.value.intakeReferenceCode}`);
      return milestoneServerError(code, validation.value);
    }
  }
});
