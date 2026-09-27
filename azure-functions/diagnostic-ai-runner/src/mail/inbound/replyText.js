"use strict";

const { normalizeString } = require("./util");

function authorReplyText(graphMessage) {
  const body = normalizeString(graphMessage?.body?.content || graphMessage?.bodyPreview);
  return body.split(/\r?\n\s*(?:>\s*)*On .{10,300} wrote:\s*\r?\n|\r?\n\s*(?:>\s*)*From:\s+.{3,200}\r?\n|\r?\n\s*---+\s*Original Message\s*---+/i)[0].trim();
}

module.exports = { authorReplyText };
