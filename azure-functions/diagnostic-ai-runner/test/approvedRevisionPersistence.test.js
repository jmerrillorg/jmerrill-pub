"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { persistVariant, verifyReceipt, graphPath } = require("../src/editorial/approvedRevisionPersistence");
const { policy, OWNER } = require("../src/editorial/approvedRevisionAuthority");
const { newestByRole } = require("../src/editorial/editorialPackageHandoffConsumer");
const { materializeAttachments } = require("../src/editorial/editorialCadenceAuthorPackageSender");

function fixture() {
  const files = new Map(), rows = new Map(), counts = { uploads: 0, creates: 0, claims: 0 };
  let pendingName, timeoutUpload = false, timeoutCreate = false;
  const claim = { assertOwned: async () => { counts.claims++; } };
  const deps = {
    graph: async (path, options = {}) => {
      if (path.endsWith("/createUploadSession")) {
        assert.equal(options.method, "POST");
        const body = JSON.parse(options.body);
        assert.equal(body.item["@microsoft.graph.conflictBehavior"], "fail");
        pendingName = body.item.name;
        assert.equal(path, `${graphPath(pendingName)}:/createUploadSession`);
        return { uploadUrl: "https://tenant.sharepoint.com/upload/session" };
      }
      if (path.endsWith("/content")) {
        return [...files.values()].find((f) => path.includes(`/items/${f.item.id}/`)).bytes;
      }
      const name = decodeURIComponent(path.split("/").pop());
      if (!files.has(name)) throw Object.assign(new Error("not found"), { status: 404 });
      return files.get(name).item;
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://tenant.sharepoint.com/upload/session");
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.redirect, "error");
      assert.equal(options.headers["Content-Range"], `bytes 0-${options.body.length - 1}/${options.body.length}`);
      assert.equal(files.has(pendingName), false);
      const item = { id: `item-${files.size}`, name: pendingName, file: {}, webUrl: `https://tenant.sharepoint.com/${encodeURIComponent(pendingName)}`,
        parentReference: { driveId: policy.driveId, path: `/drives/${policy.driveId}/root:${policy.workspacePath}/02_Editorial` } };
      files.set(pendingName, { item, bytes: options.body }); counts.uploads++;
      if (timeoutUpload) { timeoutUpload = false; throw Object.assign(new Error("response lost"), { name: "TimeoutError" }); }
      return { status: 201, json: async () => item };
    },
    client: {
      list: async (set, query) => { assert.equal(set, "jm1pub_editorialartifacts"); return [...rows.values()].filter((r) => query.$filter.includes(r.jm1pub_editorialartifactid)); },
      create: async (set, row) => {
        assert.equal(set, "jm1pub_editorialartifacts");
        assert.equal(rows.has(row.jm1pub_editorialartifactid), false);
        rows.set(row.jm1pub_editorialartifactid, { ...row, _jm1pub_titleid_value: policy.titleId, _jm1pub_editorialstageid_value: policy.stageId });
        counts.creates++;
        if (timeoutCreate) { timeoutCreate = false; throw Object.assign(new Error("response lost"), { status: 503 }); }
      }
    }
  };
  return { deps, claim, files, rows, counts, loseUpload: () => { timeoutUpload = true; }, loseCreate: () => { timeoutCreate = true; } };
}
const receipt = (outputs) => ({ owner: OWNER, taskId: policy.taskId, recipe: policy.recipeVersion,
  sourceArtifactId: policy.sourceArtifactId, sourceSha256: policy.sourceSha256, canonicalSourceItemId: policy.canonicalSourceItemId,
  authorApproved: false, authorDeliveryEligible: false, taskCompleted: false, authorCommunications: 0, stageAdvancements: 0, outputs });

test("lost upload or registration response recovers by exact item and deterministic artifact ID without duplicate writes", async () => {
  for (const lose of ["loseUpload", "loseCreate"]) {
    const h = fixture(); h[lose]();
    await assert.rejects(persistVariant(h.deps, "review", Buffer.from("review"), h.claim));
    const a = await persistVariant(h.deps, "review", Buffer.from("review"), h.claim);
    const b = await persistVariant(h.deps, "review", Buffer.from("review"), h.claim);
    assert.deepEqual(a, b); assert.equal(h.counts.uploads, 1); assert.equal(h.counts.creates, 1);
    const clean = await persistVariant(h.deps, "clean", Buffer.from("clean"), h.claim);
    await verifyReceipt(h.deps, receipt([a, clean]));
    assert.equal(h.counts.uploads, 2); assert.equal(h.counts.creates, 2);
    for (const row of h.rows.values()) {
      assert.equal(row.jm1pub_iscurrentapproved, false); assert.equal(row.jm1pub_visibility, 196650001);
      assert.equal(row.jm1pub_artifactstatus, 196650000);
    }
  }
});

test("conflicting file, duplicate variants and changed registration cannot be treated as successful replay", async () => {
  const h = fixture();
  const review = await persistVariant(h.deps, "review", Buffer.from("review"), h.claim);
  const clean = await persistVariant(h.deps, "clean", Buffer.from("clean"), h.claim);
  await assert.rejects(verifyReceipt(h.deps, receipt([review, review])), /RECEIPT_INVALID/);
  await assert.rejects(persistVariant(h.deps, "review", Buffer.from("different"), h.claim), /BYTES_CONFLICT/);
  h.rows.get(review.artifactId).jm1pub_visibility = 196650000;
  await assert.rejects(verifyReceipt(h.deps, receipt([review, clean])), /REGISTRATION_CONFLICT/);
  assert.equal(h.counts.uploads, 2); assert.equal(h.counts.creates, 2);
});

test("lease loss stops upload; untrusted upload host and transient HTTP status remain classified", async () => {
  const h = fixture();
  await assert.rejects(persistVariant(h.deps, "review", Buffer.from("review"), { assertOwned: async () => { throw new Error("lost"); } }), /lost/);
  assert.equal(h.counts.uploads, 0);
  h.deps.graph = async (path) => {
    if (path.endsWith("createUploadSession")) return { uploadUrl: "https://sharepoint.com.attacker.invalid/upload" };
    throw Object.assign(new Error("missing"), { status: 404 });
  };
  await assert.rejects(persistVariant(h.deps, "review", Buffer.from("review"), h.claim), /HOST_INVALID/);
  const h2 = fixture(); h2.deps.fetchImpl = async () => ({ status: 503 });
  await assert.rejects(persistVariant(h2.deps, "review", Buffer.from("review"), h2.claim), { status: 503, safeCode: "REVISION_UPLOAD_HTTP_503" });
});

test("internal candidates are excluded from package handoff and delivery even if name or visibility drifts", async () => {
  const artifact = { jm1pub_editorialartifactname: "Developmentally Edited Manuscript - Whole", jm1pub_filename: policy.reviewFilename,
    jm1pub_correlationid: `${OWNER}:${policy.taskId}`, jm1pub_visibility: 196650000, jm1pub_iscurrentapproved: true };
  assert.deepEqual(newestByRole([artifact]), []);
  assert.equal(newestByRole([{ ...artifact, jm1pub_correlationid: "unrelated-owner" }]).length, 1);
  await assert.rejects(materializeAttachments({ stageCode: "DEVELOPMENTAL_EDITING_REVIEW", artifacts: [artifact] }), /REQUIRED_ATTACHMENT_MISSING/);
});
