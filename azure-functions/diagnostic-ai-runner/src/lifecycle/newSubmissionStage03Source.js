"use strict";
const { createHash } = require("node:crypto");
const stage02 = require("./newSubmissionStage02");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Consume accepted working sources independently; this does not assemble manuscripts.
async function consumeWorkingSource(output, deps) {
  if (output.role !== "EDITORIAL_WORKING_SOURCE") deny("STAGE03_WORKING_SOURCE_REQUIRED");
  await stage02.verifyOutput(output, deps);
  const stored = await deps.sourceBytes({ itemId: output.itemId });
  if (stored.length !== output.bytes || hash(stored) !== output.sha256) deny("STAGE03_SOURCE_CHANGED_DURING_READ");
  let bytes = stored;
  if (output.packaging === "ZIP_SINGLE_SOURCE_V1") {
    await stage02.verifyWorkingPackage(stored, output);
    const zip = await require("jszip").loadAsync(stored, { checkCRC32: true });
    bytes = await zip.file(output.entryName).async("nodebuffer");
  } else if ((output.packaging && output.packaging !== "NONE") || !output.path.endsWith(".md")) {
    deny("STAGE03_SOURCE_FORMAT_UNSUPPORTED");
  }
  if (bytes.length !== output.sourceBytes || hash(bytes) !== output.sourceSha256) deny("STAGE03_SOURCE_HASH_MISMATCH");
  const name = output.entryName || output.path.split("/").pop();
  const text = await require("../editorial/commissioningSourceText").extractCommissioningSourceText(bytes, { repositoryPath: name });
  if (!text.trim() || text.includes("\u0000")) deny("STAGE03_SOURCE_TEXT_INVALID");
  return { text, provenance: { itemId: output.itemId, path: output.path, eTag: output.eTag,
    name, storedSha256: output.sha256, sourceSha256: hash(bytes), sourceBytes: bytes.length,
    textSha256: hash(text), words: text.trim().split(/\s+/u).length, assembly: "SEPARATE_COMPONENT" } };
}
module.exports = { consumeWorkingSource };
