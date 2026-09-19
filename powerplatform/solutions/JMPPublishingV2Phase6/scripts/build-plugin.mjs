import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
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

const builtAssembly = path.join(root, "plugin", "bin", "Release", "net462", "jmpv2phase6onboarding.dll");
const solutionAssemblyDirectory = path.join(
  root,
  "src",
  "PluginAssemblies",
  "jmpv2phase6onboarding-499AC0D0-EFAB-F111-AAAC-6045BD01D436",
);
mkdirSync(solutionAssemblyDirectory, { recursive: true });
copyFileSync(builtAssembly, path.join(solutionAssemblyDirectory, "jmpv2phase6onboarding.dll"));
