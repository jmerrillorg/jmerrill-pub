"use strict";

const PROJECT_STYLE_SHEET_LIFECYCLE = Object.freeze([
  "editorial_review",
  "developmental_editing",
  "line_editing",
  "copy_editing",
  "proofreading",
  "archive"
]);

function buildProjectStyleSheetLifecycle(stage = "editorial_review") {
  const currentIndex = Math.max(PROJECT_STYLE_SHEET_LIFECYCLE.indexOf(stage), 0);
  return PROJECT_STYLE_SHEET_LIFECYCLE.map((name, index) => ({
    stage: name,
    status: index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending"
  }));
}

module.exports = {
  PROJECT_STYLE_SHEET_LIFECYCLE,
  buildProjectStyleSheetLifecycle
};
