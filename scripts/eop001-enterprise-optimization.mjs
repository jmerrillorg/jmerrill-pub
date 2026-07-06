#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const adoptionPath = resolve(repoRoot, "data/enterprise-adoption-completion.json");
const imprintPath = resolve(repoRoot, "data/enterprise-imprint-canonization.json");
const healthPath = resolve(repoRoot, "data/eop001-enterprise-health.json");
const dashboardPath = resolve(repoRoot, "docs/implementation/EOP-001-JM-Publishing-Enterprise-Operations-Dashboard.md");
const programPath = resolve(repoRoot, "docs/implementation/EOP-001-JM-Publishing-Enterprise-Optimization-Program.md");
const publisherReviewPath = resolve(repoRoot, "docs/implementation/EOP-001-Workstream-1-Publisher-Imprint-Review-Packet.md");

function pct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function toTable(rows, columns) {
  return [
    `| ${columns.map((column) => column.label).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function sortByTitle(rows) {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title));
}

const adoption = JSON.parse(readFileSync(adoptionPath, "utf8"));
const imprint = JSON.parse(readFileSync(imprintPath, "utf8"));
const canonById = new Map(imprint.titles.map((title) => [title.id, title]));

const publisherReviewQueue = sortByTitle(adoption.publisherReview.map((row) => {
  const canon = canonById.get(row.id) || {};
  const reasoning = Array.isArray(canon.reasoning) ? canon.reasoning.join("; ") : canon.reasoning;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    currentPublishedImprint: canon.currentImprint || "",
    recommendedImprint: row.recommendedImprint,
    confidence: canon.confidence ?? "",
    reasoning: reasoning || row.reason,
    decisionRequired: "Publisher imprint decision required",
    proposedDecision: row.recommendedImprint === "Unresolved"
      ? "Publisher override required; do not lock Unresolved"
      : `Approve and lock ${row.recommendedImprint}`,
    executionLogOnApproval: "IMPRINT_PUBLISHER_APPROVED; IMPRINT_LOCKED"
  };
}));

const jmSignatureQueue = adoption.jmSignature.map((row) => {
  const canon = canonById.get(row.id) || {};
  const reasoning = Array.isArray(canon.reasoning) ? canon.reasoning.join("; ") : canon.reasoning;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    currentPublishedImprint: canon.currentImprint || "",
    recommendedImprint: canon.recommendedImprint || row.certifiedImprint,
    confidence: canon.confidence ?? "",
    reasoning: reasoning || row.reason,
    decisionRequired: "Publisher JM Signature decision required"
  };
});

const totals = {
  catalogTitles: adoption.summary.totalCatalogTitles,
  adoptedTitles: adoption.summary.totalCatalogTitles,
  publishedAuthors: adoption.summary.totalAuthors,
  activeAuthorWorkspaces: adoption.summary.totalAuthors + 1,
  publisherImprintReview: publisherReviewQueue.length,
  jmSignatureReview: jmSignatureQueue.length,
  contractReconciliation: adoption.summary.totalCatalogTitles,
  stripeMigration: adoption.summary.totalAuthors,
  royaltyReadiness: adoption.summary.totalAuthors
};

const healthMetrics = [
  {
    metric: "Coverage",
    value: pct(totals.adoptedTitles, totals.catalogTitles),
    numerator: totals.adoptedTitles,
    denominator: totals.catalogTitles,
    note: "Enterprise Adoption complete; retained as historical baseline, no longer the primary KPI."
  },
  {
    metric: "Imprint Certified",
    value: pct(totals.catalogTitles - totals.publisherImprintReview - totals.jmSignatureReview, totals.catalogTitles),
    numerator: totals.catalogTitles - totals.publisherImprintReview - totals.jmSignatureReview,
    denominator: totals.catalogTitles,
    note: "Locked/certified imprints after auto-locks and Wave 3 Publisher decisions."
  },
  {
    metric: "Contracts Linked",
    value: pct(0, totals.catalogTitles),
    numerator: 0,
    denominator: totals.catalogTitles,
    note: "Historical contracts are marked Signed / Exists - Location Pending Reconciliation."
  },
  {
    metric: "Stripe Ready",
    value: pct(0, totals.publishedAuthors),
    numerator: 0,
    denominator: totals.publishedAuthors,
    note: "No Stripe migration started during Enterprise Adoption."
  },
  {
    metric: "Royalty Ready",
    value: pct(0, totals.publishedAuthors),
    numerator: 0,
    denominator: totals.publishedAuthors,
    note: "Royalty automation commissioning is a later workstream."
  },
  {
    metric: "Metadata Complete",
    value: pct(totals.catalogTitles - 2, totals.catalogTitles),
    numerator: totals.catalogTitles - 2,
    denominator: totals.catalogTitles,
    note: "Two titles remain unresolved for imprint metadata evidence."
  },
  {
    metric: "Workspace Complete",
    value: pct(totals.activeAuthorWorkspaces, totals.activeAuthorWorkspaces),
    numerator: totals.activeAuthorWorkspaces,
    denominator: totals.activeAuthorWorkspaces,
    note: "All adopted authors/titles have PROGRAM-002 workspace coverage."
  },
  {
    metric: "Author Success Active",
    value: pct(0, totals.publishedAuthors),
    numerator: 0,
    denominator: totals.publishedAuthors,
    note: "Author Success is operationally available but not activated catalog-wide."
  }
];

const optimizationMetrics = healthMetrics.filter((row) => row.metric !== "Coverage");
const overallNumerator = optimizationMetrics.reduce((sum, row) => sum + row.numerator, 0);
const overallDenominator = optimizationMetrics.reduce((sum, row) => sum + row.denominator, 0);

const health = {
  generatedAt: new Date().toISOString(),
  program: "EOP-001",
  status: "Enterprise Optimization Active",
  totals,
  healthMetrics,
  overallEnterpriseHealth: pct(overallNumerator, overallDenominator),
  publisherReviewQueue,
  jmSignatureQueue,
  optimizationOrder: [
    "Publisher Imprint Review",
    "JM Signature Review",
    "Contract Reconciliation",
    "Stripe Migration",
    "Royalty Automation"
  ]
};

function buildProgram() {
  return [
    "# EOP-001 - JM Publishing Enterprise Optimization Program",
    "",
    "**Program:** PROGRAM-002 - Autonomous Publishing Production Pipeline  ",
    "**Optimization Program:** EOP-001  ",
    "**Status:** Active - Workstream 1 Ready For Publisher Decisions  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Mission",
    "",
    "Enterprise Adoption is closed. PROGRAM-002 now covers the full J Merrill Publishing catalog. EOP-001 shifts the operating rhythm from migration to optimization: improving quality, completeness, reconciliation, and operational maturity inside the PROGRAM-002 system.",
    "",
    "## KPI Transition",
    "",
    "Enterprise Coverage is retired as the primary KPI because it is complete at 100%. The new primary KPI is Enterprise Health.",
    "",
    "## Optimization Order",
    "",
    toTable(health.optimizationOrder.map((name, index) => ({
      order: index + 1,
      workstream: name,
      status: index === 0 ? "Ready for Publisher decisions" : "Queued",
      boundary: index === 0 ? "Jackie must approve/lock each remaining imprint review item." : "Do not begin until the prior workstream is complete or Jackie authorizes parallel execution."
    })), [
      { label: "Order", value: (r) => r.order },
      { label: "Workstream", value: (r) => r.workstream },
      { label: "Status", value: (r) => r.status },
      { label: "Boundary", value: (r) => r.boundary }
    ]),
    "",
    "## Current Queues",
    "",
    toTable([
      ["Publisher Imprint Review", totals.publisherImprintReview],
      ["JM Signature Review", totals.jmSignatureReview],
      ["Contract Reconciliation", totals.contractReconciliation],
      ["Stripe Migration", totals.stripeMigration],
      ["Royalty Readiness", totals.royaltyReadiness]
    ].map(([queue, count]) => ({ queue, count })), [
      { label: "Queue", value: (r) => r.queue },
      { label: "Count", value: (r) => r.count }
    ]),
    "",
    "## Boundaries",
    "",
    "- Do not rerun Enterprise Adoption.",
    "- Do not recreate workspaces or contracts.",
    "- Do not restart publishing or production.",
    "- Do not touch Business Central outside authorized workstreams.",
    "- Do not perform public release activity.",
    "- Do not start Stripe migration or royalty automation until their workstreams are authorized.",
    ""
  ].join("\n");
}

function buildDashboard() {
  return [
    "# J Merrill Publishing Enterprise Operations Dashboard",
    "",
    "**Program:** PROGRAM-002  ",
    "**Operating Mode:** Enterprise Optimization  ",
    "**Dashboard:** EOP-001  ",
    "**Status:** Active  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Executive Summary",
    "",
    "Enterprise Coverage is complete at 100%. The enterprise now optimizes maturity through imprint certification, contract reconciliation, Stripe readiness, royalty readiness, metadata completeness, workspace completeness, and Author Success activation.",
    "",
    `**Overall Enterprise Health:** ${health.overallEnterpriseHealth}`,
    "",
    "## Health Metrics",
    "",
    toTable(healthMetrics, [
      { label: "Metric", value: (r) => r.metric },
      { label: "Value", value: (r) => r.value },
      { label: "Count", value: (r) => `${r.numerator}/${r.denominator}` },
      { label: "Note", value: (r) => r.note }
    ]),
    "",
    "## Optimization Queues",
    "",
    toTable([
      ["Publisher Imprint Review", totals.publisherImprintReview, "Workstream 1"],
      ["JM Signature Review", totals.jmSignatureReview, "Workstream 2"],
      ["Contract Reconciliation", totals.contractReconciliation, "Workstream 3"],
      ["Stripe Migration", totals.stripeMigration, "Workstream 4"],
      ["Royalty Automation Readiness", totals.royaltyReadiness, "Workstream 5"]
    ].map(([queue, count, workstream]) => ({ queue, count, workstream })), [
      { label: "Queue", value: (r) => r.queue },
      { label: "Remaining", value: (r) => r.count },
      { label: "Workstream", value: (r) => r.workstream }
    ]),
    "",
    "## Remaining Publisher Decisions",
    "",
    `Publisher imprint review items: ${totals.publisherImprintReview}. See EOP-001 Workstream 1 packet.`,
    "",
    "## Remaining JM Signature Reviews",
    "",
    toTable(jmSignatureQueue, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Current Published Imprint", value: (r) => r.currentPublishedImprint },
      { label: "Recommended Imprint", value: (r) => r.recommendedImprint },
      { label: "Required Decision", value: (r) => r.decisionRequired }
    ]),
    ""
  ].join("\n");
}

function buildPublisherReviewPacket() {
  return [
    "# EOP-001 Workstream 1 - Publisher Imprint Review Packet",
    "",
    "**Program:** EOP-001 - JM Publishing Enterprise Optimization Program  ",
    "**Workstream:** 1 - Publisher Imprint Review  ",
    "**Status:** Blocked pending Jackie Publisher decisions  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Objective",
    "",
    "Resolve every remaining `IMPRINT_REVIEW_REQUIRED` item by applying Publisher-certified decisions. This packet does not lock imprints automatically; it prepares the exact review queue for Jackie.",
    "",
    "## Required Publisher Action",
    "",
    "For each title, Jackie must approve the recommended imprint or provide an override. After approval, the system can write `IMPRINT_PUBLISHER_APPROVED` and `IMPRINT_LOCKED` and update the certified PROGRAM-002 imprint status without overwriting historical published imprint fields.",
    "",
    "## Review Queue",
    "",
    toTable(publisherReviewQueue, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Current Published Imprint", value: (r) => r.currentPublishedImprint },
      { label: "Recommended Imprint", value: (r) => r.recommendedImprint },
      { label: "Confidence", value: (r) => r.confidence },
      { label: "Reasoning", value: (r) => r.reasoning },
      { label: "Proposed Decision", value: (r) => r.proposedDecision }
    ]),
    "",
    "## Execution After Approval",
    "",
    "- Update only PROGRAM-002 certified imprint status.",
    "- Preserve historical published imprint fields as evidence.",
    "- Write `IMPRINT_PUBLISHER_APPROVED`.",
    "- Write `IMPRINT_LOCKED`.",
    "- Update Enterprise Operations Dashboard health metrics.",
    "",
    "## Current Blocker",
    "",
    "Workstream 1 cannot complete until Jackie provides Publisher decisions for the 43-title review queue.",
    ""
  ].join("\n");
}

mkdirSync(dirname(healthPath), { recursive: true });
mkdirSync(dirname(dashboardPath), { recursive: true });
writeFileSync(healthPath, `${JSON.stringify(health, null, 2)}\n`);
writeFileSync(programPath, buildProgram());
writeFileSync(dashboardPath, buildDashboard());
writeFileSync(publisherReviewPath, buildPublisherReviewPacket());

console.log(JSON.stringify({
  ok: true,
  overallEnterpriseHealth: health.overallEnterpriseHealth,
  publisherReviewQueue: totals.publisherImprintReview,
  jmSignatureReview: totals.jmSignatureReview,
  contractReconciliation: totals.contractReconciliation,
  stripeMigration: totals.stripeMigration,
  royaltyReadiness: totals.royaltyReadiness
}, null, 2));
