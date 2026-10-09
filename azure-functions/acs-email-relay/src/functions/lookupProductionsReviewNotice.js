"use strict";
const { app } = require("@azure/functions");
const { authenticateCaller } = require("../security/callerAuthentication");
const { CALLER_ID, renderProductionsBp09Notice } = require("../templates/productionsBp09Notice");
const { getMessageLedger } = require("../state/messageLedger");

async function lookupProductionsReviewNotice(request, deps = {}) {
  const auth = (deps.authenticateCaller || authenticateCaller)(request);
  if (!auth.ok || auth.authModel !== "ENTRA_WORKLOAD_IDENTITY" ||
      auth.caller?.callerId !== CALLER_ID || auth.caller.status !== "ACTIVE") {
    return { status: 403, jsonBody: { status: "unknown", code: "LOOKUP_CALLER_DENIED" } };
  }
  let payload;
  try { payload = await request.json(); } catch { return { status: 400, jsonBody: { status: "unknown" } }; }
  const { receiptId, ...envelope } = payload || {};
  if (typeof receiptId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(receiptId)) {
    return { status: 400, jsonBody: { status: "unknown", code: "LOOKUP_RECEIPT_REQUIRED" } };
  }
  const rendered = renderProductionsBp09Notice(envelope);
  if (!rendered.ok) return { status: 400, jsonBody: { status: "unknown", code: "LOOKUP_REQUEST_INVALID" } };
  const value = rendered.value;
  try {
    const result = await (deps.ledger || getMessageLedger()).lookupExactDelivery({
      callerId: CALLER_ID, brand: value.brand, businessObjectType: value.businessObjectType,
      businessObjectId: value.businessObjectId, correlationId: value.correlationId,
      recipients: value.to.map(item => item.address), communicationPurpose: value.messageType,
      templateId: value.templateId, templateVersion: value.templateVersion,
      rendererVersion: value.renderMetadata.rendererVersion, brandTokenVersion: value.renderMetadata.brandTokenVersion,
      htmlSha256: value.renderMetadata.htmlSha256, plainTextSha256: value.renderMetadata.plainTextSha256,
      idempotencyKey: value.idempotencyKey
    }, receiptId);
    if (result.status === "found") return { status: 200, jsonBody: { status: "accepted", receiptId,
      providerMessageId: result.providerMessageId, acceptedAt: result.acceptedAt,
      deliveryEvidenceAvailable: false, retryAuthorized: false } };
    if (result.status === "failed") return { status: 200, jsonBody: { status: "failed", receiptId,
      failedAt: result.failedAt, retryAuthorized: false } };
    return { status: 503, jsonBody: { status: "unknown", retryAuthorized: false } };
  } catch { return { status: 503, jsonBody: { status: "unknown", retryAuthorized: false } }; }
}

app.http("lookup-productions-review-notice", { methods: ["POST"], authLevel: "anonymous",
  route: "lookup-productions-review-notice", handler: request => lookupProductionsReviewNotice(request) });
module.exports = { lookupProductionsReviewNotice };
