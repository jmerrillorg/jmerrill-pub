"use strict";

const { BlobInboundEvidenceStore } = require("../mail/inbound/blobEvidenceStore");
const { writeLog } = require("../editorial/editorialExecutionRuntime");

const REQUEST_TYPES = new Set(["ADDITIONAL_PAYMENT_REQUEST", "PAYMENT_ACCESS_REQUEST",
  "INSTALLMENT_INFORMATION_REQUEST", "PAYMENT_LINK_ACCESS_PROBLEM"]);

async function paymentServiceCall(action, requestId, env = process.env) {
  if (!env.JM1_PAYMENT_EVENT_RECOVERY_KEY) throw new Error("PAYMENT_SERVICE_CALLER_UNCONFIGURED");
  const url = "https://jmerrill.pub/api/author/stripe/payment/service";
  const response = await fetch(url, {
    method: action === "LIST" ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-jm1-payment-event-recovery-key": env.JM1_PAYMENT_EVENT_RECOVERY_KEY },
    ...(action === "LIST" ? {} : { body: JSON.stringify({ action, requestId }) }),
    signal: AbortSignal.timeout(55000)
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw Object.assign(new Error("PAYMENT_SERVICE_RETRY_REQUIRED"), {
    safeCode: /^[A-Z0-9_]+$/.test(body.code || "") ? body.code : "PAYMENT_SERVICE_RETRY_REQUIRED"
  });
  return body;
}

function assertRequest(request) {
  if (!/^observed_payment_[a-f0-9]{40}$/.test(request.requestId || "") || !REQUEST_TYPES.has(request.requestType) ||
      request.idempotencyKey !== request.requestId || request.engagementId !== request.agreementId ||
      request.obligationId !== request.agreementId || request.sourceEvent?.kind !== "FOUNDER_RATIFIED_OBSERVATION" ||
      request.sourceEvent.providerMessageId !== null) throw new Error("OBSERVED_REQUEST_AUTHORITY_DENIED");
}

async function prepareObservedService(queueItem, deps) {
  const route = await deps.store.getBusinessRoute(queueItem.evidenceLink);
  const request = route?.observedRequest;
  assertRequest(request || {});
  if (!route.dataverseExecutionLogId || queueItem.evidenceLink !== request.requestId ||
      queueItem.authorId !== request.authorId || queueItem.titleId !== request.titleId ||
      queueItem.engagementId !== request.engagementId) throw new Error("OBSERVED_SERVICE_IDENTITY_DENIED");
  const result = await (deps.paymentServiceCall || paymentServiceCall)("PREPARE_OBSERVED_SERVICE", request.requestId, deps.env);
  const prepared = result.preparation;
  if (JSON.stringify(prepared.request) !== JSON.stringify(request) || !prepared.recipient || !prepared.copy?.html ||
      !prepared.copy?.text || prepared.copy.metadata?.qualityGate !== "PASS") throw new Error("OBSERVED_SERVICE_PREPARATION_DENIED");
  return { outcome: "ROUTINE_SERVICE_READY", intent: request.requestType, humanGate: false,
    eventId: request.requestId, route, message: { conversationId: null },
    movement: { title: prepared.titleName }, recipient: prepared.recipient, authorName: prepared.authorName,
    copy: { subject: prepared.copy.subject, body: prepared.copy.text, html: prepared.copy.html },
    linkStatus: prepared.paymentUrl ? "VALID" : "NOT_REQUIRED", transitionHeld: true };
}

async function runObservedPaymentConsumer(deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_OBSERVED_PAYMENT_SERVICE_ENABLED !== "true") return { status: "DISABLED" };
  const store = deps.store || new BlobInboundEvidenceStore();
  const call = deps.paymentServiceCall || paymentServiceCall;
  const now = new Date().toISOString();
  const results = [];
  let requests;
  try { requests = (await call("LIST", null, env)).requests; }
  catch (error) {
    await store.put("payment-service/health.json", { status: "RETRY_REQUIRED", lastFailure: error.safeCode || "INTAKE_READ_FAILED", updatedAt: now });
    throw error;
  }
  for (const request of requests) {
    assertRequest(request);
    await store.withBusinessRouteLease(request.requestId, async () => {
      const path = `payment-service/requests/${request.requestId}.json`;
      const previous = await store.get(path);
      if (previous?.nextRetryAt && previous.nextRetryAt > now) return;
      try {
        const result = await call("RECONCILE_SETTLEMENTS", request.requestId, env);
        const reconciliation = result.reconciliation;
        const route = await store.getBusinessRoute(request.requestId);
        const auditId = route?.dataverseExecutionLogId || await (deps.writeLog || writeLog)(deps.client, {
          name: "PUBLISHING_OBSERVED_PAYMENT_REQUEST", actionType: "PUBLISHING_OBSERVED_PAYMENT_REQUEST",
          sourceEntity: "jm1pub_title", sourceRecordId: request.titleId,
          description: `requestId=${request.requestId}; authorId=${request.authorId}; engagementId=${request.engagementId}; ` +
            `obligationId=${request.obligationId}; source=FOUNDER_RATIFIED_OBSERVATION; providerMessageId=UNAVAILABLE; requestType=${request.requestType}.`
        });
        await store.upsertBusinessRoute({ inboundMessageEventId: request.requestId,
          businessEventId: request.requestId, authorId: request.authorId, titleId: request.titleId,
          engagementId: request.engagementId, stageId: null, status: "FINANCIAL_SERVICE_READY",
          observedRequest: request, dataverseExecutionLogId: auditId });
        await store.upsertQueueItem({ queueItemId: `queue_${request.requestId}`, evidenceLink: request.requestId,
          businessEventId: request.requestId, authorId: request.authorId, titleId: request.titleId,
          engagementId: request.engagementId, stageId: null, sourceKind: "OBSERVED_PAYMENT_REQUEST",
          classification: "OBSERVED_PAYMENT_SERVICE", receivedAt: request.createdAt, createdAt: request.createdAt,
          updatedAt: now, requestType: request.requestType, idempotencyKey: request.idempotencyKey });
        const record = { ...request, status: route?.service?.status === "SENT" && route.service.deliveryId ? "SERVICE_COMPLETE" : "RECONCILED", reconciliation, updatedAt: now,
          deliveryId: route?.service?.deliveryId || null,
          retryCount: previous?.retryCount || 0, lastSuccessfulReconciliation: now, lastFailure: null };
        await store.put(path, record);
        results.push(record);
      } catch (error) {
        const retryCount = Number(previous?.retryCount || 0) + 1;
        const record = { ...request, status: "RECONCILIATION_PENDING", updatedAt: now, retryCount,
          firstPendingAt: previous?.firstPendingAt || now, lastFailure: error.safeCode || "SETTLEMENT_RETRY_REQUIRED",
          nextRetryAt: new Date(Date.parse(now) + Math.min(15 * 60000, 2 ** Math.min(retryCount, 8) * 1000)).toISOString() };
        await store.put(path, record);
        results.push(record);
      }
    });
  }
  const tail = await call("RECONCILE_PROVIDER_TAIL", null, env).catch(error => ({ results: [{
    requestId: "provider-census", status: "RECONCILIATION_PENDING", reason: error.safeCode || "PROVIDER_CENSUS_RETRY_REQUIRED" }] }));
  if (!tail.results.some(item => item.requestId === "provider-census")) {
    const path = "payment-service/tail/provider-census.json";
    const prior = await store.get(path);
    if (prior) await store.put(path, { ...prior, status: "RECONCILED", updatedAt: now, firstPendingAt: null });
  }
  for (const item of tail.results) {
    const path = `payment-service/tail/${item.requestId}.json`;
    const prior = await store.get(path);
    await store.put(path, { ...item, updatedAt: now,
      retryCount: Number(prior?.retryCount || 0) + (item.status === "RECONCILIATION_PENDING" ? 1 : 0),
      firstPendingAt: item.status === "RECONCILIATION_PENDING" ? prior?.firstPendingAt || now : null });
  }
  const records = [...await store.listPrefix("payment-service/requests/"), ...await store.listPrefix("payment-service/tail/")];
  const pending = records.filter(row => row.status === "RECONCILIATION_PENDING");
  const priorHealth = await store.get("payment-service/health.json");
  const health = { status: pending.length ? "RECONCILIATION_PENDING" : "HEALTHY", updatedAt: now,
    unreconciledSettlementCount: pending.length,
    oldestUnreconciledSettlement: pending.map(row => row.firstPendingAt).filter(Boolean).sort()[0] || null,
    retryCount: records.reduce((sum, row) => sum + Number(row.retryCount || 0), 0),
    lastSuccessfulReconciliation: results.some(row => ["RECONCILED", "SERVICE_COMPLETE"].includes(row.status)) ? now : priorHealth?.lastSuccessfulReconciliation || null,
    lastFailure: pending.at(-1)?.lastFailure || pending.at(-1)?.reason || priorHealth?.lastFailure || null };
  await store.put("payment-service/health.json", health);
  return { status: health.status, results, tail: tail.results };
}

module.exports = { assertRequest, paymentServiceCall, prepareObservedService, runObservedPaymentConsumer };
