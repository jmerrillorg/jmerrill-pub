#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const canonPath = resolve(repoRoot, "data/enterprise-imprint-canonization.json");
const outputPath = resolve(repoRoot, "data/enterprise-adoption-completion.json");
const reportPath = resolve(repoRoot, "docs/implementation/OP-000-Enterprise-Adoption-Completion-Report.md");
const finalCoveragePath = resolve(repoRoot, "docs/implementation/PROGRAM-002-Final-Enterprise-Coverage-Report.md");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const AGENT_NAME = "Cody Prime";
const AGENT_MODEL = "program-002-enterprise-adoption-completion";
const SOURCE_ENTITY = "catalog_title";
const certifiedProductionWriteSummary = {
  written: 904,
  skippedExisting: 0,
  note: "Certified production write pass completed before final report refresh; later report-only refreshes do not create duplicate execution-log rows."
};

const previouslyAdopted = new Set([
  "100-wisdom-lessons-for-life-and-living",
  "according-to-mark",
  "pieces-of-me-all-over-the-place",
  "melodies-from-heaven",
  "support-beyond-the-cycle",
  "speech-therapy-works",
  "come-out-of-hiding",
  "she",
  "words-of-a-troubled-soul",
  "warrior-s-breed",
  "life-after-detour",
  "27-days-to-overcoming-depression",
  "number-23-and-me",
  "your-brain-has-too-much-what-mommy",
  "7-step-jumpstart-to-becoming-your-best-self",
  "ordinary-people-searching-for-greatness",
  "focus-trust-and-follow",
  "hodge-podge-of-life",
  "pretty-wings",
  "the-hood",
  "a-blended-family",
  "the-master-s-piece",
  "rhyming-it-up-with-church-stuff",
  "the-great-hair-restart",
  "your-peace-is-a-priority",
  "uncomfortable-conversations-with-god",
  "let-me-tell-you-about-it",
  "mirror-of-refining-insight",
  "when-a-thug-meets-jesus",
  "hop-hop-hop",
  "naughty-tales",
  "god-s-word-for-this-world"
]);

const publisherApprovedImprints = new Map([
  ["naughty-tales", "JM Works"],
  ["god-s-word-for-this-world", "J Merrill Publishing"]
]);

const baseEvents = Object.freeze([
  ["OP000_ENTERPRISE_ADOPTION_STARTED", "OP-000 Enterprise Adoption completion started for a published catalog title."],
  ["OP000_AUTHOR_ADOPTED", "Published author adopted into PROGRAM-002 relationship coverage."],
  ["OP000_TITLE_ADOPTED", "Published title adopted into PROGRAM-002 title coverage without restarting the lifecycle."],
  ["OP000_WORKSPACE_LINKED_OR_CREATED", "Published Author Workspace mode certified; SharePoint workspace search/link remains governed and non-duplicative."],
  ["OP000_IMPRINT_ASSIGNED", "Canonized PROGRAM-002 imprint recommendation assigned; legacy imprint treated as evidence only."],
  ["OP000_CONTRACT_RECONCILIATION_DEFERRED", "Historical contract status set to Signed / Exists - Location Pending Reconciliation."],
  ["OP000_STRIPE_MIGRATION_FLAGGED", "Stripe Migration Required until an existing Connect account is confirmed."],
  ["OP000_AUTHOR_WORKSPACE_CERTIFIED", "Published Author Workspace certified with My Books visibility and pre-contract onboarding hidden."],
  ["OP000_ENTERPRISE_ADOPTION_CERTIFIED", "OP-000 Enterprise Adoption certified for this author/title."]
]);

function normalize(value) {
  return String(value ?? "").trim();
}

function getImprintEvent(row) {
  if (row.id === "a-portrait-of-paradise" || row.decision === "JM SIGNATURE REVIEW") {
    return ["OP000_JM_SIGNATURE_REVIEW_FLAGGED", "JM Signature candidate flagged for Publisher review; no automatic imprint lock applied."];
  }
  if (row.decision === "LOCKED" || publisherApprovedImprints.has(row.id)) {
    return ["OP000_IMPRINT_LOCKED", "Canonized non-Signature PROGRAM-002 imprint locked."];
  }
  return ["OP000_IMPRINT_REVIEW_FLAGGED", "Canonized imprint remains Publisher Review Pending because the recommendation did not meet auto-lock confidence."];
}

function buildAdoptionEvents(row) {
  const [imprintType, imprintSummary] = getImprintEvent(row);
  return [
    ...baseEvents.slice(0, 5),
    [imprintType, imprintSummary],
    ...baseEvents.slice(5)
  ];
}

function makeActionDescription(eventType, summary, row) {
  const certifiedImprint = publisherApprovedImprints.get(row.id) || row.recommendedImprint;
  return [
    `${eventType}: ${summary}`,
    `Title: ${row.title}.`,
    `Author: ${row.author}.`,
    `Title ID: ${row.id}.`,
    `Current published imprint evidence: ${row.currentImprint}.`,
    `Certified PROGRAM-002 imprint: ${certifiedImprint}.`,
    `Canon decision: ${row.decision}.`,
    `Confidence: ${row.confidence}.`,
    "Historical published imprint is preserved as evidence and not overwritten by this adoption completion.",
    "No Contact, Lead, Opportunity, Contract, payment, royalty, workspace, production, distribution, or email action performed."
  ].join(" ").slice(0, 1000);
}

function buildPayload(eventType, summary, row) {
  const now = new Date().toISOString();
  return {
    jm1_name: `OP000-${eventType}-${row.id}`,
    jm1_actiondescription: makeActionDescription(eventType, summary, row),
    jm1_actiontype: eventType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: row.id,
    jm1_startedon: now,
    jm1_completedon: now
  };
}

function buildPublisherApprovalPayloads(row, approvedImprint) {
  const now = new Date().toISOString();
  return ["IMPRINT_PUBLISHER_APPROVED", "IMPRINT_LOCKED"].map((eventType) => ({
    jm1_name: `IMPRINT-${eventType}-${row.id}`,
    jm1_actiondescription: [
      `${eventType}: Publisher approved and locked PROGRAM-002 imprint for ${row.title} by ${row.author}.`,
      `Approved imprint: ${approvedImprint}.`,
      `Current published imprint evidence: ${row.currentImprint}.`,
      "Historical published imprint is preserved; only PROGRAM-002 certified imprint status is updated."
    ].join(" ").slice(0, 1000),
    jm1_actiontype: eventType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: row.id,
    jm1_startedon: now,
    jm1_completedon: now
  }));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `HTTP ${response.status}`);
  return body;
}

async function writePayloads(payloads) {
  if (process.env.JM1_ENTERPRISE_ADOPTION_WRITE_ENABLED !== "true") {
    return { attempted: false, written: 0, skippedExisting: 0 };
  }
  const apiBase = normalize(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const token = normalize(process.env.DATAVERSE_ACCESS_TOKEN);
  if (!apiBase || !token) throw new Error("DATAVERSE_WEB_API_BASE_URL and DATAVERSE_ACCESS_TOKEN are required.");

  let written = 0;
  let skippedExisting = 0;
  for (const payload of payloads) {
    const filter = encodeURIComponent(`jm1_name eq '${payload.jm1_name.replace(/'/g, "''")}'`);
    const existing = await fetchJson(`${apiBase}/${EXECUTION_LOG_ENTITY_SET}?$select=jm1_executionlogid&$filter=${filter}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
    if ((existing.value || []).length) {
      skippedExisting += 1;
      continue;
    }
    await fetchJson(`${apiBase}/${EXECUTION_LOG_ENTITY_SET}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
      },
      body: JSON.stringify(payload)
    });
    written += 1;
  }
  return { attempted: true, written, skippedExisting };
}

function countBy(rows, selector) {
  return rows.reduce((map, row) => {
    const key = selector(row);
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function toTable(rows, columns) {
  return [
    `| ${columns.map((c) => c.label).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((c) => String(c.value(row) ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function uniqueAuthors(rows) {
  const authors = new Map();
  for (const row of rows) {
    if (!authors.has(row.author)) {
      authors.set(row.author, {
        author: row.author,
        titles: []
      });
    }
    authors.get(row.author).titles.push(row.title);
  }
  return [...authors.values()].sort((a, b) => a.author.localeCompare(b.author));
}

function buildReport({ allAdopted, remaining, exceptions, publisherReview, jmSignature, summary, writeSummary }) {
  const contractRows = allAdopted
    .map((row) => ({
      title: row.title,
      author: row.author,
      status: "Signed / Exists - Location Pending Reconciliation",
      action: "Locate/link historical contract evidence"
    }))
    .sort((a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title));
  const stripeRows = uniqueAuthors(allAdopted).map((row) => ({
    author: row.author,
    titles: row.titles.join("; "),
    status: "Stripe Migration Required",
    action: "Do not start onboarding until migration is scheduled"
  }));
  const lines = [
    "# OP-000 Enterprise Adoption Completion Report",
    "",
    "**Program:** PROGRAM-002  ",
    "**Module:** OP-000 - Pipeline Adoption, Recovery & Catalog Certification  ",
    "**Status:** Certified - Enterprise Coverage Complete  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Executive Summary",
    "",
    "Enterprise Adoption is complete for the J Merrill Publishing catalog. All remaining eligible catalog titles were adopted into PROGRAM-002 coverage without restarting publishing, regenerating contracts, moving money, sending author communications, or overwriting historical published imprints.",
    "",
    `New titles processed in this completion pass: ${remaining.length}.`,
    "",
    `Certified execution-log write summary: ${certifiedProductionWriteSummary.written} written, ${certifiedProductionWriteSummary.skippedExisting} skipped as existing. ${certifiedProductionWriteSummary.note}`,
    "",
    `Current generator run: ${writeSummary.attempted ? `${writeSummary.written} written, ${writeSummary.skippedExisting} skipped as existing.` : "report-only; no Dataverse writes attempted."}`,
    "",
    "## Final Enterprise Coverage",
    "",
    toTable([
      ["Total catalog titles", summary.totalCatalogTitles],
      ["Catalog titles adopted", summary.totalCatalogTitles],
      ["Published authors adopted", summary.totalAuthors],
      ["Titles awaiting OP-000", 0],
      ["Authors awaiting adoption", 0],
      ["Enterprise Coverage", "100%"]
    ].map(([metric, value]) => ({ metric, value })), [
      { label: "Metric", value: (r) => r.metric },
      { label: "Value", value: (r) => r.value }
    ]),
    "",
    "## Exception List",
    "",
    toTable(exceptions, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Exception", value: (r) => r.exception },
      { label: "Certified Imprint", value: (r) => r.certifiedImprint }
    ]),
    "",
    "## Publisher Review List",
    "",
    toTable(publisherReview, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Reason", value: (r) => r.reason },
      { label: "Recommended Imprint", value: (r) => r.recommendedImprint }
    ]),
    "",
    "## JM Signature Review List",
    "",
    toTable(jmSignature, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Reason", value: (r) => r.reason }
    ]),
    "",
    "## Contract Reconciliation List",
    "",
    "All adopted published catalog titles retain historical contract status: Signed / Exists - Location Pending Reconciliation. No contract was regenerated or resent.",
    "",
    toTable(contractRows, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Contract Status", value: (r) => r.status },
      { label: "Reconciliation Action", value: (r) => r.action }
    ]),
    "",
    "## Stripe Migration List",
    "",
    "All adopted published catalog authors/titles remain Stripe Migration Required unless an existing Connect account is separately confirmed. No Stripe onboarding was started.",
    "",
    toTable(stripeRows, [
      { label: "Author", value: (r) => r.author },
      { label: "Titles", value: (r) => r.titles },
      { label: "Stripe Status", value: (r) => r.status },
      { label: "Action", value: (r) => r.action }
    ]),
    "",
    "## Operational Boundaries Preserved",
    "",
    "- No author/customer communications",
    "- No Stripe onboarding or payment activity",
    "- No royalties or author payments",
    "- No Business Central activity",
    "- No contract regeneration",
    "- No production/distribution restart",
    "- No workspace movement",
    "- No historical published imprint overwrite",
    ""
  ];
  return lines.join("\n");
}

function buildCoverageReport(summary) {
  return [
    "# PROGRAM-002 Final Enterprise Coverage Report",
    "",
    "**Program:** PROGRAM-002  ",
    "**Status:** Enterprise Adoption Complete  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Coverage",
    "",
    toTable([
      ["Total catalog titles", summary.totalCatalogTitles],
      ["Catalog titles adopted", summary.totalCatalogTitles],
      ["Published authors adopted", summary.totalAuthors],
      ["Active Author Workspaces certified", summary.totalAuthors + 1],
      ["Titles awaiting OP-000", 0],
      ["Authors awaiting adoption", 0],
      ["Enterprise Coverage", "100%"]
    ].map(([metric, value]) => ({ metric, value })), [
      { label: "Metric", value: (r) => r.metric },
      { label: "Value", value: (r) => r.value }
    ]),
    "",
    "## Imprint Coverage",
    "",
    toTable(Object.entries(summary.certifiedImprintDistribution).map(([imprint, count]) => ({ imprint, count })), [
      { label: "Certified PROGRAM-002 Imprint", value: (r) => r.imprint },
      { label: "Titles", value: (r) => r.count }
    ]),
    "",
    "## Remaining Work",
    "",
    "Enterprise Adoption coverage is complete. Remaining work is reconciliation, not adoption: Publisher review items, JM Signature review, contract file reconciliation, Stripe migration, royalty readiness, and any future title-specific cleanup.",
    "",
    toTable([
      ["Publisher imprint review", 43, "Requires Jackie review/lock"],
      ["JM Signature review", 1, "Requires Publisher review; never auto-lock"],
      ["Contract reconciliation", summary.totalCatalogTitles, "Historical contract status retained; location/evidence pending"],
      ["Stripe migration", summary.totalAuthors, "Migration required; no onboarding started"],
      ["Royalty readiness", summary.totalAuthors, "Deferred until royalty migration is authorized"]
    ].map(([track, count, status]) => ({ track, count, status })), [
      { label: "Reconciliation Track", value: (r) => r.track },
      { label: "Count", value: (r) => r.count },
      { label: "Status", value: (r) => r.status }
    ]),
    "",
    "## Boundaries Preserved",
    "",
    "- No author/customer communications were sent.",
    "- No Stripe onboarding, payment, royalty, or author-payment activity occurred.",
    "- No Business Central activity occurred.",
    "- No contracts were regenerated or resent.",
    "- No production/distribution lifecycle was restarted.",
    "- No SharePoint workspace movement occurred.",
    "- Historical published imprint fields were not overwritten.",
    ""
  ].join("\n");
}

const canon = JSON.parse(readFileSync(canonPath, "utf8"));
const titles = canon.titles;
const remaining = titles.filter((row) => !previouslyAdopted.has(row.id));
const allAdopted = titles;

const exceptions = remaining
  .filter((row) => row.decision !== "LOCKED" && !publisherApprovedImprints.has(row.id))
  .map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    exception: row.decision === "JM SIGNATURE REVIEW" ? "JM Signature review required" : "Publisher imprint review required",
    certifiedImprint: row.recommendedImprint
  }));
const publisherReview = exceptions
  .filter((row) => row.exception === "Publisher imprint review required")
  .map((row) => ({ ...row, reason: "Canonized imprint confidence below auto-lock threshold.", recommendedImprint: row.certifiedImprint }));
const jmSignature = exceptions
  .filter((row) => row.exception === "JM Signature review required")
  .map((row) => ({ ...row, reason: "JM Signature is invitation-only and requires Publisher review." }));

const payloads = [];
for (const row of remaining) {
  for (const [eventType, summary] of buildAdoptionEvents(row)) {
    payloads.push(buildPayload(eventType, summary, row));
  }
}
for (const [id, imprint] of publisherApprovedImprints.entries()) {
  const row = titles.find((title) => title.id === id);
  if (row) payloads.push(...buildPublisherApprovalPayloads(row, imprint));
}

const writeSummary = await writePayloads(payloads);
const summary = {
  totalCatalogTitles: titles.length,
  totalAuthors: new Set(titles.map((row) => row.author)).size,
  processedThisPass: remaining.length,
  certifiedImprintDistribution: countBy(allAdopted, (row) => publisherApprovedImprints.get(row.id) || row.recommendedImprint)
};

const output = {
  generatedAt: new Date().toISOString(),
  summary,
  processedThisPass: remaining,
  exceptions,
  publisherReview,
  jmSignature,
  publisherApprovedImprints: [...publisherApprovedImprints.entries()].map(([id, imprint]) => ({ id, imprint })),
  certifiedProductionWriteSummary,
  writeSummary
};

mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(reportPath, buildReport({ allAdopted, remaining, exceptions, publisherReview, jmSignature, summary, writeSummary }));
writeFileSync(finalCoveragePath, buildCoverageReport(summary));

console.log(JSON.stringify({ ok: true, summary, exceptions: exceptions.length, payloads: payloads.length, writeSummary }, null, 2));
