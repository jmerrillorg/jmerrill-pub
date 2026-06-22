"use strict";

/**
 * Safe .docx fill primitives for the canonical J Merrill Publishing
 * agreement stack.
 *
 * These operate on word/document.xml as raw text and perform two kinds
 * of NARROW, literal substitutions only:
 *   1. Bracketed placeholders — e.g. "[Author Legal Name]" — replaced
 *      globally with an escaped value. Confirmed (by direct inspection
 *      of the canonical templates) to always sit entirely within a
 *      single <w:t> element, so a literal string replace cannot split
 *      or corrupt a run.
 *   2. Underscore blank runs immediately following a known label — the
 *      first <w:t>...all-underscore...</w:t> element found after a
 *      given anchor label, starting the search at a given byte offset
 *      so repeated identical labels/blanks elsewhere in the document
 *      are never touched by mistake.
 *
 * This module never rewrites surrounding legal language, never removes
 * a clause, and never invents a value — every call site supplies the
 * exact value to insert. Every replacement reports whether it actually
 * matched, so the caller can list any unmatched field as deferred
 * rather than silently failing.
 */

function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExpLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces every occurrence of a literal bracketed placeholder (e.g.
 * "[Book Title]") with an XML-escaped value. Pure string operation.
 *
 * @param {string} xml
 * @param {string} placeholder — e.g. "[Book Title]"
 * @param {string} value
 * @returns {{ xml: string, occurrences: number }}
 */
function replaceBracketPlaceholder(xml, placeholder, value) {
  const pattern = new RegExp(escapeRegExpLiteral(placeholder), "g");
  const occurrences = (xml.match(pattern) || []).length;
  const updated = xml.replace(pattern, escapeXmlText(value));
  return { xml: updated, occurrences };
}

/**
 * Finds `labelText` starting at `fromIndex`, then the next <w:t> element
 * after it whose entire content is underscore characters, and replaces
 * that blank with the escaped value. Returns the new search cursor
 * (end of the replaced element) so callers can chain calls across a
 * document with repeated identical labels/blanks without ever matching
 * an earlier occurrence twice.
 *
 * @param {string} xml
 * @param {string} labelText — literal text immediately preceding the blank, e.g. "Selected Package: "
 * @param {string} value
 * @param {{ fromIndex?: number, minUnderscores?: number }} [options]
 * @returns {{ xml: string, found: boolean, nextIndex: number }}
 */
function replaceBlankAfterLabel(xml, labelText, value, options = {}) {
  const fromIndex = options.fromIndex || 0;
  const minUnderscores = options.minUnderscores || 3;

  const labelIndex = xml.indexOf(labelText, fromIndex);
  if (labelIndex === -1) {
    return { xml, found: false, nextIndex: fromIndex };
  }

  const searchStart = labelIndex + labelText.length;
  // Matches a pure underscore blank, or one with a literal currency
  // symbol baked into the same run (e.g. "$____________") — in the
  // latter case the $ is preserved and only the numeric value should
  // be supplied by the caller.
  const blankPattern = new RegExp(`<w:t([^>]*)>(\\$?)(_{${minUnderscores},})</w:t>`, "g");
  blankPattern.lastIndex = searchStart;

  const match = blankPattern.exec(xml);
  if (!match) {
    return { xml, found: false, nextIndex: searchStart };
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  const currencyPrefix = match[2] || "";
  const replacement = `<w:t${match[1]}>${currencyPrefix}${escapeXmlText(value)}</w:t>`;
  const updated = xml.slice(0, matchStart) + replacement + xml.slice(matchEnd);

  return { xml: updated, found: true, nextIndex: matchStart + replacement.length };
}

module.exports = {
  escapeXmlText,
  replaceBracketPlaceholder,
  replaceBlankAfterLabel
};
