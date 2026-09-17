import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const project = path.join(root, "plugin", "JMPPublishingV2Phase6.csproj");
const signingKey = process.env.JMP_PHASE6_SIGNING_KEY_PATH;

if (!signingKey || !existsSync(signingKey)) {
  throw new Error("JMP_PHASE6_SIGNING_KEY_PATH must reference the governed Phase 6 strong-name key");
}

execFileSync("dotnet", [
  "build",
  project,
  "-c",
  "Release",
  `-p:JMP_PHASE6_SIGNING_KEY_PATH=${signingKey}`,
], { stdio: "inherit" });
