"use strict";

const { app } = require("@azure/functions");
const {
  buildBlock05FinalCertificationProbe
} = require("../production/block05ProductionCommissioning");

async function runBlock05FinalCertificationProbeHandler() {
  return {
    status: 200,
    jsonBody: buildBlock05FinalCertificationProbe()
  };
}

app.http("run-block05-final-certification-probe", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "run-block05-final-certification-probe",
  handler: runBlock05FinalCertificationProbeHandler
});

module.exports = { buildBlock05FinalCertificationProbe, runBlock05FinalCertificationProbeHandler };
