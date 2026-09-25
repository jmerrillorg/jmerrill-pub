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

test("Graph notAllowed on a locked personal site is non-readable", async () => {
  assert.equal(await probePersonalSites([site], {
    getToken: async () => "synthetic-token",
    fetchFn: async () => ({ status: 423, json: async () => ({ error: { code: "notAllowed" } }) }),
  }), true);
});

test("other locked responses do not certify personal-site denial", async () => {
  await assert.rejects(probePersonalSites([site], {
    getToken: async () => "synthetic-token",
    fetchFn: async () => ({ status: 423, json: async () => ({ error: { code: "other" } }) }),
  }), /SHADOW_PERSONAL_SITE_NOT_DENIED_423/);
});

for (const status of [200, 404, 423, 429, 500]) {
  test(`personal-site response ${status} blocks shadow inference`, async () => {
    await assert.rejects(probePersonalSites([site], {
      getToken: async () => "synthetic-token",
      fetchFn: async () => ({ status }),
    }));
  });
}
