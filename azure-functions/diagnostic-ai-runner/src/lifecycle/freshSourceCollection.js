"use strict";
const { createHash } = require("node:crypto");

function reject() {
  throw Object.assign(new Error("FRESH_SOURCE_COLLECTION_INVALID"), { safeCode: "FRESH_SOURCE_COLLECTION_INVALID" });
}

// Custody order is deterministic, not authority to concatenate manuscripts.
function bindSourceCollection(components) {
  if (!Array.isArray(components) || components.length < 2 || components.length > 16) reject();
  const keys = new Set();
  const bound = components.map(component => {
    const fields = ["driveId", "itemId", "eTag", "path", "sha256"];
    if (!component || fields.some(key => typeof component[key] !== "string" || !component[key] ||
      component[key] !== component[key].trim() || /[\r\n]/.test(component[key])) ||
      !Number.isSafeInteger(component.bytes) || component.bytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(component.sha256) ||
      !/^\/01_Pipeline_A-Z\/.+\/_original\//i.test(component.path) ||
      component.path.split("/").some(part => part === "." || part === ".." || /%2e|%2f|%5c/i.test(part))) reject();
    const key = `${component.driveId}:${component.itemId}`;
    if (keys.has(key)) reject();
    keys.add(key);
    return Object.fromEntries([...fields, "bytes"].map(field => [field, component[field]]));
  }).sort((a, b) => a.driveId.localeCompare(b.driveId, "en") || a.itemId.localeCompare(b.itemId, "en"));
  return {
    schemaVersion: 1,
    components: bound,
    custodyHash: createHash("sha256").update(JSON.stringify(bound)).digest("hex"),
    contentOrderAuthority: "UNRESOLVED",
    concatenationAuthorized: false,
    editorialExecutionAuthorized: false
  };
}

module.exports = { bindSourceCollection };
