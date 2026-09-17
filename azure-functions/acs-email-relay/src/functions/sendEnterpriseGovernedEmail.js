const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");
const { authenticateCaller } = require("../security/callerAuthentication");
const { authorizeCallerForBrand, authorizeCallerForTemplate, normalizeBrand } = require("../policy/callerRegistry");
const { DELIVERY_STATE, getMessageLedger } = require("../state/messageLedger");
const { renderTemplate } = require("../templates/renderer");
const { isGovernedNamespace } = require("../templates/templateRegistry");
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

function unauthorized(payload = {}, reason = "UNAUTHORIZED", status = 401) {
  return response(status, {
    accepted: false,
    code: "UNAUTHORIZED",
    reason,
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

function validateEnterprisePayload(payload = {}) {
  const brand = normalizeBrand(payload.brand);
  const profileResult = getSenderProfile(brand);
  if (!profileResult.ok) return { ok: false, reason: profileResult.reason };
  const profile = profileResult.profile;

  const suppliedSender = normalizeEmail(payload.senderAddress || payload.from);
  const suppliedReplyTo = normalizeEmail(payload.replyTo);
  const suppliedCc = normalizeRecipients(payload.cc);
  if (suppliedSender && suppliedSender !== profile.acsFrom) return { ok: false, reason: "CALLER_FROM_OVERRIDE_DENIED" };
  if (suppliedReplyTo && suppliedReplyTo !== profile.replyTo) return { ok: false, reason: "CALLER_REPLY_TO_OVERRIDE_DENIED" };
  if (suppliedCc.some((recipient) => recipient.address !== profile.ccAddress)) {
    return { ok: false, reason: "CALLER_CC_OVERRIDE_DENIED" };
  }

  const senderAddress = profile.acsFrom;
  const replyTo = profile.replyTo;
  const cc = profile.ccRequired && profile.ccAddress
    ? [{ address: profile.ccAddress, displayName: profile.organizationDisplayName }]
    : [];
  const to = normalizeRecipients(payload.recipient || payload.to || payload.recipients?.to);
  let subject = normalizeText(payload.subject);
  let plainText = normalizeBody(payload.plainText || payload.text || payload.bodyText);
  let html = normalizeHtml(payload.html || payload.htmlBody);
  const messageType = normalizeEnum(payload.messageType || payload.communicationType || "ROUTINE");
  const riskClassification = normalizeEnum(payload.riskClassification || payload.risk || "ROUTINE");
  const sourceRecord = normalizeText(payload.sourceRecord || payload.correlationId || payload.eventId);
  const businessObjectType = normalizeEnum(payload.businessObjectType);
  const businessObjectId = normalizeText(payload.businessObjectId);
  const correlationId = normalizeText(payload.correlationId);
  const templateId = normalizeEnum(payload.templateId || payload.templateName);
  const templateVersion = normalizeText(payload.templateVersion);
  const idempotencyKey = normalizeText(payload.idempotencyKey);
  let renderMetadata = null;

  if (to.length === 0 || to.some((recipient) => !isValidEmail(recipient.address))) return { ok: false, reason: "ACS_RECIPIENT_INVALID" };
  if (!businessObjectType) return { ok: false, reason: "BUSINESS_OBJECT_TYPE_REQUIRED" };
  if (!businessObjectId) return { ok: false, reason: "BUSINESS_OBJECT_ID_REQUIRED" };
  if (!correlationId) return { ok: false, reason: "CORRELATION_ID_REQUIRED" };
  if (!templateId) return { ok: false, reason: "TEMPLATE_ID_REQUIRED" };
  if (!templateVersion) return { ok: false, reason: "TEMPLATE_VERSION_REQUIRED" };
  if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };

  if (isGovernedNamespace(templateId)) {
    if (subject || plainText || html) return { ok: false, reason: "CALLER_TEMPLATE_CONTENT_OVERRIDE_DENIED" };
    const rendered = renderTemplate({ templateId, templateVersion, data: payload.templateData });
    if (!rendered.ok) return { ok: false, reason: rendered.reason };
    if (brand !== "JMP" || rendered.value.metadata.brandId !== "PUBLISHING") {
      return { ok: false, reason: "TEMPLATE_BRAND_MISMATCH" };
    }
    subject = rendered.value.subject;
    plainText = rendered.value.plainText;
    html = rendered.value.html;
    renderMetadata = rendered.value.metadata;
  }

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
      sourceRecord,
      businessObjectType,
      businessObjectId,
      correlationId,
      templateId,
      templateVersion,
      idempotencyKey,
      renderMetadata
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
    const authentication = authenticateCaller(request);
    if (!authentication.ok) return unauthorized(body, authentication.reason, authentication.reason === "UNKNOWN_CALLER" ? 403 : 401);

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

    const authorization = authorizeCallerForBrand(authentication.caller, validation.value.brand);
    if (!authorization.ok) {
      context.warn(`Enterprise ACS relay caller authorization denied: ${authorization.reason}; caller=${authentication.caller.callerId}; brand=${validation.value.brand}`);
      return unauthorized(body, authorization.reason, 403);
    }
    const templateAuthorization = authorizeCallerForTemplate(authentication.caller, validation.value.templateId);
    if (!templateAuthorization.ok) {
      context.warn(`Enterprise ACS relay template authorization denied: ${templateAuthorization.reason}; caller=${authentication.caller.callerId}; template=${validation.value.templateId}`);
      return unauthorized(body, templateAuthorization.reason, 403);
    }

    let reservation;
    let providerAccepted = false;
    try {
      reservation = await getMessageLedger().reserve({
        callerId: authentication.caller.callerId,
        brand: validation.value.brand,
        businessObjectType: validation.value.businessObjectType,
        businessObjectId: validation.value.businessObjectId,
        correlationId: validation.value.correlationId,
        recipients: validation.value.to.map((recipient) => recipient.address),
        communicationPurpose: validation.value.messageType,
        templateId: validation.value.templateId,
        templateVersion: validation.value.templateVersion,
        rendererVersion: validation.value.renderMetadata?.rendererVersion,
        brandTokenVersion: validation.value.renderMetadata?.brandTokenVersion,
        htmlSha256: validation.value.renderMetadata?.htmlSha256,
        plainTextSha256: validation.value.renderMetadata?.plainTextSha256,
        idempotencyKey: validation.value.idempotencyKey,
        systemSender: validation.value.senderAddress,
        brandCc: validation.value.cc.map((recipient) => recipient.address),
        replyTo: validation.value.replyTo
      });

      if (reservation.kind === "REPLAY") {
        const prior = reservation.entity;
        if (prior.deliveryState === DELIVERY_STATE.FAILED) {
          return response(409, {
            accepted: false,
            replay: true,
            code: "PRIOR_SEND_FAILED_CLOSED",
            jm1MessageId: prior.jm1MessageId,
            deliveryState: prior.deliveryState,
            failureClass: prior.failureClass
          });
        }
        return response(prior.deliveryState === DELIVERY_STATE.ACCEPTED ? 200 : 202, {
          accepted: prior.deliveryState === DELIVERY_STATE.ACCEPTED,
          replay: true,
          inProgress: prior.deliveryState === DELIVERY_STATE.RESERVED,
          jm1MessageId: prior.jm1MessageId,
          providerMessageId: prior.providerMessageId || undefined,
          deliveryState: prior.deliveryState,
          acceptedAt: prior.acceptedAt || undefined
        });
      }

      const email = buildEnterpriseEmail(validation.value);
      const providerMessageId = await sendAcsMessage(email);
      providerAccepted = true;
      const trace = await getMessageLedger().recordAccepted(reservation.entity, providerMessageId);
      context.info(`Enterprise ACS relay accepted send; caller=${authentication.caller.callerId}; brand=${validation.value.brand}; jm1MessageId=${trace.jm1MessageId}`);
      return response(202, {
        accepted: true,
        replay: false,
        jm1MessageId: trace.jm1MessageId,
        messageType: validation.value.messageType,
        brand: validation.value.brand,
        senderAddress: validation.value.senderAddress,
        brandCc: validation.value.cc.map((recipient) => recipient.address),
        replyTo: validation.value.replyTo,
        replyMailboxAuthority: validation.value.profile.replyMailboxAuthority,
        callerId: authentication.caller.callerId,
        callerAuthModel: authentication.authModel,
        provider: ACS_PROVIDER_NAME,
        providerMessageId,
        deliveryState: DELIVERY_STATE.ACCEPTED,
        acceptedAt: trace.acceptedAt,
        sourceRecord: validation.value.sourceRecord,
        renderMetadata: validation.value.renderMetadata || undefined
      });
    } catch (error) {
      const code = safeErrorCode(error);
      if (["RESERVED", "RETRY_RESERVED"].includes(reservation?.kind) && !providerAccepted) {
        try {
          await getMessageLedger().recordFailure(reservation.entity, code);
        } catch (ledgerError) {
          context.error(`Enterprise ACS relay trace failure: ${safeErrorCode(ledgerError)}; jm1MessageId=${reservation.entity.jm1MessageId}`);
        }
      }
      context.error(`Enterprise ACS relay send failed: ${code}; caller=${authentication.caller.callerId}; brand=${validation.value.brand}`);
      return serverError(code, body);
    }
  }
});

app.http("relay-authority-probe", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "relay-authority-probe",
  handler: async (request) => {
    const authentication = authenticateCaller(request);
    if (!authentication.ok) return unauthorized({}, authentication.reason, authentication.reason === "UNKNOWN_CALLER" ? 403 : 401);
    let body = {};
    try {
      body = await request.json();
    } catch (_error) {
      return validationError("INVALID_JSON", body);
    }
    const brand = normalizeBrand(body.brand);
    const profile = getSenderProfile(brand);
    if (!profile.ok) return validationError(profile.reason, body);
    const authorization = authorizeCallerForBrand(authentication.caller, brand);
    if (!authorization.ok) return unauthorized(body, authorization.reason, 403);
    return response(200, {
      authorized: true,
      noSend: true,
      callerId: authentication.caller.callerId,
      callerAuthModel: authentication.authModel,
      brand,
      senderAddress: profile.profile.acsFrom,
      brandCc: profile.profile.ccAddress,
      replyTo: profile.profile.replyTo
    });
  }
});

module.exports = {
  buildEnterpriseEmail,
  validateEnterprisePayload
};
