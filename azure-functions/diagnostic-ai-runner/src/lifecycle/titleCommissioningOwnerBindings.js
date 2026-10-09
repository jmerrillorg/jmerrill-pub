"use strict";

const { readTitleCommissioningAuthority } = require("./titleCommissioningAuthority");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID } = require("../author/jackieTitleSystemCommissioningPolicy");
const TITLE_ID = "f1908dc9-5775-f111-ab0f-6045bdd69435";
const AUTHORITY = "JMP-JACKIE-TITLE-COMMISSIONING-20261008:ESTABLISHING_GLORY:LINKED_INTAKE_V1";
const SOURCE_ID = "55cc4d7b-b784-f111-ab0f-000d3a14673b";
const retained = [
  ["81ff3ec4-91a2-f111-b8dc-000d3a14673b", "51947250", "c6d1945aae9519c0912d9c699f0fea59a3167084d8e73742b7314f0e3d874fdc"],
  ["415b26cf-648e-f111-8077-6045bdd69435", "42260407", "fac7a0bff00dd1af556945a1b81c7fa2469fb146c1172337439daae000a4c365"],
  ["358d06d1-648e-f111-8077-6045bdd69738", "42260410", "536b732b9adde04badbcb555231fc2acbeb64b52d79d9d7d8c5149ff479d17e3"],
  ["6b24f6ce-648e-f111-8077-7c1e525b15c2", "42260409", "779375fc38387c17ff03dcc9c860f9b78bff7f9de76544e9bc95c4ee5d934972"]
];
function ownerBinding(titleId) {
  if (titleId !== TITLE_ID) return null;
  return {
    request: { schemaVersion: 1, authorityReference: AUTHORITY,
      title: { jm1pub_titleid: TITLE_ID, _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
        jm1_canonicalauthorcontactreference: `contact:${JACKIE_CANONICAL_AUTHOR_CONTACT_ID}` },
      source: { reference: `dataverse:jm1pub_editorialartifact:${SOURCE_ID}`, version: "39660726",
        sha256: "b337a17a27c0c7108302ca7f671c26d788ce289fc3b9ffab6b12e09e23e87e31" },
      retainedArtifacts: retained.map(([artifactId, version, sha256]) => ({ artifactId, version, sha256,
        reference: `dataverse:jm1pub_editorialartifact:${artifactId}` })),
      historyReference: `dataverse:jm1pub_title:${TITLE_ID}:PRESERVE_EXISTING_PRODUCTION_HISTORY`, revision: 1 },
    scope: { schemaVersion: 1, titleId: TITLE_ID, authorityReference: AUTHORITY, version: "owner-v1",
      enabled: true, revoked: false, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING",
      controllingSourceArtifactId: SOURCE_ID, retainedArtifactIds: retained.map(([id]) => id) }
  };
}

async function ensureTitleCommissioningOwnerBindings(titleId, deps) {
  const binding = ownerBinding(titleId);
  if (!binding) return { provisioned: false };
  const records = [[`commissioning-scopes/${titleId}.json`, binding.scope], [`commissioning-requests/${titleId}.json`, binding.request]];
  const missing = [];
  for (const [path, value] of records) {
    const blob = deps.containerClient.getBlockBlobClient(path);
    try {
      const { etag } = await blob.getProperties();
      if (!etag) throw new Error("COMMISSIONING_OWNER_BINDING_VERSION_MISSING");
      const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: etag } });
      if (!bytes.equals(Buffer.from(JSON.stringify(value)))) throw new Error("COMMISSIONING_OWNER_BINDING_CONFLICT");
    } catch (error) {
      if (error?.statusCode !== 404) throw error;
      missing.push([blob, value]);
    }
  }
  if (!missing.length) return { provisioned: false };
  // Bootstrap consumes reviewed source authority, not a caller approval flag.
  // Any existing revocation/conflict above wins; no scope is overwritten.
  await readTitleCommissioningAuthority(binding.request, { ...deps, readScope: async () => binding.scope });
  for (const [blob, value] of missing) {
    const body = Buffer.from(JSON.stringify(value));
    try { await blob.uploadData(body, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } }); }
    catch (error) {
      if (![409, 412].includes(error?.statusCode)) throw error;
      if (!(await blob.downloadToBuffer()).equals(body)) throw new Error("COMMISSIONING_OWNER_BINDING_CONFLICT");
    }
  }
  return { provisioned: true };
}

module.exports = { ownerBinding, ensureTitleCommissioningOwnerBindings };
