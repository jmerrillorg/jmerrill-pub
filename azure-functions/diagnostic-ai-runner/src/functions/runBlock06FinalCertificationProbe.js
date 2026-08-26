"use strict";

const { app } = require("@azure/functions");
const {
  buildBlock06FinalCertificationProbe
} = require("../release/releaseReadinessCommissioning");

async function runBlock06FinalCertificationProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock06FinalCertificationProbe()
  };
}

app.http("run-block06-final-certification-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block06-final-certification-probe",
  handler: runBlock06FinalCertificationProbeHandler
});

module.exports = { buildBlock06FinalCertificationProbe, runBlock06FinalCertificationProbeHandler };
