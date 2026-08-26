const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");
const {
  assertPolicyAllows,
  resolveCommunicationAuthority
} = require("../policy/canonPolicyLayer");
const {
  resolveSenderProfile,
  validateMessageIdentity,
  validateSenderForBrand
} = require("../policy/acsSenderRegistry");

const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const DIAGNOSTIC_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FIELD_LENGTH = 300;
const MAX_BODY_LENGTH = 6000;
const ACS_PROVIDER_NAME = "acs-email";

const PUBLISHING_SENDER_PROFILE = resolveSenderProfile("JMP");
const AUTHOR_RESPONSE_SENDER = PUBLISHING_SENDER_PROFILE.acsFrom;
const INTERNAL_VISIBILITY_MAILBOX = PUBLISHING_SENDER_PROFILE.replyTo;
const SENDER_DISPLAY_NAME = PUBLISHING_SENDER_PROFILE.organizationDisplayName;
const AGREEMENT_PACKAGE_SEND_TYPE = "AGREEMENT_PACKAGE_SEND";
const AGREEMENT_PACKAGE_SENT = "AGREEMENT_PACKAGE_SENT";

// Dynamic governed agreement packets contain the Agreement + Package
// Addendum, with Audiobook Addendum and Schedule A added only when
// generated for the selected package/payment plan.
const MIN_ATTACHMENT_COUNT = 2;
const MAX_ATTACHMENT_COUNT = 4;
const REQUIRED_ATTACHMENT_BASENAMES = Object.freeze([
  "JMP_Publishing_Agreement_FILLED",
  "JMP_Publishing_Package_Addendum_FILLED"
]);
const OPTIONAL_ATTACHMENT_BASENAMES = Object.freeze([
  "JMP_Audiobook_Addendum_FILLED",
  "JMP_Schedule_A_Payment_Schedule"
]);
const ALLOWED_ATTACHMENT_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // ACS request-size limit, including attachments

const UNSAFE_FIELD_NAMES = new Set([
  "manuscript",
  "manuscriptText",
  "extractedManuscriptContent",
  "prompt",
  "promptBody",
  "rawModelOutput",
  "rawModelResponse",
  "editorialScore",
  "editorialScorecard",
  "internalScorecard",
  "opportunity",
  "opportunityPayload",
  "opportunityReady",
  "flowD",
  "flowDTrigger",
  "flowDReady",
  "paymentLink",
  "stripePaymentLink",
  "checkoutSessionUrl",
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
    emailClient = new EmailClient(process.env.ACS_ENDPOINT, new DefaultAzureCredential());
    return emailClient;
  }
  throw Object.assign(new Error("ACS configuration is missing."), { safeCode: "ACS_CONFIG_MISSING" });
}

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return safeTrim(value).slice(0, MAX_FIELD_LENGTH);
}

function normalizeRecipients(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeText(item).toLowerCase()).filter(Boolean);
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

function normalizeBody(value) {
  return safeTrim(value).slice(0, MAX_BODY_LENGTH);
}

function escapeHtml(value) {
  return safeTrim(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value) {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isJmerrillPubMailbox(value) {
  return normalizeText(value).toLowerCase().endsWith("@jmerrill.pub");
}

function hasUnsafeField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasUnsafeField(item));
  return Object.entries(value).some(([key, nestedValue]) => {
    if (UNSAFE_FIELD_NAMES.has(key)) return true;
    return hasUnsafeField(nestedValue);
  });
}

function verifyRelayKey(request) {
  const expected = process.env.JM1_RELAY_API_KEY;
  const actual = request.headers.get("x-jm1-relay-key");
  return Boolean(expected && actual && actual === expected);
}

function getAuthorResponseSenderAddress() {
  const senderAddress = safeTrim(process.env.ACS_AUTHOR_RESPONSE_EMAIL_SENDER);
  if (!senderAddress) {
    throw Object.assign(new Error("ACS author-response sender is missing."), { safeCode: "ACS_AUTHOR_RESPONSE_SENDER_MISSING" });
  }
  const identity = validateSenderForBrand({ brand: "JMP", from: senderAddress });
  if (!identity.ok || isJmerrillPubMailbox(senderAddress)) {
    throw Object.assign(new Error("ACS author-response sender is invalid."), { safeCode: identity.reason || "ACS_AUTHOR_RESPONSE_SENDER_INVALID" });
  }
  return senderAddress;
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

function validateAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length < MIN_ATTACHMENT_COUNT || attachments.length > MAX_ATTACHMENT_COUNT) {
    return { ok: false, reason: "ATTACHMENT_COUNT_INVALID" };
  }

  let totalBytes = 0;
  const seenBaseNames = new Set();
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object") return { ok: false, reason: "ATTACHMENT_SHAPE_INVALID" };
    const name = safeTrim(attachment.name);
    const contentType = safeTrim(attachment.contentType);
    const contentInBase64 = typeof attachment.contentInBase64 === "string" ? attachment.contentInBase64 : "";
    const baseName = [...REQUIRED_ATTACHMENT_BASENAMES, ...OPTIONAL_ATTACHMENT_BASENAMES].find((allowed) => name.startsWith(allowed));

    if (!name || !name.toLowerCase().endsWith(".docx")) return { ok: false, reason: "ATTACHMENT_NAME_INVALID" };
    if (!baseName) return { ok: false, reason: "ATTACHMENT_NAME_UNRECOGNIZED" };
    if (seenBaseNames.has(baseName)) return { ok: false, reason: "ATTACHMENT_DUPLICATE" };
    seenBaseNames.add(baseName);
    if (contentType !== ALLOWED_ATTACHMENT_CONTENT_TYPE) return { ok: false, reason: "ATTACHMENT_CONTENT_TYPE_INVALID" };
    if (!contentInBase64) return { ok: false, reason: "ATTACHMENT_CONTENT_MISSING" };

    totalBytes += Buffer.byteLength(contentInBase64, "base64");
  }

  for (const requiredBaseName of REQUIRED_ATTACHMENT_BASENAMES) {
    if (!seenBaseNames.has(requiredBaseName)) {
      return { ok: false, reason: "REQUIRED_ATTACHMENT_MISSING" };
    }
  }

  if (totalBytes > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: "ATTACHMENT_SIZE_LIMIT_EXCEEDED" };
  }

  return { ok: true };
}

function validateAgreementPackageSendPayload(payload = {}) {
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

  const to = normalizeText(payload.to).toLowerCase();
  const cc = normalizeAuthorFacingCc([to], payload.cc);
  const bcc = normalizeRecipients(payload.bcc);
  const replyTo = normalizeText(payload.replyTo).toLowerCase();

  if (!to || !isValidEmail(to)) return { ok: false, reason: "TO_INVALID" };
  if (isJmerrillPubMailbox(to)) return { ok: false, reason: "JMERRILL_PUB_MAILBOX_NOT_ALLOWED" };
  const copyValidation = validateAuthorFacingCopy({ to: [to], cc, bcc });
  if (!copyValidation.ok) return { ok: false, reason: copyValidation.reason };
  if (replyTo !== INTERNAL_VISIBILITY_MAILBOX) return { ok: false, reason: "REPLY_TO_MUST_BE_INTERNAL_VISIBILITY_MAILBOX" };

  const subject = normalizeText(payload.subject);
  const bodyText = normalizeBody(payload.bodyText);
  if (!subject) return { ok: false, reason: "SUBJECT_MISSING" };
  if (!bodyText) return { ok: false, reason: "BODY_MISSING" };

  const lowerBody = bodyText.toLowerCase();
  if (lowerBody.includes("stripe.com") || lowerBody.includes("checkout.stripe") || lowerBody.includes("payment link") || lowerBody.includes("pay now")) {
    return { ok: false, reason: "PAYMENT_LINK_LANGUAGE_NOT_ALLOWED" };
  }

  const attachmentValidation = validateAttachments(payload.attachments);
  if (!attachmentValidation.ok) {
    return { ok: false, reason: attachmentValidation.reason };
  }

  return {
    ok: true,
    value: {
      diagnosticId,
      intakeReferenceCode,
      to,
      cc,
      toDisplayName: normalizeText(payload.toDisplayName) || to,
      subject,
      bodyText,
      attachments: payload.attachments
    }
  };
}

function buildAgreementPackageSendEmail(value) {
  const htmlBody = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f7f9;color:#111827;font-family:Arial,Helvetica,sans-serif;">
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
              <td style="padding:28px;font-size:16px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(value.bodyText)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const email = {
    senderAddress: getAuthorResponseSenderAddress(),
    content: {
      subject: value.subject,
      plainText: value.bodyText,
      html: htmlBody
    },
    replyTo: [
      { address: INTERNAL_VISIBILITY_MAILBOX, displayName: SENDER_DISPLAY_NAME }
    ],
    recipients: {
      to: [
        { address: value.to, displayName: value.toDisplayName }
      ],
      cc: value.cc.map((address) => ({ address, displayName: SENDER_DISPLAY_NAME }))
    },
    attachments: value.attachments.map((a) => ({
      name: safeTrim(a.name),
      contentType: ALLOWED_ATTACHMENT_CONTENT_TYPE,
      contentInBase64: a.contentInBase64
    }))
  };
  const identity = validateMessageIdentity({
    brand: "JMP",
    from: email.senderAddress,
    replyTo: email.replyTo[0]?.address,
    cc: email.recipients.cc.map((recipient) => recipient.address)
  });
  if (!identity.ok) {
    throw Object.assign(new Error("Agreement package email failed ACS sender identity validation."), { safeCode: identity.reason });
  }
  const authority = resolveCommunicationAuthority({
    senderAddress: email.senderAddress,
    content: email.content,
    replyTo: email.replyTo,
    recipients: email.recipients,
    sourceRecord: value.intakeReferenceCode
  });
  assertPolicyAllows(authority);
  return email;
}

function safeErrorCode(error) {
  if (error && error.safeCode) return error.safeCode;
  const statusCode = error && (error.statusCode || error.code);
  if (statusCode === 401 || statusCode === 403) return "ACS_AUTH_FAILED";
  if (statusCode === 429) return "ACS_RATE_LIMITED";
  if (statusCode && Number(statusCode) >= 400 && Number(statusCode) < 500) return "ACS_REQUEST_REJECTED";
  return "ACS_SEND_FAILED";
}

function getOperationId(poller) {
  if (!poller || typeof poller.getOperationState !== "function") return undefined;
  const state = poller.getOperationState();
  return state && (state.id || state.operationId);
}

app.http("send-agreement-package", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-agreement-package",
  handler: async (request, context) => {
    let body = {};

    if (!verifyRelayKey(request)) {
      context.warn("ACS relay rejected agreement package send with invalid auth.");
      return milestoneUnauthorized(body);
    }

    try {
      body = await request.json();
    } catch {
      context.warn("ACS relay rejected malformed agreement package send JSON.");
      return milestoneValidationError("INVALID_JSON", body);
    }

    const validation = validateAgreementPackageSendPayload(body || {});
    if (!validation.ok) {
      context.warn(`ACS relay agreement package send validation failed: ${validation.reason}; reference=${normalizeText(body?.intakeReferenceCode)}`);
      return milestoneValidationError(validation.reason, body);
    }

    try {
      const message = buildAgreementPackageSendEmail(validation.value);
      const poller = await getEmailClient().beginSend(message);
      const providerMessageId = getOperationId(poller);

      context.info(`ACS relay accepted agreement package send; reference=${validation.value.intakeReferenceCode}; diagnosticId=${validation.value.diagnosticId}`);

      return {
        status: 202,
        jsonBody: {
          accepted: true,
          messageType: AGREEMENT_PACKAGE_SEND_TYPE,
          deliveryStatus: AGREEMENT_PACKAGE_SENT,
          recipient: validation.value.to,
          internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
          intakeReferenceCode: validation.value.intakeReferenceCode,
          diagnosticId: validation.value.diagnosticId,
          provider: ACS_PROVIDER_NAME,
          providerMessageId
        }
      };
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`ACS relay agreement package send failed: ${code}; reference=${validation.value.intakeReferenceCode}`);
      return milestoneServerError(code, validation.value);
    }
  }
});

module.exports = {};
