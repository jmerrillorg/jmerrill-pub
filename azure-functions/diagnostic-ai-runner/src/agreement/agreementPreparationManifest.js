"use strict";

/**
 * Builds the document-preparation manifest. Pure — no I/O.
 */

function buildPreparationManifest({ documents, deferredFields, timestamp }) {
  return {
    timestamp,
    documents: documents.map((d) => ({
      sourceTemplate: d.sourceTemplate,
      outputPath: d.outputPath,
      filledFields: d.filledFields,
      unmatchedFields: d.unmatchedFields || []
    })),
    deferredFields: deferredFields || [],
    note: "Documents prepared only — not sent. No manuscript text, raw AI output, or prompt text included in any output or in this manifest."
  };
}

module.exports = { buildPreparationManifest };
