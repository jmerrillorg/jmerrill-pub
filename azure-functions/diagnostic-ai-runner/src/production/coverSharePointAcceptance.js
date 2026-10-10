"use strict";

const { createCoverOwnerStore, digest, hash } = require("./coverOwnerStore");
const { createCoverSharePointPersistence, permissionDigest } = require("./coverSharePointPersistence");
const { nativeGraph } = require("./coverNativeOwner");
const { createCoverReviewUploadJournal } = require("./coverReviewUploadJournal");
const DESTINATION = Object.freeze({
  driveId: "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se",
  folderId: "01DF3SEQLBSAC7VNOAQNAJ2WLORL6STRJA", folderPath: "/Preview Runtime Certification",
  host: "jmerrillfoundation.sharepoint.com",
  permissionsSha256: permissionDigest([
    { id: "UHVibGlzaGluZyBUZWFtIE1lbWJlcnM", roles: ["write"] },
    { id: "UHVibGlzaGluZyBUZWFtIE93bmVycw", roles: ["owner"] },
    { id: "UHVibGlzaGluZyBUZWFtIFZpc2l0b3Jz", roles: ["read"] },
    { id: "Yzowby5jfGZlZGVyYXRlZGRpcmVjdG9yeWNsYWltcHJvdmlkZXJ8YjY1MGNhYTYtMzI0Yy00YmUxLWI0OTEtNTdhYjFhZWU3YzRlX28", roles: ["owner"] }
  ])
});

async function runCoverSharePointAcceptance(containerClient, context = {}) {
  const store = createCoverOwnerStore({ containerClient, acceptance: true });
  const key = "72fe3fab404fd5bcf30e5bf937481901e92b8bc8c1cedfb5aba58c1cbd4a082d";
  const row = await store.read("packages", key, "html");
  if (row?.sha256 !== "bbfdeabb9942b60440f8829cdc771c047a919f27788901b8609b18d413449380") {
    throw Object.assign(new Error("COVER_ACCEPTANCE_PACKAGE_MISSING"), { safeCode: "COVER_ACCEPTANCE_PACKAGE_MISSING" });
  }
  const binding = { titleId: "11111111-1111-4111-8111-111111111111", editionId: "44444444-4444-4444-8444-444444444441",
    executionKey: "af3d339f3541bcdba742847dc4f2f979184eb01576e3ec0981c6f39feb198958",
    sourceSha256: hash(Buffer.from("SYNTHETIC_REVIEW_CUSTODY_NOT_TITLE_AUTHORITY")),
    authoritySha256: digest({ class: "CONTROLLED_SYNTHETIC", destination: DESTINATION }),
    reviewerId: "33333333-3333-4333-8333-333333333333",
    reviewerAuthoritySha256: digest({ class: "SYNTHETIC_REVIEWER_NOT_HUMAN_APPROVAL" }), destination: DESTINATION };
  const graph = context.graph || nativeGraph(context);
  const journal = createCoverReviewUploadJournal(store, undefined, "SMALL_CREATE_ONLY");
  let uploadCalls = 0;
  let committedResponseLost = false;
  const persist = createCoverSharePointPersistence({ uploadMode: "SMALL_CREATE_ONLY", graph: async (path, options) => {
    const write = options?.method === "PUT" && path.endsWith(":/content?@microsoft.graph.conflictBehavior=fail");
    if (write) uploadCalls++;
    const result = await graph(path, options);
    if (write) { committedResponseLost = true; throw new Error("CONTROLLED_SYNTHETIC_COMMITTED_RESPONSE_LOSS"); }
    return result;
  }, fetchImpl: async (url, options) => {
    uploadCalls++;
    const response = await (context.fetchImpl || fetch)(url, options);
    if ([200, 201].includes(response.status)) {
      committedResponseLost = true;
      throw new Error("CONTROLLED_SYNTHETIC_COMMITTED_RESPONSE_LOSS");
    }
    return response;
  },
    assertClaim: async () => {
      if (context.env?.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED !== "true") throw new Error("COVER_ACCEPTANCE_DISABLED");
    },
    verifyAuthority: async input => digest(input) === digest(binding) &&
      context.env?.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED === "true",
    ...journal });
  if (context.sessionDiagnostic === true) {
    // Independently validate destination/permissions and absence without repairing custody.
    const readOnly = createCoverSharePointPersistence({ graph, verifyAuthority: async input => digest(input) === digest(binding),
      assertClaim: async () => { throw new Error("COVER_DIAGNOSTIC_TARGET_ABSENT"); } });
    try { await readOnly.persist(binding, row.bytes); throw new Error("COVER_DIAGNOSTIC_TARGET_EXISTS"); }
    catch (error) { if (error.message !== "COVER_DIAGNOSTIC_TARGET_ABSENT") throw error; }
    const intentKey = digest({ bindingSha256: digest(binding) });
    const original = await store.read("review-upload-intents", intentKey);
    if (original?.sha256 !== "5ce697aba483e4d574f34400882d7737dc9ecdb9767c5856f8af17b74bd632bd" ||
        context.env?.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED !== "true") throw new Error("COVER_DIAGNOSTIC_SOURCE_UNBOUND");
    const filename = `cover-review-${digest({ binding, checksum: row.sha256 })}.html`;
    const requestBody = JSON.stringify({ item: { name: filename, "@microsoft.graph.conflictBehavior": "fail" } });
    const diagnosticKey = digest({ kind: "SESSION_DIAGNOSTIC_V1", bindingSha256: digest(binding) });
    if (await store.read("faults", diagnosticKey)) throw new Error("COVER_DIAGNOSTIC_REQUIRES_RESULT_READBACK");
    await store.writeJson("faults", diagnosticKey, { kind: "SESSION_DIAGNOSTIC_RESERVED", sourceIntentSha256: original.sha256,
      sourceObservationSha256: "4765ceeabd93d17b6289847613964a3bb0e915cb2a39cd660ac11d8f420bc311",
      requestSha256: hash(Buffer.from(requestBody)), bindingSha256: digest(binding), synthetic: true, uploadCalls: 0 });
    const resultKey = digest({ diagnosticKey, kind: "SESSION_DIAGNOSTIC_RESULT" });
    try {
      await graph(`drives/${encodeURIComponent(DESTINATION.driveId)}/items/${encodeURIComponent(DESTINATION.folderId)}:/${filename}:/createUploadSession`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: requestBody });
      await store.writeJson("faults", resultKey, { kind: "SESSION_CREATED_NO_BYTES_UPLOADED", synthetic: true,
        diagnosticKey, uploadCalls: 0 }, { immutable: true });
      return { proofClass: "SESSION_DIAGNOSTIC_NOT_CUSTODY_ACCEPTANCE", uploadCalls: 0, originalIntentPreserved: true };
    } catch (error) {
      await store.writeJson("faults", resultKey, { kind: "SESSION_DIAGNOSTIC_REJECTED", synthetic: true, diagnosticKey,
        operation: error.operation || "UNKNOWN", status: error.statusCode || null, providerCode: error.providerCode || "UNKNOWN",
        category: error.category || "UNCLASSIFIED", requestId: error.requestId || null, uploadCalls: 0 }, { immutable: true });
      throw error;
    }
  }
  const result = await persist.persist(binding, row.bytes);
  const saved = await store.writeJson("review-deliveries", digest(binding), { ...result, synthetic: true }, { immutable: true });
  const replay = await persist.persist(binding, row.bytes);
  if (digest(replay) !== digest(result)) throw new Error("COVER_REVIEW_REPLAY_CONFLICT");
  const conflictKey = digest({ binding, kind: "SMALL_CREATE_ONLY_CONFLICT_PROOF_V1" });
  const conflictResultKey = digest({ conflictKey, kind: "RESULT" });
  let conflict = await store.read("faults", conflictResultKey);
  let conflictProbeCalls = 0;
  if (!conflict) {
    if (await store.read("faults", conflictKey)) throw new Error("COVER_ACCEPTANCE_CONFLICT_PROOF_HELD");
    await store.writeJson("faults", conflictKey, { kind: "CREATE_ONLY_CONFLICT_PROOF_RESERVED", synthetic: true,
      bindingSha256: digest(binding), expectedEtag: result.etag, expectedSha256: row.sha256 });
    if (context.env?.JM1_COVER_ADAPTER_ACCEPTANCE_ENABLED !== "true") throw new Error("COVER_ACCEPTANCE_DISABLED");
    conflictProbeCalls++;
    let status = 200;
    try {
      const filename = `cover-review-${digest({ binding, checksum: row.sha256 })}.html`;
      await graph(`drives/${encodeURIComponent(DESTINATION.driveId)}/items/${encodeURIComponent(DESTINATION.folderId)}:/${filename}:/content?@microsoft.graph.conflictBehavior=fail`,
        { method: "PUT", headers: { "Content-Type": "text/plain" }, body: row.bytes });
    } catch (error) { status = error.statusCode || 0; }
    conflict = await store.writeJson("faults", conflictResultKey, { kind: "CREATE_ONLY_CONFLICT_PROOF_RESULT",
      synthetic: true, httpStatus: status, expectedEtag: result.etag, expectedSha256: row.sha256 }, { immutable: true });
  }
  const afterConflict = await persist.persist(binding, row.bytes);
  if (conflict.value.httpStatus !== 409 || digest(afterConflict) !== digest(result)) {
    throw new Error("COVER_ACCEPTANCE_CREATE_ONLY_NOT_PROVEN");
  }
  return { proofClass: "CONTROLLED_SYNTHETIC_SHAREPOINT_NOT_TITLE_ACCEPTANCE", receiptReference: saved.reference,
    ...saved.value, replayVerified: true, uploadCalls, committedResponseLost, conflictProbeCalls,
    createOnlyConflictStatus: conflict.value.httpStatus, createOnlyConflictVerified: true,
    paidProviderInvocations: 0, businessStageEffects: 0, authorCommunications: 0 };
}
module.exports = { runCoverSharePointAcceptance, DESTINATION };
