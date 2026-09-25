"use strict";

const { ManagedIdentityCredential } = require("@azure/identity");
const { BlobBudgetLedger } = require("./blobBudgetLedger");
const { Stage0DataverseSource } = require("./stage0DataverseSource");

const TARGET_SITE = "jmerrillfoundation.sharepoint.com,35fb0d98-bc68-4250-9d0d-8c07d68e4024,10208ad5-0028-48f0-9ffa-717812924835";
const PROBE_DRIVE = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
const PROBE_FILE = "01DF3SEQLUWUKM5W34E5E3ZGWYZLLGRGXR";

async function graphRead(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GRAPH_${response.status}`);
  return response.json();
}

async function probe(config) {
  const clientId = config.clientId;
  const credential = new ManagedIdentityCredential(clientId);
  const states = {};
  const run = async (name, action) => {
    try {
      await action();
      states[name] = "PASS";
    } catch (error) {
      states[name] = `FAIL_${String(error.message || error).replace(/[^A-Z0-9_]/gi, "_").slice(0, 60)}`;
    }
  };

  let graphToken;
  await run("targetSiteRead", async () => {
    graphToken = (await credential.getToken("https://graph.microsoft.com/.default"))?.token;
    if (!graphToken) throw new Error("TOKEN_MISSING");
    const site = await graphRead(`https://graph.microsoft.com/v1.0/sites/${TARGET_SITE}?$select=id`, graphToken);
    if (site.id !== TARGET_SITE) throw new Error("SITE_ID_MISMATCH");
  });
  if (graphToken) {
    await run("targetLibraryList", async () => {
      const drives = await graphRead(`https://graph.microsoft.com/v1.0/sites/${TARGET_SITE}/drives?$select=id,name`, graphToken);
      if (!Array.isArray(drives.value) || !drives.value.some((drive) => drive.id === PROBE_DRIVE)) {
        throw new Error("PROBE_DRIVE_MISSING");
      }
    });
    await run("targetFileMetadataRead", async () => {
      const item = await graphRead(`https://graph.microsoft.com/v1.0/drives/${PROBE_DRIVE}/items/${PROBE_FILE}?$select=id,size,file`, graphToken);
      if (item.id !== PROBE_FILE || !item.file || item.size < 1 || item.size > 1024) {
        throw new Error("PROBE_FILE_MISMATCH");
      }
    });
    await run("targetFileContentRead", async () => {
      const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${PROBE_DRIVE}/items/${PROBE_FILE}/content`, {
        headers: { Authorization: `Bearer ${graphToken}`, Range: "bytes=0-1023" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`GRAPH_FILE_${response.status}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength < 1 || bytes.byteLength > 1024) throw new Error("PROBE_FILE_SIZE_INVALID");
    });
    await run("unrelatedSiteReadDenied", async () => {
      const response = await fetch("https://graph.microsoft.com/v1.0/sites/root?$select=id", {
        headers: { Authorization: `Bearer ${graphToken}` }, signal: AbortSignal.timeout(15000),
      });
      if (response.status !== 403) throw new Error(`EXPECTED_403_GOT_${response.status}`);
    });
    await run("tenantWideSiteEnumerationDenied", async () => {
      const response = await fetch("https://graph.microsoft.com/v1.0/sites?search=*", {
        headers: { Authorization: `Bearer ${graphToken}` }, signal: AbortSignal.timeout(15000),
      });
      if (response.status !== 403) throw new Error(`EXPECTED_403_GOT_${response.status}`);
    });
  }
  await run("dataverseRead", async () => {
    const source = new Stage0DataverseSource({
      apiBase: config.dataverseApiBase,
      resourceUrl: config.dataverseResourceUrl,
      clientId,
      activationUtc: "2999-01-01T00:00:00Z",
    });
    await source.listNaturalCompletedEvents();
  });
  await run("modelToken", async () => {
    if (!(await credential.getToken("https://cognitiveservices.azure.com/.default"))?.token) {
      throw new Error("TOKEN_MISSING");
    }
  });
  await run("ledgerWrite", async () => {
    const ledger = new BlobBudgetLedger({
      accountName: config.storageAccount,
      containerName: config.ledgerContainer,
      clientId,
    });
    await ledger.ensureContainer();
  });
  return {
    schemaVersion: "1.0.0",
    observedAt: new Date().toISOString(),
    releaseSha: config.releaseSha || "UNATTRIBUTED",
    routeActive: config.shadowEnabled === true,
    states,
  };
}

module.exports = { probe, TARGET_SITE };
