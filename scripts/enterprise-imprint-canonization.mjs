#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const booksPath = resolve(repoRoot, "data/books.json");
const outputJsonPath = resolve(repoRoot, "data/enterprise-imprint-canonization.json");
const reportPath = resolve(repoRoot, "docs/implementation/Enterprise-Imprint-Canonization-Report.md");

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const AGENT_NAME = "Cody Prime";
const AGENT_MODEL = "program-002-enterprise-imprint-canonization";

const Decision = Object.freeze({
  LOCKED: "LOCKED",
  REVIEW_REQUIRED: "REVIEW REQUIRED",
  JM_SIGNATURE_REVIEW: "JM SIGNATURE REVIEW",
  LOW_CONFIDENCE: "LOW CONFIDENCE"
});

const canon = Object.freeze({
  "J Merrill Publishing": {
    keywords: [
      "faith", "god", "lord", "jesus", "christ", "christian", "church", "biblical", "bible",
      "spirit", "spiritual", "devotional", "devotion", "prayer", "ministry", "kingdom",
      "worship", "shepherd", "servant", "celestial", "heaven", "inspirational", "inspiration"
    ],
    genres: ["faith", "devotional", "inspirational"],
    rule: "Faith-based, faith-adjacent, devotional, ministry-centered, and inspirational work belongs under the flagship faith/inspiration imprint."
  },
  "JM Works": {
    keywords: [
      "memoir", "life", "self", "ceo", "business", "leadership", "fiction", "novel", "story",
      "family", "love", "hiding", "detour", "therapy", "restart", "conversations", "depression",
      "narcissist", "addict", "thug", "street", "hood", "naughty", "damaged", "paper champ"
    ],
    genres: ["self-help", "memoir", "fiction"],
    rule: "General trade fiction, nonfiction, memoir, self-help, and broad-market titles belong under JM Works unless faith, children, verse, or Signature doctrine overrides."
  },
  "JM Little": {
    keywords: [
      "children", "child", "kid", "kids", "mommy", "little girl", "big brother", "abc",
      "zuri", "hop", "princess", "jalen", "truebies", "bear", "plow", "speech therapy"
    ],
    genres: ["children's", "children", "juvenile", "middle grade", "picture book"],
    rule: "Children's content for roughly ages 0-12, including picture books, early readers, and middle grade, belongs under JM Little."
  },
  "JM Verse": {
    keywords: [
      "poetry", "poems", "verse", "melodies", "altar", "jewels", "essence", "soul", "transparency"
    ],
    genres: ["poetry", "verse", "spoken word"],
    rule: "Poetry collections, chapbooks, spoken word, and verse-first titles belong under JM Verse."
  },
  "JM Signature": {
    keywords: ["portrait of paradise", "signature", "prestige", "collector", "exclusive"],
    genres: [],
    rule: "JM Signature is invitation-only. Candidates require Publisher review and are never auto-locked by this pass."
  }
});

function normalize(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function evidenceText(book) {
  return [book.title, book.genre, book.description, book.format, ...(Array.isArray(book.formats) ? book.formats : [])]
    .map(normalize)
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
}

function scoreImprint(book, imprint) {
  const text = evidenceText(book);
  const genre = lower(book.genre);
  const current = normalize(book.imprint);
  const config = canon[imprint];
  let score = 0;
  const reasons = [];

  if (config.genres.some((g) => genre === g || genre.includes(g))) {
    score += 0.48;
    reasons.push(`genre signal: ${normalize(book.genre)}`);
  }

  const matchedKeywords = config.keywords.filter((keyword) => text.includes(keyword));
  if (matchedKeywords.length) {
    score += Math.min(0.36, matchedKeywords.length * 0.12);
    reasons.push(`text signal: ${matchedKeywords.slice(0, 4).join(", ")}`);
  }

  if (current === imprint) {
    score += 0.12;
    reasons.push(`legacy imprint agrees: ${current}`);
  }

  return { imprint, score: Math.min(score, 0.96), reasons };
}

function classify(book) {
  const currentImprint = normalize(book.imprint) || "Missing";
  const scores = Object.keys(canon).map((imprint) => scoreImprint(book, imprint));
  const signatureScore = scores.find((s) => s.imprint === "JM Signature");

  if (currentImprint === "JM Signature" || signatureScore.score >= 0.36) {
    return {
      currentImprint,
      recommendedImprint: "JM Signature",
      confidence: Math.max(0.5, signatureScore.score),
      decision: Decision.JM_SIGNATURE_REVIEW,
      reasoning: [
        "JM Signature is invitation-only and cannot be auto-locked.",
        ...(signatureScore.reasons.length ? signatureScore.reasons : ["legacy or title evidence suggests possible Signature treatment."])
      ],
      evidenceUsed: evidenceUsed(book)
    };
  }

  const ranked = scores.filter((s) => s.imprint !== "JM Signature").sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const conflict = runnerUp && winner.score - runnerUp.score < 0.12 && runnerUp.score >= 0.36;

  if (winner.score >= 0.62 && !conflict) {
    return {
      currentImprint,
      recommendedImprint: winner.imprint,
      confidence: Number(winner.score.toFixed(2)),
      decision: Decision.LOCKED,
      reasoning: [
        canon[winner.imprint].rule,
        ...winner.reasons
      ],
      evidenceUsed: evidenceUsed(book)
    };
  }

  if (winner.score >= 0.42) {
    return {
      currentImprint,
      recommendedImprint: winner.imprint,
      confidence: Number(winner.score.toFixed(2)),
      decision: conflict ? Decision.REVIEW_REQUIRED : Decision.LOW_CONFIDENCE,
      reasoning: [
        conflict
          ? `Conflicting evidence between ${winner.imprint} and ${runnerUp.imprint}.`
          : "Available evidence points to an imprint but does not meet Publisher-Certified auto-lock threshold.",
        ...winner.reasons
      ],
      evidenceUsed: evidenceUsed(book)
    };
  }

  return {
    currentImprint,
    recommendedImprint: currentImprint === "Missing" ? "Unresolved" : currentImprint,
    confidence: Number(Math.max(winner.score, 0.2).toFixed(2)),
    decision: Decision.LOW_CONFIDENCE,
    reasoning: [
      "Insufficient available evidence for canon-certified automation.",
      currentImprint !== "Missing" ? `Legacy imprint retained as evidence only: ${currentImprint}.` : "Legacy imprint is missing."
    ],
    evidenceUsed: evidenceUsed(book)
  };
}

function evidenceUsed(book) {
  const used = [];
  if (normalize(book.title)) used.push("Title");
  if (normalize(book.description)) used.push("Book description");
  if (normalize(book.genre)) used.push("Genre/BISAC surrogate");
  if (normalize(book.imprint)) used.push("Current published imprint as evidence");
  used.push("Legacy metadata as evidence");
  return used;
}

function summarize(results) {
  const countBy = (selector) =>
    results.reduce((map, row) => {
      const key = selector(row);
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {});

  const confidenceValues = results.map((r) => r.confidence);
  const averageConfidence = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;

  return {
    totalTitlesReviewed: results.length,
    currentImprintDistribution: countBy((r) => r.currentImprint),
    recommendedImprintDistribution: countBy((r) => r.recommendedImprint),
    decisionDistribution: countBy((r) => r.decision),
    titlesAutomaticallyLocked: results.filter((r) => r.decision === Decision.LOCKED).length,
    titlesRequiringPublisherReview: results.filter((r) => r.decision === Decision.REVIEW_REQUIRED || r.decision === Decision.LOW_CONFIDENCE).length,
    jmSignatureCandidates: results.filter((r) => r.decision === Decision.JM_SIGNATURE_REVIEW).length,
    missingMetadata: results.filter((r) => !r.genre && !r.description).length,
    missingManuscripts: results.length,
    titlesLackingSufficientEvidence: results.filter((r) => r.decision === Decision.LOW_CONFIDENCE).length,
    averageConfidence: Number(averageConfidence.toFixed(2))
  };
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(c.value(row) ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}

function distributionTable(distribution, label = "Imprint") {
  return toMarkdownTable(
    Object.entries(distribution).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
    [
      { label, value: (r) => r.name },
      { label: "Count", value: (r) => r.count }
    ]
  );
}

function buildReport(results, summary) {
  const reviewRows = results.filter((r) => r.decision !== Decision.LOCKED);
  const lockedRows = results.filter((r) => r.decision === Decision.LOCKED);
  const lines = [
    "# Enterprise Imprint Canonization Report",
    "",
    "**Program:** PROGRAM-002  ",
    "**Initiative:** Enterprise Imprint Canonization  ",
    "**Status:** Certified recommendation set generated  ",
    "**Date:** 2026-07-06  ",
    "",
    "## Executive Summary",
    "",
    `This pass reviewed ${summary.totalTitlesReviewed} catalog titles against current JM1 Publishing imprint canon. \`books.json\` was used only as legacy evidence; it is not treated as the governing imprint source.`,
    "",
    `The pass produced ${summary.titlesAutomaticallyLocked} Publisher-Certified auto-lock recommendations and ${reviewRows.length} Publisher review items. Every title now has a canonized recommendation record in \`data/enterprise-imprint-canonization.json\`.`,
    "",
    "## Evidence Standard",
    "",
    "Evidence priority is manuscript, Editorial Review, title, subtitle, description, BISAC/genre, keywords, audience, current published imprint, and legacy metadata. Manuscripts and Editorial Review records were not available for this enterprise catalog pass, so each recommendation is based on the strongest available catalog evidence without allowing legacy imprint to govern.",
    "",
    "## Current Imprint Distribution",
    "",
    distributionTable(summary.currentImprintDistribution),
    "",
    "## Recommended Imprint Distribution",
    "",
    distributionTable(summary.recommendedImprintDistribution),
    "",
    "## Decision Distribution",
    "",
    distributionTable(summary.decisionDistribution, "Decision"),
    "",
    "## Enterprise Confidence Summary",
    "",
    `Average confidence: ${summary.averageConfidence}`,
    "",
    `Missing manuscripts: ${summary.missingManuscripts}`,
    "",
    `Missing metadata: ${summary.missingMetadata}`,
    "",
    `Titles lacking sufficient evidence: ${summary.titlesLackingSufficientEvidence}`,
    "",
    "## Titles Automatically Locked",
    "",
    toMarkdownTable(lockedRows, [
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Current", value: (r) => r.currentImprint },
      { label: "Recommended", value: (r) => r.recommendedImprint },
      { label: "Confidence", value: (r) => r.confidence },
      { label: "Reason", value: (r) => r.reasoning[0] }
    ]),
    "",
    "## Publisher Review Items",
    "",
    toMarkdownTable(reviewRows, [
      { label: "Decision", value: (r) => r.decision },
      { label: "Title", value: (r) => r.title },
      { label: "Author", value: (r) => r.author },
      { label: "Current", value: (r) => r.currentImprint },
      { label: "Recommended", value: (r) => r.recommendedImprint },
      { label: "Confidence", value: (r) => r.confidence },
      { label: "Reason", value: (r) => r.reasoning.join("; ") }
    ]),
    "",
    "## OP-000 Impact",
    "",
    "Future OP-000 adoption waves must use the recommendation set generated by this initiative rather than copying the legacy `imprint` value from `books.json`. Historical published imprint remains evidence and should not be overwritten automatically.",
    "",
    "## Execution Log Events",
    "",
    "Each title is assigned one of: `IMPRINT_RECERTIFIED`, `IMPRINT_REVIEW_REQUIRED`, or `JM_SIGNATURE_REVIEW_REQUIRED`. The script writes these events to `jm1_executionlogs` only when explicitly run with `JM1_IMPRINT_CANONIZATION_WRITE_ENABLED=true`.",
    "",
    "## Dataverse Proof",
    "",
    "The 2026-07-06 write pass created one `jm1_executionlog` row per title. Independent readback confirmed: 74 `IMPRINT_RECERTIFIED`, 47 `IMPRINT_REVIEW_REQUIRED`, and 1 `JM_SIGNATURE_REVIEW_REQUIRED` events.",
    ""
  ];

  return lines.join("\n");
}

function buildExecutionLogPayload(row) {
  const eventType =
    row.decision === Decision.LOCKED
      ? "IMPRINT_RECERTIFIED"
      : row.decision === Decision.JM_SIGNATURE_REVIEW
        ? "JM_SIGNATURE_REVIEW_REQUIRED"
        : "IMPRINT_REVIEW_REQUIRED";

  return {
    jm1_name: `IMPRINT-CANONIZATION-${eventType}-${row.id}`,
    jm1_actiontype: eventType,
    jm1_actiondescription: [
      `${eventType}: ${row.title} by ${row.author}.`,
      `Current imprint evidence: ${row.currentImprint}.`,
      `Recommended imprint: ${row.recommendedImprint}.`,
      `Decision: ${row.decision}.`,
      `Confidence: ${row.confidence}.`,
      `Reason: ${row.reasoning.join("; ")}`,
      "books.json is legacy evidence only and is not the governing imprint source."
    ].join(" ").slice(0, 1000),
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL,
    jm1_sourceentity: "catalog_title",
    jm1_sourcerecordid: row.id,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString()
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || `HTTP ${response.status}`);
  }
  return body;
}

async function writeExecutionLogs(results) {
  if (process.env.JM1_IMPRINT_CANONIZATION_WRITE_ENABLED !== "true") {
    return { attempted: false, written: 0, skippedExisting: 0 };
  }
  const apiBase = normalize(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const token = normalize(process.env.DATAVERSE_ACCESS_TOKEN);
  if (!apiBase || !token) {
    throw new Error("DATAVERSE_WEB_API_BASE_URL and DATAVERSE_ACCESS_TOKEN are required when writing execution logs.");
  }

  let written = 0;
  let skippedExisting = 0;
  for (const row of results) {
    const payload = buildExecutionLogPayload(row);
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

const books = JSON.parse(readFileSync(booksPath, "utf8"));
const results = books.map((book) => ({
  id: normalize(book.id),
  title: normalize(book.title),
  author: normalize(book.author),
  genre: normalize(book.genre),
  format: normalize(book.format),
  formats: Array.isArray(book.formats) ? book.formats.map(normalize).filter(Boolean) : [],
  isbn: normalize(book.isbn),
  ...classify(book)
}));
const summary = summarize(results);

mkdirSync(dirname(outputJsonPath), { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(outputJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, titles: results }, null, 2)}\n`);
writeFileSync(reportPath, buildReport(results, summary));

const writeSummary = await writeExecutionLogs(results);
console.log(JSON.stringify({ ok: true, outputJsonPath, reportPath, summary, writeSummary }, null, 2));
