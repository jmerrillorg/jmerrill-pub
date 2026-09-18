"use strict";

function classifySystemIncidentClosure(input = {}) {
  const clientRecovered = input.clientRecovered === true;
  const systemRepaired = input.rootCauseRepaired === true && input.canonicalSourceUpdated === true;
  const commissioned =
    systemRepaired &&
    input.regressionProof === true &&
    input.systemReplay === true &&
    (input.deploymentRequired !== true || input.deployed === true);

  if (clientRecovered && commissioned) return { status: "FULLY_CLOSED", closed: true };
  if (clientRecovered && !systemRepaired) return { status: "CLIENT_RECOVERED_SYSTEM_NOT_REPAIRED", closed: false };
  if (systemRepaired && !commissioned) return { status: "SYSTEM_REPAIRED_NOT_COMMISSIONED", closed: false };
  if (clientRecovered && systemRepaired) return { status: "CLIENT_RECOVERED_SYSTEM_REPAIRED_NOT_COMMISSIONED", closed: false };
  return { status: "OPEN", closed: false };
}

module.exports = { classifySystemIncidentClosure };
