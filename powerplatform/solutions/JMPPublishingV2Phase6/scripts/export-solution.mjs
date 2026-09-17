import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_PHASE6_EXPORT_ENVIRONMENT_URL;
const solutionName = "JMP_PublishingV2_Phase6_Portable";
const root = path.resolve(import.meta.dirname, "..");
const artifacts = path.join(root, "artifacts");
const evidence = path.join(root, "evidence", "solution-export.json");
if (!environmentUrl) throw new Error("JMP_PHASE6_EXPORT_ENVIRONMENT_URL is required");

const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;

async function exportSolution(managed) {
  const response = await fetch(`${base}/ExportSolution`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ SolutionName: solutionName, Managed: managed }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ExportSolution ${managed} ${response.status}: ${text.slice(0, 1200)}`);
  const bytes = Buffer.from(JSON.parse(text).ExportSolutionFile, "base64");
  const name = `${solutionName}_1_1_0_0_${managed ? "managed" : "unmanaged"}.zip`;
  const file = path.join(artifacts, name);
  writeFileSync(file, bytes);
  return { name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

mkdirSync(artifacts, { recursive: true });
mkdirSync(path.dirname(evidence), { recursive: true });
const who = await fetch(`${base}/WhoAmI()`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).then((response) => response.json());
const result = {
  status: "PASS",
  solutionName,
  version: "1.1.0.0",
  sourceOrganizationId: who.OrganizationId,
  unmanaged: await exportSolution(false),
  managed: await exportSolution(true),
  exportedAt: new Date().toISOString(),
};
writeFileSync(evidence, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
