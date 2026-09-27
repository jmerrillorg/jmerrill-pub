"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  renderPublishingServiceCorrespondence,
  renderJm1EnterpriseCommunication,
  signatureForBrand,
} = require("../src/generated/communications/jm1-enterprise-communication-renderer");

const close = "Please reply to the message if you have any questions or need further assistance.";
const oldAction = "Please reply to this email if you need assistance.";
const oldSupport = "Reply to this email and the team will help.";
const input = {
  brand: "publishing", executionAuthority: { authoritySource: "JM1 Governed Bootstrap", renderAllowed: true, communicationAllowed: true },
  templateName: "CLOSE_COPY_PROOF", templateVersion: "1.0", subject: "Your project materials",
  recipientName: "Avery", title: "Your project materials", preheader: "Your project materials",
  reason: "Your requested materials are available.", actionInstruction: oldAction,
  supportNote: oldSupport, presentationStyle: "CORRESPONDENCE", replyOnly: true, operationalNote: "",
};

function assertSingleClose(rendered) {
  for (const body of [rendered.html, rendered.text]) {
    assert.equal(body.split(close).length - 1, 1);
    assert.equal(body.includes(oldAction), false);
    assert.equal(body.includes(oldSupport), false);
  }
}

test("shared legacy Publishing close normalizes once in HTML and plain-text snapshot", () => {
  const rendered = renderJm1EnterpriseCommunication(input);
  assertSingleClose(rendered);
  assert.equal(rendered.text, [input.title, "Good day, Avery,", input.reason, close, signatureForBrand("publishing")].join("\n\n"));
  assert.match(rendered.html, /font-family:Arial,Helvetica,sans-serif/);
  assert.match(rendered.html, /Good day, Avery,/);
});

test("service adapter uses the same single close", () => {
  assertSingleClose(renderPublishingServiceCorrespondence({ subject: input.subject, body: input.reason,
    authorName: "Avery Example", templateName: input.templateName, templateVersion: input.templateVersion }));
});

test("structured templates sharing the same generic close also normalize", () => {
  assertSingleClose(renderJm1EnterpriseCommunication({ ...input, presentationStyle: "STRUCTURED" }));
});

test("transactional calls to action and intentionally distinct support survive unchanged", () => {
  const actionInstruction = "Please select your payment option by replying with your choice.";
  const supportNote = "Please contact us before requesting changes to your payment arrangement.";
  const rendered = renderJm1EnterpriseCommunication({ ...input, actionInstruction, supportNote });
  for (const body of [rendered.html, rendered.text]) {
    assert.ok(body.includes(actionInstruction));
    assert.ok(body.includes(supportNote));
  }
  const sharedSupport = renderJm1EnterpriseCommunication({ ...input, actionInstruction });
  assertSingleClose(sharedSupport);
  assert.ok(sharedSupport.text.includes(actionInstruction));
});

test("other enterprise brands retain their existing defaults", () => {
  const rendered = renderJm1EnterpriseCommunication({ ...input, brand: "corporate" });
  assert.ok(rendered.text.includes(oldAction));
  assert.ok(rendered.text.includes(oldSupport));
});
