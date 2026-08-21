const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");

const ALLOWED_INTAKE_CHANNEL = "INT-PUB-005 /join";
const DEFAULT_PROJECT_TITLE = "your book";
const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FIELD_LENGTH = 300;
const MAX_BODY_LENGTH = 6000;
const MAX_HTML_BODY_LENGTH = 50000;
const ACS_PROVIDER_NAME = "acs-email";
const ACS_SENDER = "publishing@email.jmerrill.one";
// Canonical Publishing ACS sender for author-facing and Publishing-owned relay
// messages. Reply capture remains the governed Publishing mailbox below.
const AUTHOR_RESPONSE_SENDER = "publishing@email.jmerrill.one";
const INTERNAL_VISIBILITY_MAILBOX = "publishing@jmerrill.one";
const INTERNAL_NOTIFICATION_TYPE = "AUTHOR_DRAFT_READY_FOR_REVIEW";
const JOIN_INTERNAL_NOTIFICATION_TYPE = "JOIN_INTAKE_RECEIVED";
const APPROVED_AUTHOR_RESPONSE_TYPE = "APPROVED_AUTHOR_RESPONSE";
const AUTHOR_REVIEW_PACKAGE_TEMPLATE = "AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1";
const FINAL_DEVELOPMENTAL_REVIEW_TEMPLATE = "AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_V1";
const PACKAGE_ACCEPTANCE_TEMPLATE = "PACKAGE_ACCEPTANCE_PAYMENT_OPTIONS_V1";
const CANONICAL_AUTHOR_RENDERER = "JM1 Enterprise Communication Renderer";
const CANONICAL_AUTHOR_RENDER_MODE = "CANONICAL_HTML";
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

function normalizeHtmlBody(value) {
  return safeTrim(value).slice(0, MAX_HTML_BODY_LENGTH);
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

function uniqueRecipients(value) {
  return Array.from(new Set(normalizeRecipients(value)));
}

function normalizeAuthorFacingCc(to, cc) {
  const toRecipients = uniqueRecipients(to);
  const ccRecipients = uniqueRecipients(cc).filter((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX);
  return toRecipients.includes(INTERNAL_VISIBILITY_MAILBOX)
    ? ccRecipients
    : [...ccRecipients, INTERNAL_VISIBILITY_MAILBOX];
}

function validateAuthorFacingCopy({ to, cc, bcc }) {
  const toRecipients = uniqueRecipients(to);
  const ccRecipients = uniqueRecipients(cc);
  const bccRecipients = uniqueRecipients(bcc);
  const nonCanonicalCc = ccRecipients.filter((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX);

  if (nonCanonicalCc.length > 0) return { ok: false, reason: "UNAPPROVED_CC_RECIPIENT_PRESENT" };
  if (!toRecipients.includes(INTERNAL_VISIBILITY_MAILBOX) && !ccRecipients.includes(INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: "PUBLISHING_CC_MISSING" };
  }
  if (ccRecipients.filter((recipient) => recipient === INTERNAL_VISIBILITY_MAILBOX).length > 1) {
    return { ok: false, reason: "DUPLICATE_PUBLISHING_CC" };
  }
  if (bccRecipients.some((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX)) {
    return { ok: false, reason: "UNAPPROVED_BCC_RECIPIENT_PRESENT" };
  }
  return { ok: true };
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
  const cc = normalizeAuthorFacingCc([to], payload.cc);
  const copyValidation = validateAuthorFacingCopy({ to: [to], cc, bcc: payload.bcc });
  const firstName = normalizeText(payload.firstName);
  const projectTitle = normalizeText(payload.projectTitle) || DEFAULT_PROJECT_TITLE;
  const intakeChannel = safeTrim(payload.intakeChannel);
  const manuscriptUrl = normalizeBody(payload.manuscriptUrl);
  const manuscriptChoice = normalizeText(payload.manuscriptChoice);
  const manuscriptLifecycleState = normalizeText(payload.manuscriptLifecycleState);
  const continuationUrl = normalizeBody(payload.continuationUrl);
  const nextStep = normalizeBody(payload.nextStep);

  if (!reference || !REFERENCE_PATTERN.test(reference)) {
    return { ok: false, code: "INVALID_REFERENCE", reference };
  }

  if (!to || !isValidEmail(to)) {
    return { ok: false, code: "INVALID_TO", reference };
  }

  if (!copyValidation.ok) {
    return { ok: false, code: copyValidation.reason, reference };
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
      cc,
      firstName,
      projectTitle,
      intakeChannel,
      hasManuscriptLink: Boolean(manuscriptUrl),
      manuscriptChoice,
      manuscriptLifecycleState,
      continuationUrl,
      nextStep
    }
  };
}

function escapeHtml(value) {
  return safeTrim(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHttpsUrl(value) {
  return /^https:\/\/[^\s]+$/i.test(safeTrim(value));
}

function buildAcknowledgmentCopy(payload) {
  if (payload.manuscriptLifecycleState === "NORMALIZATION_PENDING") {
    return {
      statusHeading: "We received your inquiry and manuscript file.",
      statusText: "Your manuscript is being prepared for Editorial Review. We will let you know if we need anything else before review can continue.",
      actionHeading: "What we need from you",
      actionText: "No action is needed from you right now."
    };
  }

  if (payload.hasManuscriptLink) {
    return {
      statusHeading: "We received your inquiry and manuscript link.",
      statusText: "Your manuscript is connected to your inquiry. Our team will prepare it for the right Editorial Review step and follow up with the next clear action.",
      actionHeading: "What we need from you",
      actionText: "No action is needed from you right now unless we contact you for an updated file or access correction."
    };
  }

  const hasContinuation = isHttpsUrl(payload.continuationUrl);
  return {
    statusHeading: "We received your inquiry.",
    statusText: "We do not yet have a manuscript file or shareable manuscript link connected to this inquiry.",
    actionHeading: "What we need from you",
    actionText: hasContinuation
      ? "When your manuscript is ready, use the secure continuation link below to add it. Editorial Review cannot begin until the manuscript is connected."
      : "When your manuscript is ready, reply to this message with the file attached or with a shareable manuscript link. Editorial Review cannot begin until the manuscript is connected.",
    ctaLabel: hasContinuation ? "Add Your Manuscript" : "",
    ctaUrl: hasContinuation ? payload.continuationUrl : ""
  };
}

function validatePublishingAcknowledgmentEmail(email, payload) {
  const text = email.content?.plainText || "";
  const html = email.content?.html || "";
  const subject = email.content?.subject || "";
  const projectTitle = payload.projectTitle || DEFAULT_PROJECT_TITLE;

  if (email.senderAddress !== ACS_SENDER) return { ok: false, reason: "FROM_NOT_CANONICAL" };
  if (!Array.isArray(email.replyTo) || email.replyTo[0]?.address !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "REPLY_TO_NOT_CANONICAL" };
  }
  if (subject.includes(payload.reference) || REFERENCE_PATTERN.test(subject) || DIAGNOSTIC_ID_PATTERN.test(subject)) {
    return { ok: false, reason: "SUBJECT_EXPOSES_INTERNAL_REFERENCE" };
  }
  if (!subject.includes(projectTitle) || !/^We Received Your Publishing Inquiry for /i.test(subject)) {
    return { ok: false, reason: "SUBJECT_NOT_HUMAN_FIRST" };
  }
  if (!html || !/^<!doctype html>/i.test(html) || !html.includes("J MERRILL PUBLISHING")) {
    return { ok: false, reason: "CANONICAL_HTML_MISSING" };
  }
  if (!text.includes(payload.reference) || !html.includes(escapeHtml(payload.reference))) {
    return { ok: false, reason: "BODY_REFERENCE_MISSING" };
  }
  if (/Author Workspace|author\/portal/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "PROSPECT_STAGE_WORKSPACE_LINK_BLOCKED" };
  }
  if (/\b(Dataverse|execution log|workflow record|internal instruction|package manifest|evidence file)\b/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "INTERNAL_LANGUAGE_BLOCKED" };
  }
  return { ok: true };
}

function buildAcknowledgmentEmail(payload) {
  const senderAddress = safeTrim(process.env.ACS_EMAIL_SENDER);

  if (!senderAddress || senderAddress !== ACS_SENDER) {
    throw Object.assign(new Error("ACS sender is missing."), {
      safeCode: senderAddress ? "ACS_SENDER_INVALID" : "ACS_SENDER_MISSING"
    });
  }

  const projectTitle = payload.projectTitle || DEFAULT_PROJECT_TITLE;
  const subject = `We Received Your Publishing Inquiry for ${projectTitle}`;
  const copy = buildAcknowledgmentCopy(payload);
  const ctaText = copy.ctaLabel && copy.ctaUrl ? [`${copy.ctaLabel}: ${copy.ctaUrl}`, ""] : [];
  const plainText = [
    `Good day ${payload.firstName},`,
    "",
    "Thank you for reaching out to J Merrill Publishing and trusting us with the first step of your publishing journey.",
    "",
    `Book / project: ${projectTitle}`,
    "",
    "Why you are receiving this:",
    "We received your publishing inquiry and are confirming the next step.",
    "",
    "Reference for your records:",
    "",
    payload.reference,
    "",
    "What has happened:",
    copy.statusText,
    "",
    `${copy.actionHeading}:`,
    copy.actionText,
    "",
    ...ctaText,
    ...(payload.nextStep ? ["Next step:", payload.nextStep, ""] : []),
    "What happens next:",
    "Our team will review the details you shared and follow up within 7-10 business days with the next right step.",
    "",
    "Your book is more than a project. It carries your story, your voice, and the people you hope to reach.",
    "",
    "Please keep this reference number for your records.",
    "",
    "With care,",
    "",
    "J Merrill Publishing",
    "Helping Authors Help Themselves",
    "https://jmerrill.pub"
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f7f9;color:#1f2933;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d9dee7;">
            <tr>
              <td style="background:#162033;color:#ffffff;padding:24px 28px;">
                <div style="font-size:13px;letter-spacing:.08em;font-weight:700;">J MERRILL PUBLISHING</div>
                <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">A Division of J Merrill One</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Good day ${escapeHtml(payload.firstName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Thank you for reaching out to J Merrill Publishing and trusting us with the first step of your publishing journey.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;"><strong>Book / project:</strong> ${escapeHtml(projectTitle)}</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#162033;">Why you are receiving this</h2>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">We received your publishing inquiry and are confirming the next step.</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#162033;">What has happened</h2>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;"><strong>${escapeHtml(copy.statusHeading)}</strong> ${escapeHtml(copy.statusText)}</p>
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#162033;">What we need from you</h2>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">${escapeHtml(copy.actionText)}</p>
                ${copy.ctaLabel && copy.ctaUrl ? `<p style="margin:24px 0;"><a href="${escapeHtml(copy.ctaUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:4px;padding:12px 18px;font-weight:700;">${escapeHtml(copy.ctaLabel)}</a></p>` : ""}
                <h2 style="font-size:18px;line-height:1.35;margin:24px 0 8px;color:#162033;">What happens next</h2>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Our team will review the details you shared and follow up within 7-10 business days with the next right step.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Please keep this reference number for your records: <strong>${escapeHtml(payload.reference)}</strong></p>
                <p style="margin:24px 0 0;font-size:16px;line-height:1.55;">With care,<br>J Merrill Publishing<br><span style="color:#4b5563;">Helping Authors Help Themselves</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const email = {
    senderAddress,
    content: {
      subject,
      plainText,
      html
    },
    replyTo: [
      {
        address: INTERNAL_VISIBILITY_MAILBOX,
        displayName: "J Merrill Publishing"
      }
    ],
    recipients: {
      to: [
        {
          address: payload.to,
          displayName: payload.firstName
        }
      ],
      cc: payload.cc.map((address) => ({
        address,
        displayName: "J Merrill Publishing"
      }))
    }
  };

  const validation = validatePublishingAcknowledgmentEmail(email, payload);
  if (!validation.ok) {
    throw Object.assign(new Error("Publishing acknowledgment failed canon validation."), {
      safeCode: validation.reason
    });
  }

  return email;
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
  const cc = normalizeAuthorFacingCc(to, payload.cc);
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

  if (internalVisibilityMailbox !== INTERNAL_VISIBILITY_MAILBOX) {
    return { ok: false, reason: "INTERNAL_VISIBILITY_REQUIRED" };
  }

  const copyValidation = validateAuthorFacingCopy({ to, cc, bcc });
  if (!copyValidation.ok) {
    return { ok: false, reason: copyValidation.reason };
  }

  if (allRecipients.some((recipient) => recipient !== INTERNAL_VISIBILITY_MAILBOX && isJmerrillPubMailbox(recipient))) {
    return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED" };
  }

  const subject = normalizeText(payload.subject);
  const body = normalizeBody(payload.body);
  const htmlBody = normalizeHtmlBody(payload.htmlBody);
  const attachments = normalizeAuthorReviewAttachments(payload.attachments);
  if (!subject) {
    return { ok: false, reason: "SUBJECT_MISSING" };
  }

  if (!body) {
    return { ok: false, reason: "BODY_MISSING" };
  }

  if (normalizeText(payload.templateName) === "EDITORIAL_RECOMMENDATION_LETTER_V1" && !htmlBody) {
    return { ok: false, reason: "EDITORIAL_RECOMMENDATION_HTML_REQUIRED" };
  }

  if ([AUTHOR_REVIEW_PACKAGE_TEMPLATE, FINAL_DEVELOPMENTAL_REVIEW_TEMPLATE].includes(normalizeText(payload.templateName))) {
    if (!htmlBody) {
      return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_HTML_REQUIRED" };
    }
    const renderValidation = validateCanonicalAuthorReviewHtmlPayload({
      htmlBody,
      body,
      templateMetadata: payload.templateMetadata,
      templateName: payload.templateName
    });
    if (!renderValidation.ok) {
      return { ok: false, reason: renderValidation.reason };
    }
    if (!attachments.ok) {
      return { ok: false, reason: attachments.reason };
    }
  }

  if (normalizeText(payload.templateName) === PACKAGE_ACCEPTANCE_TEMPLATE) {
    if (!htmlBody) {
      return { ok: false, reason: "PACKAGE_ACCEPTANCE_HTML_REQUIRED" };
    }
    const renderValidation = validateCanonicalPackageAcceptancePayload({
      htmlBody,
      body,
      subject,
      templateMetadata: payload.templateMetadata,
      templateName: payload.templateName,
      projectTitle: payload.projectTitle,
      intakeReferenceCode: common.intakeReferenceCode
    });
    if (!renderValidation.ok) {
      return { ok: false, reason: renderValidation.reason };
    }
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
      htmlBody: htmlBody || null,
      templateName: normalizeText(payload.templateName),
      templateVersion: normalizeText(payload.templateVersion),
      templateMetadata: payload.templateMetadata && typeof payload.templateMetadata === "object" ? {
        htmlSha256: normalizeText(payload.templateMetadata.htmlSha256),
        textSha256: normalizeText(payload.templateMetadata.textSha256),
        qualityGate: normalizeText(payload.templateMetadata.qualityGate),
        brandSystem: normalizeText(payload.templateMetadata.brandSystem),
        enterpriseStandard: normalizeText(payload.templateMetadata.enterpriseStandard),
        renderer: normalizeText(payload.templateMetadata.renderer),
        rendererVersion: normalizeText(payload.templateMetadata.rendererVersion),
        renderMode: normalizeText(payload.templateMetadata.renderMode),
        renderTemplateGuard: normalizeText(payload.templateMetadata.renderTemplateGuard)
      } : null,
      attachments: attachments.ok ? attachments.value : [],
      approvedBy: normalizeText(payload.approvedBy),
      approvedOn: normalizeText(payload.approvedOn),
      internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
      cc
    }
  };
}

function validateCanonicalPackageAcceptancePayload(payload = {}) {
  const html = normalizeHtmlBody(payload.htmlBody);
  const text = normalizeBody(payload.body);
  const subject = normalizeText(payload.subject);
  const projectTitle = normalizeText(payload.projectTitle);
  const intakeReferenceCode = normalizeText(payload.intakeReferenceCode);
  const metadata = payload.templateMetadata && typeof payload.templateMetadata === "object" ? payload.templateMetadata : null;

  if (!metadata) return { ok: false, reason: "PACKAGE_ACCEPTANCE_TEMPLATE_METADATA_REQUIRED" };
  if (normalizeText(metadata.qualityGate) !== "PASS") return { ok: false, reason: "PACKAGE_ACCEPTANCE_QUALITY_GATE_REQUIRED" };
  if (normalizeText(metadata.renderMode) !== CANONICAL_AUTHOR_RENDER_MODE) return { ok: false, reason: "PACKAGE_ACCEPTANCE_CANONICAL_RENDER_MODE_REQUIRED" };
  if (normalizeText(metadata.renderTemplateGuard) !== "PASS") return { ok: false, reason: "PACKAGE_ACCEPTANCE_RENDER_TEMPLATE_GUARD_REQUIRED" };
  if (normalizeText(metadata.renderer) !== CANONICAL_AUTHOR_RENDERER) return { ok: false, reason: "PACKAGE_ACCEPTANCE_CANONICAL_RENDERER_REQUIRED" };
  for (const [field, value] of [["htmlSha256", metadata.htmlSha256], ["textSha256", metadata.textSha256]]) {
    if (!/^[0-9a-f]{64}$/i.test(normalizeText(value))) return { ok: false, reason: `PACKAGE_ACCEPTANCE_${field.toUpperCase()}_INVALID` };
  }
  if (!projectTitle || !subject.includes(projectTitle)) return { ok: false, reason: "PACKAGE_ACCEPTANCE_SUBJECT_TITLE_REQUIRED" };
  if (subject.includes(intakeReferenceCode) || REFERENCE_PATTERN.test(subject) || DIAGNOSTIC_ID_PATTERN.test(subject)) {
    return { ok: false, reason: "PACKAGE_ACCEPTANCE_SUBJECT_INTERNAL_REFERENCE_BLOCKED" };
  }
  for (const fragment of [
    "<!doctype html>",
    "<table",
    "J MERRILL PUBLISHING",
    "A Division of J Merrill One",
    "Helping Authors Help Themselves.",
    "Why you are receiving this",
    "What JMP has prepared",
    "What we need from you",
    "Payment Options",
    "What happens next",
    "Support",
    "Choose Your Payment Option",
    "The Publishing Team"
  ]) {
    if (!html.toLowerCase().includes(fragment.toLowerCase())) return { ok: false, reason: "PACKAGE_ACCEPTANCE_CANONICAL_STRUCTURE_REQUIRED" };
  }
  for (const fragment of ["Why you are receiving this", "What JMP has prepared", "What we need from you", "Payment Options", "What happens next", "Support"]) {
    if (!text.includes(fragment)) return { ok: false, reason: "PACKAGE_ACCEPTANCE_TEXT_STRUCTURE_REQUIRED" };
  }
  if (!text.includes(intakeReferenceCode) || !html.includes(intakeReferenceCode)) return { ok: false, reason: "PACKAGE_ACCEPTANCE_BODY_REFERENCE_REQUIRED" };
  if (!/<a\b[^>]+href="https:\/\/[^"]+"[^>]+style="[^"]*(display:inline-block|background:)/i.test(html)) {
    return { ok: false, reason: "PACKAGE_ACCEPTANCE_CTA_BUTTON_REQUIRED" };
  }
  if (/\b(Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file|PACKAGE_ACCEPTED|OFFER_PREVIEW|pricing rule version|opportunity ID)\b/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "PACKAGE_ACCEPTANCE_INTERNAL_LANGUAGE_BLOCKED" };
  }
  if (/\bJOINED_THE_FAMILY|fully enrolled|production has started|welcome to the family\b/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "PACKAGE_ACCEPTANCE_PREMATURE_JOINED_FAMILY_BLOCKED" };
  }
  if (/\btax\s+(is|will be)\s+\$?\d/i.test(`${html}\n${text}`)) return { ok: false, reason: "PACKAGE_ACCEPTANCE_TAX_GUESS_BLOCKED" };

  return { ok: true };
}

function validateCanonicalAuthorReviewHtmlPayload(payload = {}) {
  const html = normalizeHtmlBody(payload.htmlBody);
  const text = normalizeBody(payload.body);
  const templateName = normalizeText(payload.templateName);
  const replyOnly = templateName === FINAL_DEVELOPMENTAL_REVIEW_TEMPLATE;
  const metadata = payload.templateMetadata && typeof payload.templateMetadata === "object" ? payload.templateMetadata : null;

  if (!metadata) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_TEMPLATE_METADATA_REQUIRED" };
  }

  if (normalizeText(metadata.qualityGate) !== "PASS") {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_QUALITY_GATE_REQUIRED" };
  }

  if (normalizeText(metadata.renderMode) !== CANONICAL_AUTHOR_RENDER_MODE) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_CANONICAL_RENDER_MODE_REQUIRED" };
  }

  if (normalizeText(metadata.renderTemplateGuard) !== "PASS") {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_RENDER_TEMPLATE_GUARD_REQUIRED" };
  }

  if (normalizeText(metadata.renderer) !== CANONICAL_AUTHOR_RENDERER) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_CANONICAL_RENDERER_REQUIRED" };
  }

  for (const [field, value] of [
    ["htmlSha256", metadata.htmlSha256],
    ["textSha256", metadata.textSha256]
  ]) {
    if (!/^[0-9a-f]{64}$/i.test(normalizeText(value))) {
      return { ok: false, reason: `AUTHOR_REVIEW_PACKAGE_${field.toUpperCase()}_INVALID` };
    }
  }

  const requiredHtmlFragments = [
    "<!doctype html>",
    "<table",
    "J MERRILL PUBLISHING",
    "A Division of J Merrill One",
    "Helping Authors Help Themselves.",
    "Why you are receiving this",
    "What has been completed",
    "How to respond",
    "What happens next",
    "Support",
    "The Publishing Team"
  ];

  for (const fragment of requiredHtmlFragments) {
    if (!html.toLowerCase().includes(fragment.toLowerCase())) {
      return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_CANONICAL_STRUCTURE_REQUIRED" };
    }
  }

  if (!html.includes("What's attached") && !html.includes("What&#39;s attached")) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_CANONICAL_STRUCTURE_REQUIRED" };
  }

  if (!html.includes("What we need from you")) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_REVIEW_PROMPT_REQUIRED" };
  }

  if (!replyOnly && !/<a\b[^>]+href="https:\/\/[^"]+"[^>]+style="[^"]*(display:inline-block|background:)/i.test(html)) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_CTA_BUTTON_REQUIRED" };
  }

  if (!replyOnly && !text.includes("Optional Author Operating Center access: https://")) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_TEXT_PORTAL_REFERENCE_REQUIRED" };
  }

  if (replyOnly && /author\/portal|Author Operating Center|<a\b[^>]+href=/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "AUTHOR_FINAL_DEVELOPMENTAL_REVIEW_REPLY_ONLY_REQUIRED" };
  }

  if (/\b(Dataverse|execution log|workflow record|internal instruction|package manifest|response mechanism|evidence file)\b/i.test(`${html}\n${text}`)) {
    return { ok: false, reason: "AUTHOR_REVIEW_PACKAGE_INTERNAL_LANGUAGE_BLOCKED" };
  }

  return { ok: true };
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
      plainText: payload.body,
      ...(payload.htmlBody ? { html: payload.htmlBody } : {})
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
      cc: payload.cc.map((address) => ({
        address,
        displayName: "J Merrill Publishing"
      }))
    },
    attachments: Array.isArray(payload.attachments) ? payload.attachments.map((attachment) => ({
      name: attachment.name,
      contentType: attachment.contentType,
      contentInBase64: attachment.contentInBase64
    })) : []
  };
}

function normalizeAuthorReviewAttachments(value) {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENTS_INVALID" };
  if (value.length === 0) return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENTS_MISSING" };

  let totalBytes = 0;
  const normalized = [];
  for (const attachment of value) {
    if (!attachment || typeof attachment !== "object") return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENT_INVALID" };
    const name = normalizeText(attachment.name);
    const contentType = normalizeText(attachment.contentType);
    const contentInBase64 = safeTrim(attachment.contentInBase64);
    if (!name) return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENT_NAME_MISSING" };
    if (!contentType) return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENT_CONTENT_TYPE_MISSING" };
    if (!contentInBase64) return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENT_CONTENT_MISSING" };
    totalBytes += Buffer.byteLength(contentInBase64, "base64");
    normalized.push({ name, contentType, contentInBase64 });
  }

  if (totalBytes > 20 * 1024 * 1024) {
    return { ok: false, reason: "AUTHOR_REVIEW_ATTACHMENT_SIZE_LIMIT" };
  }

  return { ok: true, value: normalized };
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
