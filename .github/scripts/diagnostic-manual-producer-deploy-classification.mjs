import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SAFE_NO_RUNTIME_CHANGE_FILES = new Set([
  "azure-functions/diagnostic-ai-runner/scripts/refresh-publishing-internal-mail-attestation.cjs",
  "azure-functions/diagnostic-ai-runner/src/lifecycle/publishInternalMailAttestation.js",
  "azure-functions/diagnostic-ai-runner/test/publishInternalMailAttestation.test.js",
  "docs/operations/publishing-internal-mail-attestation.md",
  ".github/scripts/diagnostic-manual-producer-deploy-classification.mjs",
  ".github/tests/diagnostic-manual-producer-deploy-classification.test.mjs",
  ".github/workflows/diagnostic-ai-runner.yml",
]);

export function shouldSkipProductionDeployment(files, comparisonKnown = true) {
  if (!comparisonKnown || !Array.isArray(files) || files.length === 0) return false;
  return files.every(file => SAFE_NO_RUNTIME_CHANGE_FILES.has(file));
}

function changedFiles(eventName, event) {
  if (eventName === "workflow_dispatch") return { files: [], known: false };
  if (eventName === "pull_request") {
    const base = event.pull_request?.base?.sha;
    const head = event.pull_request?.head?.sha;
    if (!base || !head) return { files: [], known: false };
    return { files: diffFiles(`${base}...${head}`), known: true };
  }
  if (eventName === "push") {
    const base = event.before;
    const head = event.after;
    if (!base || !head || /^0+$/.test(base)) return { files: [], known: false };
    return { files: diffFiles(`${base} ${head}`), known: true };
  }
  return { files: [], known: false };
}

function diffFiles(range) {
  return execFileSync("git", ["diff", "--name-only", ...range.split(" ")], { encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
}

function main() {
  let decision = { files: [], known: false };
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    decision = changedFiles(process.env.GITHUB_EVENT_NAME || "", event);
  } catch {
    decision = { files: [], known: false };
  }
  const skip = shouldSkipProductionDeployment(decision.files, decision.known);
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    appendFileSync(output, `skip_production_deploy=${skip}\n`);
  }
  process.stdout.write(JSON.stringify({
    comparison: decision.known ? "KNOWN" : "UNKNOWN_FAIL_CLOSED_TO_DEPLOY",
    changedFileCount: decision.files.length,
    skipProductionDeploy: skip,
  }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
