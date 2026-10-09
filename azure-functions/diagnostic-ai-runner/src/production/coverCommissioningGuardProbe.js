"use strict";

const { generateConceptSet } = require("./coverDesignRuntime");
const { createCoverTitleAuthorityReader } = require("./coverTitleAuthorityReader");

// Fixed local fixtures only; no provider, storage or real title is reachable.
async function verifyCoverCommissioningGuards() {
  const titleId = "11111111-1111-4111-8111-111111111111";
  const forbidden = async () => { throw new Error("COVER_PROBE_UNEXPECTED_EFFECT"); };
  const disabled = await generateConceptSet(titleId, { loadTitleAuthority: forbidden,
    reserveExecution: forbidden, generateImage: forbidden });
  if (disabled.code !== "COVER_GENERATION_DISABLED") throw new Error("COVER_PROBE_DEFAULT_ENABLEMENT_FAILED");
  let reads = 0;
  const reader = createCoverTitleAuthorityReader({
    apiBase: "https://fixture.crm.dynamics.com/api/data/v9.2",
    resourceUrl: "https://fixture.crm.dynamics.com",
    credential: { getToken: async () => ({ token: "fixed-noncredential-fixture" }) },
    loadCommissioningScope: async () => ({ titleId, enabled: true, version: "fixture-v1", authorityReference: "FIXTURE_ONLY",
      mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }),
    identityClient: { first: forbidden },
    fetch: async () => {
      reads += 1;
      if (reads !== 1) return forbidden();
      return { ok: true, json: async () => ({ jm1pub_titleid: titleId,
        "@odata.etag": 'W/"fixture"', jm1_canonicalauthorcontactreference: `contact:${titleId}` }) };
    }
  });
  let denial;
  try { await reader(titleId); } catch (error) { denial = error.message; }
  if (denial !== "COVER_JACKIE_IDENTITY_DENIED" || reads !== 1) throw new Error("COVER_PROBE_AUTHOR_GUARD_FAILED");
  return { coverGenerationDisabledBeforeEffects: true, coverNonJackieDeniedBeforeEditionReads: true };
}

module.exports = { verifyCoverCommissioningGuards };
