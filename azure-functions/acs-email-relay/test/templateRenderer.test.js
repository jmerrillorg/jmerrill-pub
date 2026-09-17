"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { getBrandProfile } = require("../src/templates/brandRegistry");
const { findTemplate, listTemplates } = require("../src/templates/templateRegistry");
const { RENDERER_VERSION, renderTemplate } = require("../src/templates/renderer");

function fixture(overrides = {}) {
  return {
    authorFirstName: "Avery",
    projectTitle: "A New Beginning",
    packageName: "Starter Publishing Package",
    baseAmountCents: 199900,
    options: [
      { code: "FULL_PAY", paymentAmountsCents: [199900], totalBeforeTaxCents: 199900 },
      { code: "2_PAY", paymentAmountsCents: [103948, 103948], totalBeforeTaxCents: 207896 },
      { code: "4_PAY", paymentAmountsCents: [51974, 51974, 51974, 51974], totalBeforeTaxCents: 207896 }
    ],
    ...overrides
  };
}

function render(data = fixture()) {
  return renderTemplate({
    templateId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
    templateVersion: "1.0.0",
    data
  });
}

test("loads the exact active Publishing design authority and checksum-pinned logo", () => {
  const result = getBrandProfile("PUBLISHING");
  assert.equal(result.ok, true);
  assert.equal(result.profile.tokenVersion, "PUBLISHING-EMAIL-v1.0.0");
  assert.equal(result.profile.logo.assetId, "JMP-LOGO-PRIMARY-v1");
  assert.equal(result.profile.logo.sha256, "3e695f57e3496d3af439fca2e6c29c3f6931dfd98104d30935c0ace144c312e6");
  assert.match(result.profile.logo.url, /^https:\/\/www\.jmerrill\.pub\/email-assets\//);
  const assetPath = path.resolve(__dirname, "../../../public/email-assets/jmp-logo-primary-v1-3e695f57e3496d3a.jpg");
  const checksum = createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex");
  assert.equal(checksum, result.profile.logo.sha256);
});

test("Publishing text, table header, CTA, links, and footer meet WCAG AA contrast", () => {
  const profile = getBrandProfile("PUBLISHING").profile;
  const contrast = (foreground, background) => {
    const luminance = (hex) => {
      const channels = hex.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255)
        .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  assert.ok(contrast(profile.tokens["text.primary"], profile.tokens["surface.background"]) >= 4.5);
  assert.ok(contrast(profile.tokens["text.muted"], profile.tokens["surface.background"]) >= 4.5);
  assert.ok(contrast("#FFFFFF", profile.tokens["brand.secondary"]) >= 4.5);
  assert.ok(contrast(profile.tokens["action.primary.text"], profile.tokens["action.primary.background"]) >= 4.5);
  assert.ok(contrast(profile.tokens["link.default"], profile.tokens["surface.background"]) >= 4.5);
  assert.ok(contrast(profile.tokens["footer.text"], profile.tokens["footer.background"]) >= 4.5);
});

test("registry activates only copy-authorized Publishing payment election v1", () => {
  const active = listTemplates().filter((entry) => entry.status === "ACTIVE");
  assert.equal(active.length, 1);
  assert.equal(active[0].templateId, "PUBLISHING.PAYMENT_ELECTION_REQUIRED");
  assert.equal(findTemplate("PUBLISHING.PAYMENT_REQUEST_READY", "1.0.0").status, "BLOCKED_BY_COPY_AUTHORITY");
});

test("renders deterministic subject, preheader, HTML, plain text, and metadata", () => {
  const first = render();
  const second = render();
  assert.equal(first.ok, true);
  assert.equal(first.value.subject, "Your Publishing Payment Options for A New Beginning");
  assert.equal(first.value.preheader, "Choose the payment option that works best for you.");
  assert.match(first.value.html, /^<!doctype html>/);
  assert.match(first.value.html, /alt="J Merrill Publishing"/);
  assert.match(first.value.html, /class="email-container"/);
  assert.match(first.value.html, /max-width:600px/);
  assert.match(first.value.html, /meta name="color-scheme"/);
  assert.match(first.value.plainText, /Reply with|Please reply/);
  assert.match(first.value.plainText, /https?:\/\//, "plain text footer should retain a usable public destination");
  assert.equal(first.value.metadata.rendererVersion, RENDERER_VERSION);
  assert.equal(first.value.metadata.htmlSha256, second.value.metadata.htmlSha256);
  assert.equal(first.value.metadata.plainTextSha256, second.value.metadata.plainTextSha256);
});

test("escapes all supplied text and rejects raw HTML, header injection, and extra data", () => {
  assert.equal(render(fixture({ authorFirstName: "<b>Avery</b>" })).reason, "TEMPLATE_DATA_AUTHORFIRSTNAME_INVALID");
  assert.equal(render(fixture({ projectTitle: "Title\r\nBcc: outside@example.com" })).reason, "TEMPLATE_DATA_PROJECTTITLE_INVALID");
  assert.equal(render(fixture({ unsafeHtml: "<script>alert(1)</script>" })).reason, "TEMPLATE_DATA_UNEXPECTED_FIELD");
  assert.equal(render(fixture({ paymentUrl: "https://attacker.example/pay" })).reason, "TEMPLATE_DATA_UNEXPECTED_FIELD");
});

test("rejects invalid option codes, counts, amounts, and totals", () => {
  assert.equal(render(fixture({ options: [{ code: "WIRE", paymentAmountsCents: [100], totalBeforeTaxCents: 100 }] })).reason, "TEMPLATE_DATA_OPTION_CODE_INVALID");
  assert.equal(render(fixture({ options: [{ code: "2_PAY", paymentAmountsCents: [100], totalBeforeTaxCents: 100 }] })).reason, "TEMPLATE_DATA_OPTION_PAYMENT_COUNT_MISMATCH");
  assert.equal(render(fixture({ options: [{ code: "FULL_PAY", paymentAmountsCents: [100], totalBeforeTaxCents: 99 }] })).reason, "TEMPLATE_DATA_OPTION_TOTAL_MISMATCH");
});

test("unknown, inactive, and mismatched template versions fail closed", () => {
  assert.equal(renderTemplate({ templateId: "PUBLISHING.UNKNOWN", templateVersion: "1.0.0", data: fixture() }).reason, "TEMPLATE_VERSION_UNKNOWN");
  assert.equal(renderTemplate({ templateId: "PUBLISHING.PAYMENT_REQUEST_READY", templateVersion: "1.0.0", data: fixture() }).reason, "TEMPLATE_NOT_ACTIVE");
  assert.equal(renderTemplate({ templateId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED", templateVersion: "2.0.0", data: fixture() }).reason, "TEMPLATE_VERSION_UNKNOWN");
});
