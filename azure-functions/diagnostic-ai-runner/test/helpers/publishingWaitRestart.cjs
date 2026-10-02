"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createPublishingWaitStore } = require("../../src/lifecycle/publishingWaitStore");
const { registerPublishingWait, dispatchPublishingWait, reconcilePublishingWaits } = require("../../src/lifecycle/publishingWaitCoordinator");
const { OWNER_BY_TYPE } = require("../../src/lifecycle/publishingWaitResumeAdapter");

const [directory, phase, waitType] = process.argv.slice(2);
const id = n => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
const wait = {
  schemaVersion: 1, waitId: id(1), titleId: id(2), authorId: id(3), engagementId: id(4), lifecycleInstanceId: id(5),
  stageId: id(6), executionId: "restart-fixture", waitType, waitOwner: waitType === "AUTHOR_REVIEW_RESPONSE" ? "AUTHOR" : "PROVIDER",
  waitReason: "Fixture source verified", sourceSystem: "DATAVERSE", sourceRecordId: id(7), sourceEventId: "original-fixture-event",
  createdAt: "2026-10-02T00:00:00.000Z", nextCheckAt: "2026-10-02T00:00:00.000Z", resumeCondition: "fixture-source",
  resumeAction: "DISPATCH_OWNING_RUNTIME", idempotencyKey: `restart-${waitType}`, status: "PENDING"
};
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
const write = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value));
const error = statusCode => Object.assign(new Error("Fixture storage condition"), { statusCode });

// Disk-backed Blob API double: each phase runs in a new process. No Azure/network effects.
const containerClient = {
  async *listBlobsFlat() { if (fs.existsSync(path.join(directory, "blob.json"))) yield { name: `waits/${wait.waitId}.json` }; },
  getBlockBlobClient() {
    const current = () => {
      if (!fs.existsSync(path.join(directory, "blob.json"))) throw error(404);
      return read("blob.json");
    };
    return {
      getProperties: async () => ({ etag: current().etag }),
      downloadToBuffer: async (_start, _length, options) => {
        const value = current();
        if (value.etag !== options.conditions.ifMatch) throw error(412);
        return Buffer.from(JSON.stringify(value.body));
      },
      uploadData: async (bytes, options) => {
        let value = null;
        try { value = current(); } catch (failure) { if (failure.statusCode !== 404) throw failure; }
        if ((options.conditions.ifNoneMatch === "*" && value) ||
            (options.conditions.ifMatch && options.conditions.ifMatch !== value?.etag)) throw error(412);
        write("blob.json", { etag: String(Number(value?.etag || 0) + 1), body: JSON.parse(bytes.toString()) });
      }
    };
  }
};
const owner = OWNER_BY_TYPE[waitType];
const handler = { idempotent: true, async dispatch({ wait: current, idempotencyKey }) {
  if (phase === "fail") throw Object.assign(new Error("Fixture owner unavailable"), { safeCode: "FIXTURE_OWNER_UNAVAILABLE" });
  let receipt;
  if (fs.existsSync(path.join(directory, "owner.json"))) receipt = read("owner.json");
  else {
    receipt = { owner, idempotencyKey, evidenceId: "persisted-owner-evidence", effectCount: 1 };
    write("owner.json", receipt);
  }
  if (receipt.owner !== owner || receipt.idempotencyKey !== idempotencyKey) throw new Error("Wrong owner or business key");
  if (phase === "crash") process.exit(23); // Owner effect committed, worker receipt not yet committed.
  return { accepted: true, executionId: current.executionId, idempotencyKey,
    dispatchResult: "FIXTURE_OWNER_ACCEPTED", businessStateResult: "FIXTURE_RESULT", evidenceId: receipt.evidenceId };
} };
const runtime = {
  store: createPublishingWaitStore({ containerClient }), readAuthority: async () => ({ ...wait }),
  verifyCondition: async () => ({ satisfied: true, evidenceReference: "fixture-canonical-proof" }),
  handlers: { [owner]: handler, UNRELATED_RUNTIME: { idempotent: true, dispatch: async () => { throw new Error("WRONG_OWNER_DISPATCH"); } } },
  now: () => new Date(phase === "crash" ? "2026-10-02T01:00:00Z" : ["recover", "replay"].includes(phase) ? "2026-10-02T02:00:00Z" : "2026-10-02T00:01:00Z"),
  publishReady: async signal => write("signal.json", signal)
};

(async () => {
  let result;
  if (phase === "produce") {
    await registerPublishingWait(wait, runtime);
    result = await reconcilePublishingWaits(runtime);
  } else if (phase === "recover") result = await reconcilePublishingWaits(runtime);
  else {
    try { result = await dispatchPublishingWait(read("signal.json"), runtime); }
    catch (failure) { if (phase !== "fail" || failure.safeCode !== "FIXTURE_OWNER_UNAVAILABLE") throw failure; result = { status: "EXPECTED_FAILURE" }; }
  }
  console.log(JSON.stringify({ result, wait: (await runtime.store.read(wait.waitId)).value }));
})().catch(failure => { console.error(failure); process.exitCode = 1; });
