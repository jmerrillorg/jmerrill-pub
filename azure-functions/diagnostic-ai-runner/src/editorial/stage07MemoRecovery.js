"use strict";
const { createHash } = require("node:crypto");
const sha = value => createHash("sha256").update(value).digest("hex");
function recover(output) {
  if (typeof output.memo !== "string" || !output.memo.trim()) throw Error("STAGE07_MEMO_INCOMPLETE");
  if (!/^(placeholder|todo|tbd)$/i.test(output.memo.trim())) return { memo: output.memo, recovery: null };
  // A malformed tool result may put the complete memo after its explicit field delimiter.
  const marker = '</noChangeReason>\n<parameter name="memo">';
  const parts = typeof output.noChangeReason === "string" ? output.noChangeReason.split(marker) : [];
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim() || /<\/?(?:parameter|noChangeReason)\b/i.test(parts[1]) || /^(placeholder|todo|tbd)$/i.test(parts[1].trim())) {
    throw Error("STAGE07_MEMO_INCOMPLETE");
  }
  return { memo: parts[1], recovery: { method: "EXACT_EMBEDDED_MEMO_FIELD_V1", originalOutputSha256: sha(JSON.stringify(output)),
    sourceField: "noChangeReason", sourceOffset: parts[0].length + marker.length, recoveredMemoSha256: sha(parts[1]) } };
}
module.exports = { recover };
