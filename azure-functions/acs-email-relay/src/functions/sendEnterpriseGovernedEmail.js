const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");
const {
  getSenderProfile,
  validateMessageIdentity,
  validateSignatureBlock
} = require("../policy/acsSenderRegistry");

const ACS_PROVIDER_NAME = "acs-email";
const MAX_FIELD_LENGTH = 300;
const MAX_BODY_LENGTH = 8000;
const MAX_HTML_BODY_LENGTH = 60000;
const HIGH_RISK_VALUES = new Set(["HIGH", "LEGAL", "FINANCIAL_ADVICE", "CONTRACT", "RIGHTS", "SENSITIVE"]);
const FOUNDATION_PROMOTIONAL_TYPES = new Set(["FUNDRAISING", "PROMOTIONAL", "NEWSLETTER", "DONOR_MARKETING"]);

let emailClient;

function getEmailClient() {
  if (emailClient) return emailClient;
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

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeBody(value) {
  return safeTrim(value).slice(0, MAX_BODY_LENGTH);
}

function normalizeHtml(value) {
  return safeTrim(value).slice(0, MAX_HTML_BODY_LENGTH);
}

function normalizeEnum(value) {
  return normalizeText(value).toUpperCase().replace(/[\s-]+/g, "_");
}

function isValidEmail(value) {
  return Boolean(value && value.length <= 254 && !/[\r\n]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function normalizeRecipients(value) {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .map((item) => {
      if (typeof item === "string") return { address: normalizeEmail(item), displayName: "" };
      if (item && typeof item === "object") {
        return {
          address: normalizeEmail(item.address || item.email),
          displayName: normalizeText(item.displayName || item.name)
        };
      }
      return { address: "", displayName: "" };
    })
    .filter((recipient) => recipient.address);
}

function containsInternalLanguage(value) {
  return /\b(artifactId|canonical|runtime|correlation|manifest|workstream|execution state|package-grade|governed source|system attention|lifecycle event|technical validation|queue|GUID|checksum|worker|Dataverse row|state machine token)\b/i.test(value || "")
    || /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(value || "")
    || /\b[a-f0-9]{64}\b/i.test(value || "");
}

function response(status, body) {
  return { status, jsonBody: body };
}

function validationError(reason, payload = {}) {
  return response(400, {
    accepted: false,
    code: "ACS_RELAY_VALIDATION_FAILED",
    reason,
    brand: normalizeEnum(payload.brand),
    sourceRecord: normalizeText(payload.sourceRecord || payload.correlationId)
  });
}

function humanReview(reason, payload = {}) {
  return response(409, {
    accepted: false,
    code: "HUMAN_REVIEW_REQUIRED",
    reason,
    brand: normalizeEnum(payload.brand),
    sourceRecord: normalizeText(payload.sourceRecord || payload.correlationId)
  });
}

function unauthorized(payload = {}) {
  return response(401, {
    accepted: false,
    code: "UNAUTHORIZED",
    reason: "UNAUTHORIZED",
    sourceRecord: normalizeText(payload.sourceRecord || payload.correlationId)
  });
}

function serverError(code, payload = {}) {
  return response(502, {
    accepted: false,
    code,
    reason: code,
    brand: normalizeEnum(payload.brand),
    sourceRecord: normalizeText(payload.sourceRecord || payload.correlationId)
  });
}

function verifyRelayKey(request) {
  const expected = process.env.JM1_RELAY_API_KEY;
  const actual = request.headers.get("x-jm1-relay-key") || request.headers.get("X-JM1-Relay-Key");
  return Boolean(expected && actual && actual === expected);
}

function validateEnterprisePayload(payload = {}) {
  const brand = normalizeEnum(payload.brand);
  const profileResult = getSenderProfile(brand);
  if (!profileResult.ok) return { ok: false, reason: profileResult.reason };
  const profile = profileResult.profile;

  const senderAddress = normalizeEmail(payload.senderAddress || payload.from || profile.acsFrom);
  const replyTo = normalizeEmail(payload.replyTo || profile.replyTo);
  const cc = normalizeRecipients(payload.cc);
  const to = normalizeRecipients(payload.to || payload.recipients?.to);
  const subject = normalizeText(payload.subject);
  const plainText = normalizeBody(payload.plainText || payload.text || payload.bodyText);
  const html = normalizeHtml(payload.html || payload.htmlBody);
  const messageType = normalizeEnum(payload.messageType || payload.communicationType || "ROUTINE");
  const riskClassification = normalizeEnum(payload.riskClassification || payload.risk || "ROUTINE");
  const sourceRecord = normalizeText(payload.sourceRecord || payload.correlationId || payload.eventId);

  if (to.length === 0 || to.some((recipient) => !isValidEmail(recipient.address))) return { ok: false, reason: "ACS_RECIPIENT_INVALID" };
  if (!subject) return { ok: false, reason: "ACS_SUBJECT_REQUIRED" };
  if (!plainText) return { ok: false, reason: "ACS_PLAIN_TEXT_REQUIRED" };
  if (!html || !/^<!doctype html>/i.test(html)) return { ok: false, reason: "ACS_HTML_REQUIRED" };
  if (containsInternalLanguage(`${subject}\n${plainText}\n${html}`)) return { ok: false, reason: "HUMAN_FIRST_INTERNAL_LANGUAGE_BLOCKED" };
  if (senderAddress.includes("noreply") || replyTo.includes("noreply")) return { ok: false, reason: "ACS_NOREPLY_BLOCKED" };

  const identity = validateMessageIdentity({
    brand,
    from: senderAddress,
    replyTo,
    cc: cc.map((recipient) => recipient.address)
  });
  if (!identity.ok) return { ok: false, reason: identity.reason };

  const plainTextSignature = validateSignatureBlock({ brand, text: plainText });
  if (!plainTextSignature.ok) return { ok: false, reason: plainTextSignature.reason };
  const htmlSignature = validateSignatureBlock({ brand, text: html });
  if (!htmlSignature.ok) return { ok: false, reason: htmlSignature.reason };

  if (HIGH_RISK_VALUES.has(riskClassification)) return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_HIGH_RISK" };
  if (profile.riskPolicy === "AIC" && payload.planningCenterAsSenderAuthority === true) {
    return { ok: false, reason: "ACS_PLANNING_CENTER_AUTHORITY_MISMATCH" };
  }
  if (profile.riskPolicy === "AIC" && payload.relationshipContextValid === false) {
    return { ok: false, reason: "ACS_RELATIONSHIP_CONTEXT_MISMATCH" };
  }
  if (profile.riskPolicy === "AIC" && /counseling|pastoral care|confidential|legal|attorney|financial hardship|crisis/i.test(`${subject}\n${plainText}\n${html}`)) {
    return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_AIC_SENSITIVE_CONTEXT" };
  }
  if (profile.riskPolicy === "FINANCIAL" && /legal|attorney|guarantee|guaranteed|ensures|avoid probate|legally sound/i.test(`${subject}\n${plainText}\n${html}`)) {
    return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_FINANCIAL_COMPLIANCE" };
  }
  if (profile.riskPolicy === "PRODUCTIONS" && /rights|license|contract|talent release|usage rights/i.test(`${subject}\n${plainText}\n${html}`)) {
    return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_RIGHTS_CONTRACT" };
  }
  if (profile.riskPolicy === "PERSONAL_BRAND" && /publishing agreement|royalty|financial advice|legal advice|contract terms|rights transfer|tax advice/i.test(`${subject}\n${plainText}\n${html}`)) {
    return { ok: false, reason: "HUMAN_REVIEW_REQUIRED_JSJ_PERSONAL_BRAND_BOUNDARY" };
  }
  if (profile.riskPolicy === "FOUNDATION" && FOUNDATION_PROMOTIONAL_TYPES.has(messageType) && payload.marketingConsent !== true) {
    return { ok: false, reason: "FOUNDATION_MARKETING_CONSENT_REQUIRED" };
  }

  return {
    ok: true,
    value: {
      brand,
      profile,
      senderAddress,
      replyTo,
      to,
      cc,
      subject,
      plainText,
      html,
      messageType,
      riskClassification,
      sourceRecord
    }
  };
}

function buildEnterpriseEmail(value) {
  return {
    senderAddress: value.senderAddress,
    content: {
      subject: value.subject,
      plainText: value.plainText,
      html: value.html
    },
    replyTo: [{ address: value.replyTo, displayName: value.profile.organizationDisplayName }],
    recipients: {
      to: value.to.map((recipient) => ({
        address: recipient.address,
        displayName: recipient.displayName || undefined
      })),
      cc: value.cc.map((recipient) => ({
        address: recipient.address,
        displayName: recipient.displayName || undefined
      }))
    }
  };
}

async function sendAcsMessage(message) {
  const poller = await getEmailClient().beginSend(message);
  if (!poller || typeof poller.getOperationState !== "function") return undefined;
  const state = poller.getOperationState();
  return state && (state.id || state.operationId);
}

function safeErrorCode(error) {
  if (error && error.safeCode) return error.safeCode;
  const statusCode = error && (error.statusCode || error.code);
  if (statusCode === 401 || statusCode === 403) return "ACS_AUTH_FAILED";
  if (statusCode === 429) return "ACS_RATE_LIMITED";
  if (statusCode && Number(statusCode) >= 400 && Number(statusCode) < 500) return "ACS_REQUEST_REJECTED";
  return "ACS_SEND_FAILED";
}

app.http("send-enterprise-governed-email", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "send-enterprise-governed-email",
  handler: async (request, context) => {
    let body = {};
    if (!verifyRelayKey(request)) return unauthorized(body);

    try {
      body = await request.json();
    } catch (_error) {
      return validationError("INVALID_JSON", body);
    }

    const validation = validateEnterprisePayload(body || {});
    if (!validation.ok) {
      if (String(validation.reason || "").startsWith("HUMAN_REVIEW_REQUIRED")) return humanReview(validation.reason, body);
      context.warn(`Enterprise ACS relay validation failed: ${validation.reason}; brand=${normalizeEnum(body?.brand)}`);
      return validationError(validation.reason, body);
    }

    try {
      const email = buildEnterpriseEmail(validation.value);
      const providerMessageId = await sendAcsMessage(email);
      context.info(`Enterprise ACS relay accepted send; brand=${validation.value.brand}; source=${validation.value.sourceRecord}`);
      return response(202, {
        accepted: true,
        messageType: validation.value.messageType,
        brand: validation.value.brand,
        senderAddress: validation.value.senderAddress,
        replyTo: validation.value.replyTo,
        replyMailboxAuthority: validation.value.profile.replyMailboxAuthority,
        provider: ACS_PROVIDER_NAME,
        providerMessageId,
        sourceRecord: validation.value.sourceRecord
      });
    } catch (error) {
      const code = safeErrorCode(error);
      context.error(`Enterprise ACS relay send failed: ${code}; brand=${validation.value.brand}; source=${validation.value.sourceRecord}`);
      return serverError(code, body);
    }
  }
});

module.exports = {
  buildEnterpriseEmail,
  validateEnterprisePayload
};
