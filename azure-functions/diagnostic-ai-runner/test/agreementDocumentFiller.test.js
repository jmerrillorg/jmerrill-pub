"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeXmlText, replaceBracketPlaceholder, replaceBlankAfterLabel } = require("../src/agreement/agreementDocumentFiller");

describe("escapeXmlText", () => {
  test("escapes &, <, > but leaves quotes untouched (not needed inside <w:t> text content)", () => {
    assert.equal(escapeXmlText("A & B < C > D"), "A &amp; B &lt; C &gt; D");
  });

  test("leaves plain text untouched", () => {
    assert.equal(escapeXmlText("Establishing Glory: The Library"), "Establishing Glory: The Library");
  });
});

describe("replaceBracketPlaceholder", () => {
  test("replaces a single occurrence inside a <w:t> element", () => {
    const xml = "<w:p><w:r><w:t>[Book Title]</w:t></w:r></w:p>";
    const { xml: updated, occurrences } = replaceBracketPlaceholder(xml, "[Book Title]", "Establishing Glory: The Library");
    assert.equal(occurrences, 1);
    assert.equal(updated, "<w:p><w:r><w:t>Establishing Glory: The Library</w:t></w:r></w:p>");
  });

  test("replaces every occurrence when the placeholder appears multiple times", () => {
    const xml = "<w:t>[Author Legal Name]</w:t>...<w:t>[Author Legal Name]</w:t>";
    const { xml: updated, occurrences } = replaceBracketPlaceholder(xml, "[Author Legal Name]", "Jackie Smith Jr.");
    assert.equal(occurrences, 2);
    assert.equal((updated.match(/Jackie Smith Jr\./g) || []).length, 2);
    assert.ok(!updated.includes("[Author Legal Name]"));
  });

  test("escapes XML special characters in the inserted value", () => {
    const xml = "<w:t>[Book Title]</w:t>";
    const { xml: updated } = replaceBracketPlaceholder(xml, "[Book Title]", "Cats & Dogs <Vol. 1>");
    assert.equal(updated, "<w:t>Cats &amp; Dogs &lt;Vol. 1&gt;</w:t>");
  });

  test("reports zero occurrences and leaves XML unchanged when the placeholder is absent", () => {
    const xml = "<w:t>No placeholder here</w:t>";
    const { xml: updated, occurrences } = replaceBracketPlaceholder(xml, "[Effective Date]", "2026-06-22");
    assert.equal(occurrences, 0);
    assert.equal(updated, xml);
  });

  test("a literal regex special character in the placeholder is treated literally, not as a pattern", () => {
    const xml = "<w:t>[Word Count (approx.)]</w:t>";
    const { xml: updated, occurrences } = replaceBracketPlaceholder(xml, "[Word Count (approx.)]", "48,232");
    assert.equal(occurrences, 1);
    assert.ok(updated.includes("48,232"));
  });
});

describe("replaceBlankAfterLabel", () => {
  test("replaces the underscore blank immediately following the label", () => {
    const xml = '<w:r><w:t xml:space="preserve">Selected Package: </w:t></w:r><w:r><w:t>________________________________________</w:t></w:r>';
    const { xml: updated, found } = replaceBlankAfterLabel(xml, "Selected Package: ", "Professional Publishing Package (JMP-PKG-PRO)");
    assert.equal(found, true);
    assert.ok(updated.includes("Professional Publishing Package (JMP-PKG-PRO)"));
    assert.ok(!updated.includes("________________________________________"));
  });

  test("only replaces the blank tied to the given label occurrence, leaving an identical later blank untouched", () => {
    const xml =
      '<w:t xml:space="preserve">Selected Package: </w:t><w:t>______</w:t>' +
      '<w:t xml:space="preserve">    Imprint: </w:t><w:t>______</w:t>';
    const first = replaceBlankAfterLabel(xml, "Selected Package: ", "Professional Publishing Package (JMP-PKG-PRO)");
    assert.equal(first.found, true);
    const second = replaceBlankAfterLabel(first.xml, "Imprint: ", "J Merrill Publishing", { fromIndex: first.nextIndex });
    assert.equal(second.found, true);
    assert.ok(second.xml.includes("Professional Publishing Package (JMP-PKG-PRO)"));
    assert.ok(second.xml.includes("J Merrill Publishing"));
    assert.ok(!second.xml.includes("______"));
  });

  test("does not touch an earlier identical label/blank pair when fromIndex is past it", () => {
    const xml =
      '<w:t xml:space="preserve">Paperback</w:t><w:t>_______</w:t>' +
      '<w:t xml:space="preserve">Hardcover</w:t><w:t>_______</w:t>';
    const paperback = replaceBlankAfterLabel(xml, "Paperback", "10");
    const hardcover = replaceBlankAfterLabel(paperback.xml, "Hardcover", "2", { fromIndex: paperback.nextIndex });
    assert.ok(hardcover.xml.includes(">10<"));
    assert.ok(hardcover.xml.includes(">2<"));
    assert.equal((hardcover.xml.match(/_______/g) || []).length, 0);
  });

  test("returns found=false and leaves XML unchanged when the label is absent", () => {
    const xml = "<w:t>Nothing relevant here</w:t>";
    const { xml: updated, found } = replaceBlankAfterLabel(xml, "Not Present: ", "value");
    assert.equal(found, false);
    assert.equal(updated, xml);
  });

  test("returns found=false when the label exists but no underscore blank follows it", () => {
    const xml = '<w:t xml:space="preserve">Label: </w:t><w:t>Some real text, not a blank</w:t>';
    const { found } = replaceBlankAfterLabel(xml, "Label: ", "value");
    assert.equal(found, false);
  });

  test("escapes XML special characters in the inserted value", () => {
    const xml = '<w:t xml:space="preserve">Word Count (approx.): </w:t><w:t>_____________</w:t>';
    const { xml: updated } = replaceBlankAfterLabel(xml, "Word Count (approx.): ", "48,232 < 75,000 & confirmed");
    assert.ok(updated.includes("48,232 &lt; 75,000 &amp; confirmed"));
  });

  test("preserves the original <w:t> attributes (e.g. xml:space=\"preserve\") on the replaced element", () => {
    const xml = '<w:t xml:space="preserve">Label: </w:t><w:t xml:space="preserve">_____</w:t>';
    const { xml: updated } = replaceBlankAfterLabel(xml, "Label: ", "value");
    assert.ok(updated.includes('<w:t xml:space="preserve">value</w:t>'));
  });

  test("does not require a minimum of more than 3 underscores by default — a 3-underscore blank still matches", () => {
    const xml = '<w:t xml:space="preserve">Label: </w:t><w:t>___</w:t>';
    const { found } = replaceBlankAfterLabel(xml, "Label: ", "value");
    assert.equal(found, true);
  });
});
