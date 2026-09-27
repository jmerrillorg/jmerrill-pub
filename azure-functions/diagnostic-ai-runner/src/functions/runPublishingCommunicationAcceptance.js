"use strict";
const { app } = require("@azure/functions");
const { timingSafeEqual } = require("node:crypto");
const { nativeAcceptanceProof, runAcceptanceVerification } = require("../mail/outbound/acceptanceRuntime");
function authorized(request) {
  const expected = Buffer.from(process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || "");
  const supplied = Buffer.from(request.headers.get("x-jm1-relay-key") || "");
  return expected.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
app.http("publishing-communication-native-proof", {
  methods: ["POST"], authLevel: "anonymous", route: "publishing/communications/native-proof",
  handler: async request => {
    if (!authorized(request)) return { status: 401, jsonBody: { code: "UNAUTHORIZED" } };
    const body = await request.json().catch(() => null);
    if (!/^[a-f0-9-]{36}$/i.test(body?.communicationId || "")) return { status: 400, jsonBody: { code: "COMMUNICATION_ID_REQUIRED" } };
    try { return { status: 200, jsonBody: await nativeAcceptanceProof(body.communicationId) }; }
    catch (error) { return { status: 503, jsonBody: { code: error.safeCode || "NATIVE_PROOF_UNAVAILABLE" } }; }
  }
});
app.timer("publishing-communication-mailbox-verification", {
  schedule: "0 * * * * *",
  handler: async (_timer, context) => {
    if (process.env.JM1_PUBLISHING_INBOUND_SERVICE_ENABLED !== "true") return;
    try {
      const counts = await runAcceptanceVerification();
      context.info(`Publishing acceptance: ${JSON.stringify(counts)}`);
      if (counts.unverified || counts.runtimeFailures) context.error("PUBLISHING_ACCEPTANCE_MATERIAL_FAILURE: system reconciliation required; do not resend.");
    } catch { context.error("PUBLISHING_ACCEPTANCE_RUNTIME_FAILURE: no provider retry authorized."); }
  }
});
