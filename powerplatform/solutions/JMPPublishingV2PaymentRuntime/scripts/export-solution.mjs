import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_PAYMENT_RUNTIME_EXPORT_ENVIRONMENT_URL?.replace(/\/$/, "");
const az = process.env.JM1_AZ_CLI || "az";
const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(root, "payment-ledger-schema.json"), "utf8"));
const artifacts = path.join(root, "artifacts");
const evidence = path.join(root, "evidence", "solution-export.json");
if (!environmentUrl) throw new Error("JMP_PAYMENT_RUNTIME_EXPORT_ENVIRONMENT_URL is required");

const token = execFileSync(az, ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl}/api/data/v9.2`;

async function exportSolution(managed) {
  const response = await fetch(`${base}/ExportSolution`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ SolutionName: manifest.solution.uniqueName, Managed: managed }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ExportSolution ${managed} ${response.status}: ${text.slice(0, 1200)}`);
  const bytes = Buffer.from(JSON.parse(text).ExportSolutionFile, "base64");
  const version = manifest.solution.version.replaceAll(".", "_");
  const name = `${manifest.solution.uniqueName}_${version}_${managed ? "managed" : "unmanaged"}.zip`;
  writeFileSync(path.join(artifacts, name), bytes);
  return { name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

mkdirSync(artifacts, { recursive: true });
mkdirSync(path.dirname(evidence), { recursive: true });
const whoResponse = await fetch(`${base}/WhoAmI()`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
const who = await whoResponse.json();
const result = {
  status: "PASS",
  solutionName: manifest.solution.uniqueName,
  version: manifest.solution.version,
  sourceOrganizationId: who.OrganizationId,
  unmanaged: await exportSolution(false),
  managed: await exportSolution(true),
  exportedAt: new Date().toISOString(),
};
writeFileSync(evidence, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
