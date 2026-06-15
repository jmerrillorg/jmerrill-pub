const { app } = require("@azure/functions");
const { EmailClient } = require("@azure/communication-email");
const { DefaultAzureCredential } = require("@azure/identity");

const ALLOWED_INTAKE_CHANNEL = "INT-PUB-005 /join";
const DEFAULT_PROJECT_TITLE = "your book";
const REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const MAX_FIELD_LENGTH = 300;

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

function isValidEmail(value) {
  if (!value || value.length > 254 || /[\r\n]/.test(value)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
      intakeChannel
    }
  };
}

function buildAcknowledgmentEmail(payload) {
  const senderAddress = safeTrim(process.env.ACS_EMAIL_SENDER);

  if (!senderAddress) {
    throw Object.assign(new Error("ACS sender is missing."), {
      safeCode: "ACS_SENDER_MISSING"
    });
  }

  const subject = `We received your publishing inquiry — ${payload.reference}`;
  const plainText = [
    `Good day ${payload.firstName},`,
    "",
    "Thank you for reaching out to J Merrill Publishing and trusting us with the first step of your publishing journey.",
    "",
    `We received your inquiry for ${payload.projectTitle}, and your reference number is:`,
    "",
    payload.reference,
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
