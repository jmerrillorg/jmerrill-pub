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
  const journal = createCoverReviewUploadJournal(store, {
    intentSha256: "5ce697aba483e4d574f34400882d7737dc9ecdb9767c5856f8af17b74bd632bd",
    sourceSha256: "4765ceeabd93d17b6289847613964a3bb0e915cb2a39cd660ac11d8f420bc311",
    sourceRelease: "a3ae1c063a3227caf7dc542aa96d87e27f6af5c2", observedAt: "2026-10-10T01:12:27.844Z", status: 400
  });
  let uploadCalls = 0;
  let committedResponseLost = false;
  const persist = createCoverSharePointPersistence({ graph, fetchImpl: async (url, options) => {
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
  const result = await persist.persist(binding, row.bytes);
  const saved = await store.writeJson("review-deliveries", digest(binding), { ...result, synthetic: true }, { immutable: true });
  const replay = await persist.persist(binding, row.bytes);
  if (digest(replay) !== digest(result)) throw new Error("COVER_REVIEW_REPLAY_CONFLICT");
  return { proofClass: "CONTROLLED_SYNTHETIC_SHAREPOINT_NOT_TITLE_ACCEPTANCE", receiptReference: saved.reference,
    ...saved.value, replayVerified: true, uploadCalls, committedResponseLost,
    paidProviderInvocations: 0, businessStageEffects: 0, authorCommunications: 0 };
}
module.exports = { runCoverSharePointAcceptance, DESTINATION };
