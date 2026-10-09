"use strict";

const { app } = require("@azure/functions");
const { authenticateCaller } = require("../security/callerAuthentication");
const { CALLER_ID, renderFinancialInquiryNotice } = require("../templates/financialInquiryNotice");
const { getMessageLedger } = require("../state/messageLedger");

async function lookupFinancialInquiryNotice(request, deps = {}) {
  const auth = (deps.authenticateCaller || authenticateCaller)(request);
  if (!auth.ok || auth.authModel !== "ENTRA_WORKLOAD_IDENTITY" ||
      auth.caller?.callerId !== CALLER_ID || auth.caller.status !== "ACTIVE") {
    return { status: 403, jsonBody: { status: "indeterminate", code: "LOOKUP_CALLER_DENIED" } };
  }
  let payload;
  try { payload = await request.json(); }
  catch { return { status: 400, jsonBody: { status: "indeterminate", code: "LOOKUP_REQUEST_INVALID" } }; }
  const rendered = renderFinancialInquiryNotice(payload);
  if (!rendered.ok) return { status: 400, jsonBody: { status: "indeterminate", code: "LOOKUP_REQUEST_INVALID" } };
  const value = rendered.value;
  try {
    const result = await (deps.ledger || getMessageLedger()).lookupExact({
      callerId: CALLER_ID, brand: value.brand,
      businessObjectType: value.businessObjectType, businessObjectId: value.businessObjectId,
      correlationId: value.correlationId, recipients: value.to.map(item => item.address),
      communicationPurpose: value.messageType, templateId: value.templateId,
      templateVersion: value.templateVersion, rendererVersion: value.renderMetadata.rendererVersion,
      brandTokenVersion: value.renderMetadata.brandTokenVersion,
      htmlSha256: value.renderMetadata.htmlSha256, plainTextSha256: value.renderMetadata.plainTextSha256,
      idempotencyKey: value.idempotencyKey
    });
    return { status: result.status === "indeterminate" ? 503 : 200, jsonBody: result };
  } catch { return { status: 503, jsonBody: { status: "indeterminate" } }; }
}

app.http("lookup-financial-inquiry-notice", {
  methods: ["POST"], authLevel: "anonymous", route: "lookup-financial-inquiry-notice",
  handler: request => lookupFinancialInquiryNotice(request)
});

module.exports = { lookupFinancialInquiryNotice };
