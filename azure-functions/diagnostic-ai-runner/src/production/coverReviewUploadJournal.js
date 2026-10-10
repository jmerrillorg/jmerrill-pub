"use strict";

const { digest } = require("./coverOwnerStore");
const rejected = status => [400, 401, 403, 404, 405, 413, 415, 422].includes(status);

function createCoverReviewUploadJournal(store, legacyProof, transport = "SESSION") {
  if (!["SESSION", "SMALL_CREATE_ONLY"].includes(transport)) throw new Error("COVER_REVIEW_TRANSPORT_INVALID");
  let current;
  async function reserveUploadIntent(intent) {
    const key = digest({ bindingSha256: intent.bindingSha256 });
    let original = await store.read("review-upload-intents", key);
    let created = false;
    if (!original) {
      try { original = await store.writeJson("review-upload-intents", key, { ...intent, reservationVersion: 1, synthetic: store.acceptance === true }); created = true; }
      catch (error) { if ([409, 412].includes(error.statusCode)) return false; throw error; }
    } else if (original.value.bindingSha256 !== intent.bindingSha256 || original.value.checksum !== intent.checksum ||
        original.value.filename !== intent.filename) return false;
    let attempt = await store.read("review-upload-attempts", key);
    if (!created && !attempt && original.sha256 === legacyProof?.intentSha256 && store.acceptance === true &&
        legacyProof?.status === 400 && legacyProof.operation === "UPLOAD_SESSION" && legacyProof.uploadCalls === 0) {
      await store.writeJson("review-upload-failures", digest({ key, attempt: 0 }), {
        kind: "SOURCE_BACKED_PREUPLOAD_REJECTION", bindingSha256: intent.bindingSha256,
        intentSha256: original.sha256, sourceSha256: legacyProof.sourceSha256,
        sourceRelease: legacyProof.sourceRelease, observedAt: legacyProof.observedAt,
        operation: "UPLOAD_SESSION", status: 400, uploadCalls: 0, synthetic: true
      }, { immutable: true });
    } else if (!created && !attempt && original.value.reservationVersion !== 1 && transport !== "SMALL_CREATE_ONLY") return false;
    const number = attempt ? attempt.value.number + 1 : 1;
    if (number > 3) return false;
    if (attempt) {
      const failure = await store.read("review-upload-failures", digest({ key, attempt: attempt.value.number }));
      if (failure?.value.kind !== "PREUPLOAD_REJECTION" || failure.value.attemptSha256 !== attempt.sha256 ||
          !rejected(failure.value.status) || failure.value.uploadCalls !== 0) return false;
    } else if (!created && !legacyProof && original.value.reservationVersion !== 1 && transport !== "SMALL_CREATE_ONLY") {
      // Existing legacy intents have no trustworthy attempt boundary.
      return false;
    }
    if (transport === "SMALL_CREATE_ONLY") {
      await store.writeJson("review-upload-failures", digest({ key, kind: "CREATE_ONLY_RECOVERY_AUTHORITY" }), {
        kind: "CREATE_ONLY_SAME_TARGET_RECOVERY", originalIntentSha256: original.sha256,
        bindingSha256: intent.bindingSha256, checksum: intent.checksum, filename: intent.filename,
        priorOutcome: "NOT_INFERRED", conflictBehavior: "fail", renameAllowed: false, overwriteAllowed: false,
        synthetic: store.acceptance === true
      }, { immutable: true });
    }
    try {
      current = await store.writeJson("review-upload-attempts", key, { bindingSha256: intent.bindingSha256,
        checksum: intent.checksum, filename: intent.filename, number, transport,
        state: transport === "SESSION" ? "SESSION_RESERVED" : "CREATE_ONLY_RESERVED",
        synthetic: store.acceptance === true }, attempt ? { etag: attempt.etag } : undefined);
      current.key = key;
      return true;
    } catch (error) { if ([409, 412].includes(error.statusCode)) return false; throw error; }
  }
  async function recordUploadSessionFailure(error) {
    if (!current || error.operation !== "UPLOAD_SESSION" || !rejected(error.statusCode)) return;
    await store.writeJson("review-upload-failures", digest({ key: current.key, attempt: current.value.number }), {
      kind: "PREUPLOAD_REJECTION", attemptSha256: current.sha256, bindingSha256: current.value.bindingSha256,
      operation: error.operation, status: error.statusCode, providerCode: error.providerCode || "UNKNOWN",
      category: error.category || "UNCLASSIFIED", requestId: error.requestId || null,
      uploadCalls: 0, synthetic: store.acceptance === true
    }, { immutable: true });
  }
  return { reserveUploadIntent, recordUploadSessionFailure };
}
module.exports = { createCoverReviewUploadJournal };
