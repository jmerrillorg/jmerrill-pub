"use strict";

/**
 * Governed recovery worker for Rule #1 publishing intake orchestration.
 *
 * Flow A/contact routing and Flow C/Stage 0 handoff may complete after the
 * public /join route has already returned 201. This worker is the bounded
 * automatic caller that picks up ready intakes and invokes the authenticated
 * Publisher Operating Center autostart route. It never reads manuscript
 * content, never logs secrets, and relies on the route's idempotent safeguards.
 */

const { app } = require("@azure/functions");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");

const INTAKE_ENTITY_SET = "jm1_publishingintakes";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const SUCCESS_ACTION = "PUBLISHING_INTAKE_ORCHESTRATION_DISPATCHED";

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isEnabled() {
  return safeTrim(process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_RECOVERY_ENABLED).toLowerCase() === "true";
}

function getLookbackHours() {
  const value = Number.parseInt(process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_LOOKBACK_HOURS || "48", 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 168) : 48;
}

function getBatchSize() {
  const value = Number.parseInt(process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_BATCH_SIZE || "5", 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20) : 5;
}

function normalizeApiBase() {
  return safeTrim(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
}

async function dataverseFetch(path, options = {}) {
  const apiBase = normalizeApiBase();
  const resourceUrl = safeTrim(process.env.DATAVERSE_RESOURCE_URL);
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }

  const token = await getDataverseToken(resourceUrl);
  const response = await fetch(`${apiBase}/${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse request failed: HTTP ${response.status}`), {
      safeCode: "DATAVERSE_REQUEST_FAILED",
      httpStatus: response.status
    });
  }

  return response.json();
}

async function listReadyIntakes() {
  const cutoff = new Date(Date.now() - getLookbackHours() * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    "$select": [
      "jm1_publishingintakeid",
      "jm1_intakereferencecode",
      "jm1_projecttitle",
      "jm1_manuscriptreceived",
      "jm1_stage0handoffstatus",
      "_jm1_stage0diagnostic_value",
      "_jm1_linkedcontact_value",
      "createdon",
      "modifiedon"
    ].join(","),
    "$filter": [
      "jm1_intakechannel eq 'INT-PUB-005 /join'",
      "_jm1_linkedcontact_value ne null",
      "jm1_manuscriptreceived eq true",
      "jm1_stage0handoffcreated eq true",
      "jm1_stage0handoffstatus eq 835500002",
      `createdon ge ${cutoff}`
    ].join(" and "),
    "$orderby": "createdon desc",
    "$top": String(getBatchSize())
  });

  const result = await dataverseFetch(`${INTAKE_ENTITY_SET}?${params.toString()}`);
  return Array.isArray(result.value) ? result.value : [];
}

async function hasDispatchSuccessLog(intakeId) {
  const params = new URLSearchParams({
    "$select": "jm1_executionlogid",
    "$filter": `jm1_actiontype eq '${SUCCESS_ACTION}' and jm1_sourcerecordid eq '${intakeId}'`,
    "$top": "1"
  });

  const result = await dataverseFetch(`${EXECUTION_LOG_ENTITY_SET}?${params.toString()}`);
  return Array.isArray(result.value) && result.value.length > 0;
}

async function callAutostart(intake) {
  const url = safeTrim(process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_URL);
  const workerKey = safeTrim(process.env.JM1_ORCHESTRATION_WORKER_KEY);
  if (!url || !workerKey) {
    return { ok: false, status: 0, code: "AUTOSTART_CONFIG_MISSING" };
  }

  const intakeId = safeTrim(intake.jm1_publishingintakeid);
  const reference = safeTrim(intake.jm1_intakereferencecode) || intakeId;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-jm1-orchestration-worker-key": workerKey
    },
    body: JSON.stringify({
      intakeId,
      correlationId: `AUTO-RECOVERY-${reference}-${Date.now()}`
    })
  });

  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && body.status === "dispatched",
    status: response.status,
    code: body.status || body.blocker || body.code || "unknown",
    diagnosticId: body.diagnosticId || null,
    runControlStatus: body.runControlStatus || null,
    authorRecommendationSent: body.authorRecommendationSent === true
  };
}

async function runPublishingIntakeAutostartRecovery(timer, context) {
  if (!isEnabled()) {
    context.info("Publishing intake autostart recovery skipped: disabled.");
    return;
  }

  let intakes;
  try {
    intakes = await listReadyIntakes();
  } catch (error) {
    context.error(`Publishing intake autostart recovery list failed: ${error.safeCode || error.message}`);
    return;
  }

  let attempted = 0;
  let dispatched = 0;
  let skipped = 0;

  for (const intake of intakes) {
    const intakeId = safeTrim(intake.jm1_publishingintakeid);
    const reference = safeTrim(intake.jm1_intakereferencecode) || intakeId;
    if (!intakeId) {
      skipped += 1;
      continue;
    }

    try {
      if (await hasDispatchSuccessLog(intakeId)) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const result = await callAutostart(intake);
      if (result.ok) dispatched += 1;
      context.info(
        `Publishing intake autostart recovery attempted; reference=${reference}; status=${result.status}; code=${result.code}; diagnosticId=${result.diagnosticId || "none"}; sent=${result.authorRecommendationSent === true ? "yes" : "no"}`
      );
    } catch (error) {
      context.warn(`Publishing intake autostart recovery failed for reference=${reference}; reason=${error.safeCode || error.name || "unknown"}`);
    }
  }

  context.info(`Publishing intake autostart recovery complete; scanned=${intakes.length}; attempted=${attempted}; dispatched=${dispatched}; skipped=${skipped}.`);
}

app.timer("run-publishing-intake-autostart-recovery", {
  schedule: process.env.JM1_PUBLISHING_INTAKE_AUTOSTART_CRON || "0 */2 * * * *",
  handler: runPublishingIntakeAutostartRecovery
});

module.exports = {
  runPublishingIntakeAutostartRecovery,
  listReadyIntakes,
  hasDispatchSuccessLog,
  callAutostart
};
