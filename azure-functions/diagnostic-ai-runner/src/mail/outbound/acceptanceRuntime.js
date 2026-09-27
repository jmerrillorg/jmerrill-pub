"use strict";
const { PublishingMailboxGraphClient } = require("../inbound/graphClient");
const { verifyPublishingMailboxEvidence, providerIdFromInternetMessageId } = require("../../generated/communications/publishing-communication-acceptance");

function relayConfig(env = process.env) {
  const base = String(env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || "").replace(/\/$/, "");
  const key = env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY;
  if (!base || !key) throw Object.assign(new Error("Acceptance relay authority unavailable"), { safeCode: "ACCEPTANCE_RELAY_CONFIG_MISSING" });
  return { url: `${base}/api/publishing/communications/acceptance`, key };
}
async function relayRequest(body, deps = {}) {
  const config = relayConfig(deps.env);
  const response = await (deps.fetchImpl || fetch)(config.url, { method: "POST",
    headers: { "Content-Type": "application/json", "x-jm1-relay-key": config.key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw Object.assign(new Error("Acceptance relay rejected readback"), { safeCode: "ACCEPTANCE_RELAY_REJECTED" });
  return response.json();
}
async function nativeAcceptanceProof(communicationId, deps = {}) {
  const { command } = await (deps.relayRequest || relayRequest)({ communicationId }, deps);
  if (!command?.providerMessageId || !command.acceptedAt) return { nativeMessage: null, reason: "PROVIDER_ACCEPTANCE_UNPROVEN" };
  const graph = deps.graph || new PublishingMailboxGraphClient();
  const after = new Date(Date.parse(command.acceptedAt) - 120000).toISOString();
  const filter = encodeURIComponent(`receivedDateTime ge ${after}`);
  const select = "id,internetMessageId,subject,from,toRecipients,ccRecipients";
  let path = `/users/publishing%40jmerrill.one/messages?$filter=${filter}&$select=${select}&$top=100`;
  for (let page = 0; page < 10 && path; page++) {
    const data = await graph.request("GET", path, null, { Prefer: 'IdType="ImmutableId"' });
    for (const nativeMessage of data.value || []) {
      if (verifyPublishingMailboxEvidence(command, nativeMessage, "publishing@jmerrill.one").verified) {
        return { nativeMessage, reason: "MAILBOX_VERIFIED", recipientDeliveryProven: false };
      }
    }
    const next = data["@odata.nextLink"];
    if (next && !next.startsWith("https://graph.microsoft.com/v1.0/users/publishing%40jmerrill.one/")) {
      throw Object.assign(new Error("Mailbox pagination authority mismatch"), { safeCode: "MAILBOX_PAGINATION_AUTHORITY_DENIED" });
    }
    path = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
  }
  return { nativeMessage: null, reason: path ? "MAILBOX_READ_INCOMPLETE" : "MAILBOX_EVIDENCE_PENDING" };
}
async function runAcceptanceVerification(deps = {}) {
  const request = deps.relayRequest || relayRequest;
  const { commands } = await request({ action: "pending" }, deps);
  const counts = { pending: 0, verified: 0, unverified: 0, runtimeFailures: 0 };
  for (const command of commands || []) {
    try {
      const { acceptance } = await request({ action: "verify", communicationId: command.jm1MessageId }, deps);
      if (acceptance?.verificationRuntimeFailure) counts.runtimeFailures++;
      if (acceptance?.communicationComplete) counts.verified++;
      else if (acceptance?.communicationState === "DELIVERY_UNVERIFIED") counts.unverified++;
      else counts.pending++;
    } catch { counts.runtimeFailures++; }
  }
  const summary = await request({ action: "summary" }, deps);
  counts.unverified = Math.max(counts.unverified, Number(summary.counts?.unverified || 0));
  await request({ action: "runtime-health", counts }, deps);
  return counts;
}
async function recoverAcceptanceFromMailboxEvent(message, deps = {}) {
  if (message.from?.emailAddress?.address?.toLowerCase() !== "publishing@email.jmerrill.one") return null;
  const token = providerIdFromInternetMessageId(message.internetMessageId);
  if (!token) return null;
  const id = `${token.slice(0, 8)}-${token.slice(8, 12)}-${token.slice(12, 16)}-${token.slice(16, 20)}-${token.slice(20)}`;
  const result = await (deps.relayRequest || relayRequest)({ action: "recover-provider", providerMessageId: id }, deps);
  if (result?.acceptance?.communicationComplete && deps.store) {
    const acceptance = result.acceptance;
    for (const queue of await deps.store.listQueueItems(1000)) {
      if (queue.serviceStatus !== "DELIVERY_UNVERIFIED") continue;
      await deps.store.withBusinessRouteLease(queue.evidenceLink, async () => {
        const route = await deps.store.getBusinessRoute(queue.evidenceLink);
        if (route?.service?.relayCommunicationId !== acceptance.communicationId
            || route.service.providerMessageId !== acceptance.providerMessageId
            || route.service.status !== "DELIVERY_UNVERIFIED") return;
        await deps.store.updateBusinessRoute({ ...route, service: { ...route.service,
          status: "SENT_READBACK_PENDING", serviceException: false } });
        await deps.store.updateQueueItem({ ...queue, serviceStatus: "SENT_READBACK_PENDING" });
      });
    }
  }
  return result;
}
module.exports = { relayConfig, relayRequest, nativeAcceptanceProof, runAcceptanceVerification, recoverAcceptanceFromMailboxEvent };
