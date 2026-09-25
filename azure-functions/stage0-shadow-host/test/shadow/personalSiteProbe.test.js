"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { probePersonalSites } = require("../../src/shadow/personalSiteProbe");

const site = "tenant-my.sharepoint.com,00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002";

test("personal site must deny the runtime token", async () => {
  assert.equal(await probePersonalSites([site], {
    getToken: async () => "synthetic-token",
    fetchFn: async () => ({ status: 403 }),
  }), true);
});

for (const status of [200, 404, 423, 429, 500]) {
  test(`personal-site response ${status} blocks shadow inference`, async () => {
    await assert.rejects(probePersonalSites([site], {
      getToken: async () => "synthetic-token",
      fetchFn: async () => ({ status }),
    }));
  });
}
