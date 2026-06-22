"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const { generateSimplifiedPackageAddendumDocument } = require("../src/agreement/simplifiedPackageAddendumGenerator");
const { generateSimplifiedAudiobookSectionDocument } = require("../src/agreement/simplifiedAudiobookSectionGenerator");
const { generatePaymentDisclosureDocument } = require("../src/agreement/paymentDisclosureDocumentGenerator");
const { buildPackageSpecificAddendumSections } = require("../src/agreement/packageSpecificAddendumContent");
const { buildSimplifiedAudiobookSection } = require("../src/agreement/simplifiedAudiobookContent");
const { isValidDocxBuffer } = require("../src/agreement/agreementDocxValidator");

async function extractText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  return (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
}

describe("generateSimplifiedPackageAddendumDocument", () => {
  test("produces a valid docx containing only the Professional Package content", async () => {
    const content = buildPackageSpecificAddendumSections("JMP-PKG-PRO");
    const buffer = await generateSimplifiedPackageAddendumDocument({
      title: "Establishing Glory: The Library", authorLegalName: "Jackie Smith Jr.", contractDate: "2026-06-22",
      packageAddendumContent: content, packageFeeFormatted: "$4,500.00", paymentDisclosureSummaryLine: "8 payments of $585.00 each (total $4,680.00)."
    });
    assert.equal((await isValidDocxBuffer(buffer)).valid, true);

    const text = await extractText(buffer);
    assert.ok(text.includes("Professional Publishing Package"));
    assert.ok(text.includes("$4,500.00"));
    assert.ok(text.includes("Paperback"));
    assert.ok(text.includes("8 payments of $585.00"));
  });

  test("never mentions Starter, Signature, or Children's package names", async () => {
    const content = buildPackageSpecificAddendumSections("JMP-PKG-PRO");
    const buffer = await generateSimplifiedPackageAddendumDocument({
      title: "x", authorLegalName: "y", contractDate: "2026-06-22",
      packageAddendumContent: content, packageFeeFormatted: "$4,500.00", paymentDisclosureSummaryLine: "x"
    });
    const text = await extractText(buffer);
    assert.ok(!text.includes("Starter Publishing Package"));
    assert.ok(!text.includes("Signature Publishing Partnership"));
    assert.ok(!text.includes("Children's Book Publishing Package"));
  });
});

describe("generateSimplifiedAudiobookSectionDocument", () => {
  test("produces a valid docx with AI narration as the primary election and no $699 fee mentioned as owed", async () => {
    const section = buildSimplifiedAudiobookSection({ packageCode: "JMP-PKG-PRO", audiobookIncludedInPackage: true });
    const buffer = await generateSimplifiedAudiobookSectionDocument({
      title: "x", authorLegalName: "y", contractDate: "2026-06-22", audiobookSection: section
    });
    assert.equal((await isValidDocxBuffer(buffer)).valid, true);
    const text = await extractText(buffer);
    assert.ok(text.includes("AI narration"));
    assert.ok(text.includes("no additional $699 fee"));
    assert.ok(text.includes("Professional human narration"));
  });
});

describe("generatePaymentDisclosureDocument", () => {
  test("produces a valid docx stating all six required disclosure points", async () => {
    const buffer = await generatePaymentDisclosureDocument({
      title: "x", authorLegalName: "y", contractDate: "2026-06-22",
      paymentSchedule: { installments: 8, perInstallmentUsd: 585.00, totalUsd: 4680.00 }
    });
    assert.equal((await isValidDocxBuffer(buffer)).valid, true);
    const text = await extractText(buffer);
    assert.ok(text.includes("8 payments"));
    assert.ok(text.includes("$585.00"));
    assert.ok(text.includes("$4,680.00"));
    assert.ok(text.includes("Stripe"));
    assert.ok(text.toLowerCase().includes("first payment establishes"));
    assert.ok(text.toLowerCase().includes("same calendar day"));
    assert.ok(text.toLowerCase().includes("release date is not locked"));
  });
});
