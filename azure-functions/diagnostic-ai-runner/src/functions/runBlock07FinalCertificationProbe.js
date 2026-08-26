"use strict";

const { app } = require("@azure/functions");
const {
  buildBlock07FinalCertificationProbe
} = require("../distribution/block07DistributionCommissioning");

async function runBlock07FinalCertificationProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock07FinalCertificationProbe()
  };
}

app.http("run-block07-final-certification-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block07-final-certification-probe",
  handler: runBlock07FinalCertificationProbeHandler
});

module.exports = { buildBlock07FinalCertificationProbe, runBlock07FinalCertificationProbeHandler };
