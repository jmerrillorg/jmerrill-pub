"use strict";
const { app } = require("@azure/functions");
const { authenticateAndAuthorize } = require("../security/callerAuthentication");
const { getMessageLedger } = require("../state/messageLedger");
const { communicationAcceptance } = require("../generated/communications/publishing-communication-acceptance");
const { resolvePublishingAcceptance } = require("../state/publishingAcceptance");

app.http("publishing-communication-acceptance", {
  methods: ["POST"], authLevel: "anonymous", route: "publishing/communications/acceptance",
  handler: async request => {
    if (!authenticateAndAuthorize(request, "JMP").ok) return { status: 401, jsonBody: { code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    const ledger = getMessageLedger();
    try {
      if (body?.action === "summary") return { status: 200, jsonBody: { counts: await ledger.acceptanceSummary() } };
      if (body?.action === "runtime-health") {
        const counts = Object.fromEntries(["pending", "verified", "unverified", "runtimeFailures"]
          .map(key => [key, Math.max(0, Math.min(Number(body.counts?.[key]) || 0, 100000))]));
        await ledger.recordRuntimeHealth(counts);
        return { status: 200, jsonBody: { recorded: true } };
      }
      if (body?.action === "pending") return { status: 200, jsonBody: { commands: await ledger.listVerificationPending(25) } };
      if (body?.action === "recover-provider") {
        const prior = await ledger.findByProviderId(body.providerMessageId);
        return { status: 200, jsonBody: { acceptance: prior ? await resolvePublishingAcceptance(prior, ledger) : null } };
      }
      const record = await ledger.findByCommunicationId(body?.communicationId);
      if (body?.action === "verify") {
        // Never accept caller-supplied proof. Fetch it from the native verifier.
        return { status: 200, jsonBody: { acceptance: await resolvePublishingAcceptance(record, ledger) } };
      }
      return { status: 200, jsonBody: { command: record, acceptance: communicationAcceptance(record) } };
    } catch (error) { return { status: 409, jsonBody: { code: error.safeCode || "ACCEPTANCE_AUTHORITY_UNAVAILABLE" } }; }
  }
});
