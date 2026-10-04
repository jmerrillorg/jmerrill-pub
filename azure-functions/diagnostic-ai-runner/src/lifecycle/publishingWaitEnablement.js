"use strict";

function waitRuntimeOwnsTitle(titleId, env = process.env) {
  if (env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED !== "true") return false;
  return scopedTitle(titleId, env);
}
function waitRuntimeMonitorsTitle(titleId, env = process.env) {
  if (env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED !== "true" && env.JM1_PUBLISHING_WAIT_OBSERVATION_ENABLED !== "true") return false;
  return scopedTitle(titleId, env);
}
function scopedTitle(titleId, env) {
  const ids = (env.JM1_PUBLISHING_WAIT_TITLE_IDS || "").split(",").map((id) => id.trim().toLowerCase());
  if (!ids.length || ids.some((id) => !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))) {
    throw Object.assign(new Error("WAIT_CUTOVER_TITLE_SCOPE_REQUIRED"), { safeCode: "WAIT_CUTOVER_TITLE_SCOPE_REQUIRED" });
  }
  return ids.includes(String(titleId || "").toLowerCase());
}
module.exports = { waitRuntimeOwnsTitle, waitRuntimeMonitorsTitle };
