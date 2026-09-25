"use strict";

const { ManagedIdentityCredential } = require("@azure/identity");

async function probePersonalSites(siteIds, { getToken, fetchFn = fetch }) {
  if (!Array.isArray(siteIds) || siteIds.length > 500 ||
      siteIds.some((id) => !/^[a-z0-9.-]+\.sharepoint\.com,[0-9a-f-]{36},[0-9a-f-]{36}$/i.test(id))) {
    throw new Error("SHADOW_PERSONAL_SITE_LIST_INVALID");
  }
  if (!siteIds.length) return true;
  const token = await getToken();
  if (!token) throw new Error("SHADOW_GRAPH_TOKEN_MISSING");
  for (const siteId of siteIds) {
    const response = await fetchFn(`https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}?$select=id`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    if (response.status === 403) continue;
    if (response.status === 423) {
      const body = await response.json().catch(() => null);
      if (body?.error?.code === "notAllowed") continue;
    }
    throw new Error(`SHADOW_PERSONAL_SITE_NOT_DENIED_${response.status}`);
  }
  return true;
}

async function probeWithManagedIdentity(siteIds, clientId) {
  const credential = new ManagedIdentityCredential(clientId);
  return probePersonalSites(siteIds, {
    getToken: async () => (await credential.getToken("https://graph.microsoft.com/.default"))?.token,
  });
}

module.exports = { probePersonalSites, probeWithManagedIdentity };
