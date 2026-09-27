"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { renderPublishingServiceCorrespondence, validateJm1EnterpriseCommunication } = require("../src/generated/communications/jm1-enterprise-communication-renderer");
const hash = value => createHash("sha256").update(value).digest("hex");
const golden = require("./fixtures/publishing-render-golden.json");

test("packaged renderer cannot drift from the canonical TypeScript source", () => {
  for (const runtime of ["acs-email-relay", "diagnostic-ai-runner"]) {
    const directory = path.resolve(__dirname, "../../", runtime, "src/generated/communications");
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "source-manifest.json")));
    for (const [name, expected] of Object.entries(manifest.files)) {
      assert.equal(hash(fs.readFileSync(path.resolve(__dirname, "../../../lib/server", `${name}.ts`))), expected.sourceSha256);
      assert.equal(hash(fs.readFileSync(path.join(directory, `${name}.js`))), expected.runtimeSha256);
    }
  }
});

for (const [name, body] of [
  ["recovery", "We are sorry you had to repeat the process. You do not need to complete the form again."],
  ["developmental", "Your edited manuscript is ready for review. Please reply with your decision."],
  ["payment", "Your existing payment is available at https://invoice.stripe.com/i/test-safe-fixture"],
  ["informational", "We have received your project materials."],
  ["with-cta", "Your materials are available at https://jmerrill.pub/author/onboarding"],
  ["without-cta", "Please reply with your preferred appointment time."],
]) {
  test(`${name} inherits canonical header, signature, multipart content, and deterministic output`, () => {
    const input = { subject: "Your Publishing Project", body: `Good day, Test,\n\n${body}\n\nJ Merrill Publishing`,
      authorName: "Test Author", templateName: `FIXTURE_${name}`, templateVersion: "1.0" };
    const rendered = renderPublishingServiceCorrespondence(input);
    assert.deepEqual(rendered, renderPublishingServiceCorrespondence(input));
    assert.match(rendered.html, /J MERRILL PUBLISHING/);
    assert.match(rendered.html, /max-width:680px/);
    assert.match(rendered.html, /The Publishing Team/);
    assert.match(rendered.html, /Helping Authors Help Themselves/);
    assert.match(rendered.text, /J Merrill Publishing, Inc\./);
    for (const output of [rendered.html, rendered.text]) {
      assert.equal(output.split("Please reply to the message if you have any questions or need further assistance.").length - 1, 1);
      assert.equal(output.includes("Please reply to this email if you need assistance."), false);
      assert.equal(output.includes("Reply to this email and the team will help."), false);
    }
    assert.equal(rendered.metadata.htmlSha256, hash(rendered.html));
    assert.equal(rendered.metadata.textSha256, hash(rendered.text));
    assert.deepEqual({ htmlSha256: rendered.metadata.htmlSha256, textSha256: rendered.metadata.textSha256 }, golden[name]);
    assert.equal((rendered.text.match(/Helping Authors Help Themselves/g) || []).length, 1);
    assert.equal(/<a\b/.test(rendered.html), body.includes("https://"));
  });
}
test("missing brand, signature, or HTML cannot pass presentation validation", () => {
  const input = { subject: "Project Update", body: "Good day, Test,\n\nWe received your material.\n\nJ Merrill Publishing",
    authorName: "Test Author", templateName: "FIXTURE_INFO", templateVersion: "1.0" };
  const output = renderPublishingServiceCorrespondence(input);
  for (const broken of [
    { html: "", text: output.text },
    { html: output.html.replaceAll("J MERRILL PUBLISHING", ""), text: output.text },
    { html: output.html, text: "Raw unbranded message" },
  ]) assert.equal(validateJm1EnterpriseCommunication({ ...broken, brand: "publishing", replyOnly: true }).ok, false);
});
