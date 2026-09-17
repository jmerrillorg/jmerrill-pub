import { execFileSync } from "node:child_process";
import path from "node:path";

const signingKey = process.env.JMP_TRANSITION_SIGNING_KEY_PATH;
if (!signingKey) throw new Error("JMP_TRANSITION_SIGNING_KEY_PATH is required");
const project = path.resolve(import.meta.dirname, "..", "plugin", "JMPPublishingV2TransitionParity.csproj");
execFileSync("dotnet", ["build", project, "-c", "Release", `-p:JMP_TRANSITION_SIGNING_KEY_PATH=${signingKey}`], { stdio: "inherit" });
