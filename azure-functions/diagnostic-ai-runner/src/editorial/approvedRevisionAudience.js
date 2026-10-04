"use strict";

// Review candidates require a separate release; neither naming nor visibility drift can release them.
function isApprovedRevisionCandidate(artifact) {
  return String(artifact?.jm1pub_correlationid || "").startsWith("PUBLISHING_APPROVED_EDITORIAL_REVISION_V1:");
}

module.exports = { isApprovedRevisionCandidate };
