"use strict";

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

function summarizeFindings(findings) {
  return {
    recurringPatterns: findings.slice(0, 20).map((finding) => finding.conciseFinding),
    contradictions: findings.filter((finding) => /contradict|tension|inconsisten/i.test(finding.conciseFinding)).map((finding) => finding.findingId),
    continuity: findings.filter((finding) => finding.findingCategory === "continuity_issue").map((finding) => finding.findingId),
    pacingMovement: findings.filter((finding) => finding.findingCategory === "pacing_issue").map((finding) => finding.findingId),
    lengthBalance: findings.filter((finding) => finding.findingCategory === "entry_length_outlier").map((finding) => finding.findingId),
    unresolvedPublisherQuestions: findings.flatMap((finding) => finding.unresolvedQuestions || []).filter(Boolean)
  };
}

function buildMonthlySyntheses(segments, ledger) {
  const segmentById = new Map(segments.map((segment) => [segment.segmentId, segment]));
  const byMonth = groupBy(ledger, (finding) => {
    const source = segmentById.get(finding.sourceSegmentIds[0]);
    return source ? source.month : "Unknown";
  });

  return Array.from(byMonth.entries()).map(([month, findings]) => ({
    month,
    findingIds: findings.map((finding) => finding.findingId),
    sourceCoverage: new Set(findings.flatMap((finding) => finding.sourceEntryDates)).size,
    ...summarizeFindings(findings)
  }));
}

function buildQuarterlySyntheses(monthlySyntheses) {
  const quarterMap = {
    January: "Q1",
    February: "Q1",
    March: "Q1",
    April: "Q2",
    May: "Q2",
    June: "Q2",
    July: "Q3",
    August: "Q3",
    September: "Q3",
    October: "Q4",
    November: "Q4",
    December: "Q4"
  };

  const byQuarter = groupBy(monthlySyntheses, (entry) => quarterMap[entry.month] || "Unknown");
  return Array.from(byQuarter.entries()).map(([quarter, months]) => ({
    quarter,
    months: months.map((month) => month.month),
    contributingFindingIds: months.flatMap((month) => month.findingIds),
    sourceCoverage: months.reduce((sum, month) => sum + month.sourceCoverage, 0),
    recurringPatterns: months.flatMap((month) => month.recurringPatterns).slice(0, 30),
    contradictions: months.flatMap((month) => month.contradictions),
    continuity: months.flatMap((month) => month.continuity),
    pacingMovement: months.flatMap((month) => month.pacingMovement),
    lengthBalance: months.flatMap((month) => month.lengthBalance),
    unresolvedPublisherQuestions: months.flatMap((month) => month.unresolvedPublisherQuestions || []).filter(Boolean)
  }));
}

module.exports = {
  buildMonthlySyntheses,
  buildQuarterlySyntheses
};
