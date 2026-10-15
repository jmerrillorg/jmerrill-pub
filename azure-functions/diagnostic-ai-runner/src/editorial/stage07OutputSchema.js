"use strict";
const strings = () => ({ type: "array", items: { type: "string" } });
function object(properties) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}
function schema(pass) {
  if (pass === "EDIT") return object({
    paragraphs: { type: "array", items: object({ index: { type: "integer" }, text: { type: "string" } }) },
    reviewedNoChange: { type: "array", items: { type: "integer" } },
    noChangeReason: { type: "string" }, memo: { type: "string" }, questions: strings()
  });
  if (!["PLAN_SECTION", "CONSISTENCY_SECTION", "PLAN_SYNTHESIS", "FINAL_SYNTHESIS"].includes(pass)) {
    throw Error("STAGE07_OUTPUT_PASS_INVALID");
  }
  return object({
    ...(pass.endsWith("SECTION") ? { coverage: { type: "array", items: { type: "integer" } } } : {}),
    ledger: { type: "string" }, questions: strings(), blockingFindings: strings()
  });
}
module.exports = { schema };
