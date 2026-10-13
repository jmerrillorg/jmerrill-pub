"use strict";
const { app } = require("@azure/functions");
async function run(context, env = process.env, request = fetch) {
  if (env.JM1_DISTRIBUTOR_COLLECTION_ENABLED !== "true") return { status: "DISABLED" };
  const key = env.JM1_ORCHESTRATION_WORKER_KEY;
  if (!key) throw Error("DISTRIBUTOR_WORKER_KEY_MISSING");
  const response = await request("https://jmerrill.pub/api/publisher/royalties/collect", {
    method: "POST", headers: { "content-type": "application/json", "x-jm1-orchestration-worker-key": key },
    body: JSON.stringify({ scheduled: true }), signal: AbortSignal.timeout(240000), redirect: "error"
  });
  if (!response.ok) throw Error(`DISTRIBUTOR_COLLECTION_HTTP_${response.status}`);
  const result = await response.json();
  for (const row of result.results || []) {
    if (["REVIEW_REQUIRED", "RETRY_PENDING"].includes(row.status)) context.error(`DISTRIBUTOR_COLLECTION_HELD: month=${row.month}; status=${row.status}; reference=${row.attemptId || "monitor"}`);
    else context.info(`DISTRIBUTOR_COLLECTION: month=${row.month}; status=${row.status}; reference=${row.attemptId || "monitor"}`);
  }
  return result;
}
app.timer("run-distributor-collection", { schedule: "0 */15 * * * *", handler: async (_timer,context) => run(context) });
module.exports = { run };
