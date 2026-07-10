// Dataverse client stub — validates the managed-identity runtime config
// required by the governed execution path. Client-secret settings are
// intentionally not required for normal runtime operation.

function assertDataverseConfig() {
  const required = [
    "DATAVERSE_WEB_API_BASE_URL",
    "DATAVERSE_RESOURCE_URL"
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
