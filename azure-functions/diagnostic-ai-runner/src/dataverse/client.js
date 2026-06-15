// Dataverse client stub — validates required config presence only.
// No live reads, writes, or token acquisition in this contract-test pass.

function assertDataverseConfig() {
  const required = [
    "DATAVERSE_ENDPOINT",
    "DATAVERSE_CLIENT_ID",
    "DATAVERSE_TENANT_ID"
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Dataverse configuration missing: ${missing.join(", ")}`),
      { safeCode: "DATAVERSE_CONFIG_MISSING" }
    );
  }
}

module.exports = { assertDataverseConfig };
