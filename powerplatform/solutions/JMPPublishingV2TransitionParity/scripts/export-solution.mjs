import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const environmentUrl = process.env.JMP_TRANSITION_DEV_ENVIRONMENT_URL;
const solutionName = "JMP_PublishingV2_TransitionParity";
const root = path.resolve(import.meta.dirname, "..");
if (!environmentUrl) throw new Error("JMP_TRANSITION_DEV_ENVIRONMENT_URL is required");
const token = execFileSync("az", ["account", "get-access-token", "--resource", environmentUrl, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8" }).trim();
const base = `${environmentUrl.replace(/\/$/, "")}/api/data/v9.2`;
async function exportOne(managed) {
  const response = await fetch(`${base}/ExportSolution`, { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ SolutionName: solutionName, Managed: managed }) });
  const text = await response.text(); if (!response.ok) throw new Error(`EXPORT_FAILED:${response.status}:${text.slice(0, 1200)}`);
  const bytes = Buffer.from(JSON.parse(text).ExportSolutionFile, "base64");
  const name = `${solutionName}_1_0_0_4_${managed ? "managed" : "unmanaged"}.zip`;
  writeFileSync(path.join(root, "artifacts", name), bytes);
  return { name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}
mkdirSync(path.join(root, "artifacts"), { recursive: true }); mkdirSync(path.join(root, "evidence"), { recursive: true });
const result = { status: "PASS", solutionName, version: "1.0.0.4", unmanaged: await exportOne(false), managed: await exportOne(true), exportedAt: new Date().toISOString() };
writeFileSync(path.join(root, "evidence", "solution-export.json"), `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2));
