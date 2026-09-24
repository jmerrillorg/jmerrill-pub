"use strict";

const { ManagedIdentityCredential } = require("@azure/identity");
const { ENTITY, WORKLOAD } = require("./stage0ShadowRuntime");

const ENTITY_SET = "jm1pub_editorialdiagnostics";
const SELECT = [
  "jm1pub_editorialdiagnosticid",
  "jm1_diagnosticexecutionstatus",
  "jm1_manuscriptapprovedfordiagnostic",
  "jm1_manuscriptasseturl",
  "jm1_manuscriptfiletype",
  "modifiedon",
].join(",");

function validateBase(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.pathname.endsWith("/api/data/v9.2")) {
    throw new Error("INVALID_DATAVERSE_ENDPOINT");
  }
  return parsed;
}

class Stage0DataverseSource {
  constructor({ apiBase, resourceUrl, clientId, activationUtc }) {
    this.apiBase = validateBase(apiBase).href.replace(/\/$/, "");
    this.resourceUrl = new URL(resourceUrl).origin;
    if (new URL(apiBase).origin !== this.resourceUrl || !clientId ||
        !Number.isFinite(new Date(activationUtc).getTime())) {
      throw new Error("INVALID_STAGE0_SOURCE_CONFIG");
    }
    this.activationUtc = new Date(activationUtc).toISOString();
    this.credential = new ManagedIdentityCredential(clientId);
  }

  async listNaturalCompletedEvents() {
    const token = await this.credential.getToken(`${this.resourceUrl}/.default`);
    if (!token?.token) throw new Error("DATAVERSE_TOKEN_FAILED");
    const filter = `modifiedon ge ${this.activationUtc} and jm1_manuscriptapprovedfordiagnostic eq true and (jm1_diagnosticexecutionstatus eq 835500002 or jm1_diagnosticexecutionstatus eq 835500004)`;
    const initial = new URL(`${this.apiBase}/${ENTITY_SET}`);
    initial.searchParams.set("$select", SELECT);
    initial.searchParams.set("$filter", filter);
    initial.searchParams.set("$orderby", "modifiedon asc");
    initial.searchParams.set("$top", "100");
    const events = [];
    let next = initial.href;
    while (next) {
      if (new URL(next).origin !== this.resourceUrl) throw new Error("UNTRUSTED_DATAVERSE_NEXT_LINK");
      const response = await fetch(next, {
        headers: { Authorization: `Bearer ${token.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`DATAVERSE_SOURCE_READ_${response.status}`);
      const page = await response.json();
      for (const row of page.value || []) {
        const id = row.jm1pub_editorialdiagnosticid;
        if (!id) throw new Error("SOURCE_EVENT_MISSING_ID");
        events.push({
          sourceEventId: id,
          diagnosticId: id,
          entity: ENTITY,
          workload: WORKLOAD,
          manuscriptApprovedForDiagnostic: row.jm1_manuscriptapprovedfordiagnostic === true,
          manuscriptUrl: row.jm1_manuscriptasseturl || null,
          manuscriptFileType: row.jm1_manuscriptfiletype || null,
          currentOutcome: row.jm1_diagnosticexecutionstatus,
          sourceModifiedAt: row.modifiedon,
        });
      }
      next = page["@odata.nextLink"] || null;
    }
    return events;
  }
}

module.exports = { Stage0DataverseSource, ENTITY_SET, SELECT };
