"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalAssetUrl, readApprovedInput, SITE_GUID } = require("../../src/shadow/stage0InputAdapter");

const event = {
  sourceEventId: "11111111-1111-4111-8111-111111111111",
  manuscriptApprovedForDiagnostic: true,
  manuscriptUrl: "https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/approved.md?web=1",
};

test("only the Publishing SharePoint asset path is accepted", () => {
  assert.equal(canonicalAssetUrl(event.manuscriptUrl).search, "");
  for (const value of [
    "https://evil.example/sites/publishing/approved.md",
    "https://jmerrillfoundation.sharepoint.com/sites/other/approved.md",
    "https://jmerrillfoundation.sharepoint.com/sites/publishing/_layouts/15/Doc.aspx",
  ]) assert.throws(() => canonicalAssetUrl(value), /DENIED/);
});

test("read adapter returns only bounded excerpt and hash reference", async () => {
  const calls = [];
  const result = await readApprovedInput(event, {
    credential: { getToken: async () => ({ token: "test-token" }) },
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("?$select=")) return new Response(JSON.stringify({
        id: "item-1", parentReference: { siteId: SITE_GUID, driveId: "drive-1" },
      }), { status: 200 });
      return new Response("Approved manuscript sample. ".repeat(800), { status: 200 });
    },
  });
  assert.equal(calls.length, 2);
  assert.ok(result.approvedExcerpt.length <= 12000);
  assert.match(result.sourceReferenceIds[0], /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(result).sort(),
    ["sourceEventId", "approvedExcerpt", "sourceReferenceIds"].sort());
});

test("wrong site fails before content read", async () => {
  let calls = 0;
  await assert.rejects(readApprovedInput(event, {
    credential: { getToken: async () => ({ token: "test-token" }) },
    fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({
        id: "item-1", parentReference: { siteId: "wrong", driveId: "drive-1" },
      }), { status: 200 });
    },
  }), /SITE_MISMATCH/);
  assert.equal(calls, 1);
});
