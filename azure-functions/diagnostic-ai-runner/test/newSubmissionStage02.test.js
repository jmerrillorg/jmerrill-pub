"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const stage = require("../src/lifecycle/newSubmissionStage02"), stage01 = require("../src/lifecycle/newSubmissionStage01"), fresh = require("../src/lifecycle/freshTitleIntake");
const { createHash } = require("node:crypto");
const sha = b => createHash("sha256").update(b).digest("hex");
function fixture() {
  const titleId = Object.keys(fresh.POLICIES)[0], driveId = fresh.driveId, bytes = Buffer.from("# Manuscript\n\nExact author supplied text.\n"), blobs = new Map(), files = new Map();
  const custody = { itemId: "source", driveId, eTag: "original-etag", bytes: bytes.length, sha256: sha(bytes), path: "/01_Pipeline_A-Z/02 - Intake/Fixture/_ORIGINAL/Original.md" };
  const current = { input: { title: { jm1pub_titleid: titleId } }, identity: { contactId: require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID },
    components: [{ custody, bytes, parentReference: { id: "original-folder" }, policy: { name: "Original.md", format: "md", parent: "/01_Pipeline_A-Z/02 - Intake/Fixture/_ORIGINAL" } }] };
  const p = stage.plan(current), rows = [{ jm1_publishingintakeid: p.intakeId, jm1_idempotencykey: p.key,
    jm1_additionalnotes: JSON.stringify({ newSubmissionStage01: stage01.storedBinding(p) }) }], counts = { files: 0, folders: 0, dataverseWrites: 0 };
  blobs.set(p.stage01Output, Buffer.from(JSON.stringify({ intakeId: p.intakeId, fingerprint: p.fingerprint, contactId: p.contactId,
    components: p.components, stageCode: "01_INQUIRY", status: "COMPLETED", stage02: "PENDING", email: { delivered: true } })));
  let folder;
  const deps = { env: { JM1_NEW_SUBMISSION_STAGE02_ENABLED: "true", JM1_NEW_SUBMISSION_STAGE02_TITLE_IDS: titleId,
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    readSource: async () => current, verifyAccess: async () => ({ userId: fresh.RUNTIME_OWNER_ID }),
    request: async (_path, method) => { assert.ok(!method || method === "GET"); return { value: rows }; },
    sourceBytes: async policy => files.get(policy.itemId)?.bytes || bytes,
    graph: async (path, options = {}) => {
      const root = `drives/${encodeURIComponent(driveId)}/items/`;
      if (path === root + "original-folder") return { folder: {}, parentReference: { id: "workspace", driveId, path: `/drives/${driveId}/root:/01_Pipeline_A-Z/02 - Intake/Fixture` } };
      if (options.method === "POST") { counts.folders++; folder = { id: "working", name: `_WORKING_STAGE02_${p.fingerprint.slice(0,16)}`, folder: {}, parentReference: { id: "workspace", driveId } }; return folder; }
      if (path.startsWith(root + "workspace:/")) { if (!folder) throw Object.assign(Error("missing"), { statusCode: 404 }); return folder; }
      if (options.method === "PUT") {
        assert.equal(options.headers["If-None-Match"], "*");
        counts.files++; const name = decodeURIComponent(path.split(":/")[1].split(":/content")[0]);
        const item = { id: `output-${counts.files}`, name, eTag: "working-etag", size: options.body.length, file: {},
          parentReference: { id: "working", driveId, path: `/drives/${driveId}/root:/01_Pipeline_A-Z/02 - Intake/Fixture/${folder.name}` } };
        files.set(item.id, { item, bytes: Buffer.from(options.body) }); return item;
      }
      const name = path.includes(":/") ? decodeURIComponent(path.split(":/")[1]) : null;
      const file = name ? [...files.values()].find(f => f.item.name === name) : files.get(path.slice(root.length));
      if (!file) throw Object.assign(Error("missing"), { statusCode: 404 }); return file.item;
    },
    containerClient: { getProperties: async () => ({}), getBlockBlobClient: path => ({
      getProperties: async () => { if (!blobs.has(path)) throw Object.assign(Error("missing"), { statusCode: 404 }); return { etag: String(blobs.get(path).length) }; },
      downloadToBuffer: async () => blobs.get(path),
      uploadData: async (body, options) => {
        if (options.conditions.ifNoneMatch && blobs.has(path)) throw Object.assign(Error("exists"), { statusCode: 412 });
        if (options.conditions.ifMatch && options.conditions.ifMatch !== String(blobs.get(path)?.length)) throw Object.assign(Error("conflict"), { statusCode: 412 });
        blobs.set(path, Buffer.from(body)); return { etag: String(body.length) };
      }
    }) }
  };
  return { titleId, deps, p, blobs, files, counts, current };
}
test("Stage02 writes working source and SharePoint lineage, preserves Stage01, replays without effects", async () => {
  const x = fixture(), before = Buffer.from(x.blobs.get(x.p.stage01Output));
  const one = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps);
  assert.equal(one.status, 200); assert.equal(one.jsonBody.receipt.status, "COMPLETED");
  assert.equal(one.jsonBody.receipt.outputs[0].role, "EDITORIAL_WORKING_SOURCE"); assert.equal(one.jsonBody.receipt.stage03, "NOT_STARTED");
  assert.equal(one.jsonBody.receipt.authorEmail.required, false); assert.equal(one.jsonBody.communications, 0);
  const two = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps);
  assert.equal(two.status, 200); assert.equal(two.jsonBody.replay, true); assert.equal(two.jsonBody.effects, 0);
  assert.equal(x.counts.files, 2); assert.equal(x.counts.folders, 1); assert.ok(before.equals(x.blobs.get(x.p.stage01Output)));
});
test("Stage02 preflight is read-only, requires exact completed Stage01 and does not resend", async () => {
  const x = fixture(); const r = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_PREFLIGHT" }, x.deps);
  assert.equal(r.status, 200); assert.equal(x.counts.files, 0); assert.equal(x.counts.folders, 0);
  x.blobs.delete(x.p.stage01Output);
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps)).jsonBody.code, "COMMISSIONING_STAGE02_STAGE01_REQUIRED");
});
test("Stage02 rejects forged source arguments, disabled scope and broad worker enablement", async () => {
  const x = fixture();
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE", source: "forged" }, x.deps)).status, 400);
  x.deps.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED = "true";
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps)).status, 403);
  x.deps.env.JM1_PUBLISHING_STAGE_RUNTIME_ENABLED = "false"; x.deps.env.JM1_NEW_SUBMISSION_STAGE02_ENABLED = "false";
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps)).status, 403);
});
test("working-source drift holds replay without overwriting or re-creating originals", async () => {
  const x = fixture(); await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps);
  x.files.get("output-1").bytes = Buffer.from("corrupted");
  const r = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_02_EXECUTE" }, x.deps);
  assert.equal(r.status, 409); assert.equal(r.jsonBody.code, "COMMISSIONING_STAGE02_OUTPUT_BYTES_CHANGED"); assert.equal(x.counts.files, 2);
});
test("content QA rejects empty or checksum-changed source and preserves DOCX bytes", async () => {
  const x = fixture(), part = x.current.components[0]; part.bytes = Buffer.from("wrong");
  await assert.rejects(stage.qa(part), /SOURCE_BYTES_CHANGED/);
  const { Document, Packer, Paragraph } = require("docx");
  const bytes = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Exact supplied words")] }] }));
  const q = await stage.qa({ bytes, custody: { bytes: bytes.length, sha256: sha(bytes) }, policy: { format: "docx" } });
  assert.equal(q.words, 3); assert.equal(q.editorialChanges, false);
});
test("Stage02 contract agrees with canonical input/output, persistence and no approval requirement", () => {
  const fs = require("node:fs"), path = require("node:path");
  const canon = fs.readFileSync(path.resolve(__dirname, "../../../lib/publishing/lifecycle/editorial-system-contract.ts"), "utf8");
  const line = canon.split("\n").find(s => s.trim().startsWith("'02_INTAKE': stageContract"));
  assert.ok(line.includes("'PUBLISHING.INTAKE_NORMALIZATION', true, ['EDITORIAL_WORKING_SOURCE'], qa, ['EDITORIAL_WORKING_SOURCE'], 'NONE'"));
  assert.ok(line.includes("['ORIGINAL_AUTHOR_SUBMISSION']"));
});
test("SharePoint custom-property promotion permits no manuscript or formatting changes", async () => {
  const Zip = require("jszip"), source = new Zip();
  source.file("word/document.xml", "<document>Exact words</document>");
  source.file("word/styles.xml", "<styles>Exact formatting</styles>");
  source.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="document"/></Types>');
  source.file("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="document" Target="word/document.xml"/></Relationships>');
  const bytes = await source.generateAsync({ type: "nodebuffer" });
  const stored = await Zip.loadAsync(bytes);
  stored.file("docProps/custom.xml", "<Properties>SharePoint custody metadata</Properties>");
  stored.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="document"/><Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>');
  stored.file("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="document" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>');
  assert.equal((await stage.verifyTransport(bytes, await stored.generateAsync({ type: "nodebuffer" }), "Source.docx")).rule, "SHAREPOINT_CUSTOM_PROPERTIES_ONLY_V1");
  stored.file("word/styles.xml", "Changed");
  await assert.rejects(stage.verifyTransport(bytes, await stored.generateAsync({ type: "nodebuffer" }), "Source.docx"), /SUBSTANTIVE_PACKAGE_CHANGE/);
  await assert.rejects(stage.verifyTransport(Buffer.from("a"), Buffer.from("b"), "Source.md"), /OUTPUT_BYTES_CONFLICT/);
});
