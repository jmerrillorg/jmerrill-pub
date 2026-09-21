"use strict";

const { DefaultAzureCredential } = require("@azure/identity");

const ENTITY_SET = "jmpv2_agreementrecords";
const SAFE_SELECT = [
  "jmpv2_agreementrecordid",
  "jmpv2_agreementkey",
  "jmpv2_paymentledgerstatus",
  "jmpv2_currentbalancecents",
  "jmpv2_pastduebalancecents",
  "jmpv2_nextduedate",
  "jmpv2_balanceversion",
  "jmpv2_stripecustomerid",
].join(",");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function paymentTimerMode(env = process.env) {
  const mode = clean(env.JMP_PUBLISHING_PAYMENT_TIMER_MODE).toUpperCase() || "DISABLED";
  return ["DISABLED", "DRY_RUN", "ENABLED"].includes(mode) ? mode : "INVALID";
}

function isNoonEastern(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value) === 12;
}

function selectPaymentCandidates(rows, asOf) {
  const asOfTime = Date.parse(asOf);
  if (!Number.isFinite(asOfTime)) throw new Error("PAYMENT_TIMER_DATE_INVALID");
  return (rows || [])
    .filter((row) => clean(row.jmpv2_paymentledgerstatus) === "ACTIVE")
    .filter((row) => Number(row.jmpv2_currentbalancecents) > 0)
    .filter((row) => Date.parse(row.jmpv2_nextduedate) <= asOfTime)
    .filter((row) => clean(row.jmpv2_stripecustomerid))
    .sort((left, right) => String(left.jmpv2_nextduedate).localeCompare(String(right.jmpv2_nextduedate)));
}

async function readDueAgreements(options = {}) {
  const resourceUrl = clean(options.resourceUrl || process.env.DATAVERSE_RESOURCE_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
  const webApi = clean(options.webApi || process.env.DATAVERSE_WEB_API_BASE_URL || `${resourceUrl}/api/data/v9.2`).replace(/\/$/, "");
  const credential = options.credential || new DefaultAzureCredential();
  const token = await credential.getToken(`${resourceUrl}/.default`);
  if (!token?.token) throw new Error("DATAVERSE_PAYMENT_TIMER_TOKEN_MISSING");
  const asOf = options.asOf || new Date().toISOString();
  const filter = `jmpv2_paymentledgerstatus eq 'ACTIVE' and jmpv2_nextduedate le ${asOf}`;
  const url = new URL(`${webApi}/${ENTITY_SET}`);
  url.searchParams.set("$select", SAFE_SELECT);
  url.searchParams.set("$filter", filter);
  url.searchParams.set("$orderby", "jmpv2_nextduedate asc");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token.token}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`DATAVERSE_PAYMENT_TIMER_READ_FAILED_${response.status}`);
  const body = await response.json();
  return Array.isArray(body.value) ? body.value : [];
}

async function runPublishingPaymentTimer(options = {}) {
  const mode = options.mode || paymentTimerMode(options.env);
  const asOf = options.asOf || new Date().toISOString();
  if (mode === "INVALID") return { status: "ATTENTION_REQUIRED", code: "PAYMENT_TIMER_MODE_INVALID", mode, financialEffects: 0 };
  if (mode === "DISABLED") return { status: "DISABLED", code: "PAYMENT_TIMER_DISABLED", mode, candidates: 0, financialEffects: 0 };
  const rows = options.rows || await (options.readDueAgreements || readDueAgreements)({ ...options, asOf });
  const candidates = selectPaymentCandidates(rows, asOf);
  if (mode === "DRY_RUN") {
    return {
      status: "PASS",
      code: candidates.length ? "DRY_RUN_CANDIDATES_FOUND" : "DRY_RUN_NO_CANDIDATES",
      mode,
      candidates: candidates.length,
      candidateAgreementIds: candidates.map((row) => row.jmpv2_agreementrecordid),
      financialEffects: 0,
    };
  }
  const gate = clean((options.env || process.env).JMP_AGREEMENT_PAYMENT_GATE_ENABLED).toLowerCase() === "true";
  if (!gate || typeof options.execute !== "function") {
    return { status: "ATTENTION_REQUIRED", code: "PAYMENT_COLLECTION_NOT_AUTHORIZED", mode, candidates: candidates.length, financialEffects: 0 };
  }
  return options.execute({ asOf, candidates });
}

module.exports = {
  isNoonEastern,
  paymentTimerMode,
  readDueAgreements,
  runPublishingPaymentTimer,
  selectPaymentCandidates,
};
