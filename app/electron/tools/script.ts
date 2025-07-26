import { TMPDIR } from "../main";
import fs from "node:fs";
import path from "node:path";
import { execPromise } from "../utils/utils";
import { ExecException } from "node:child_process";
import runPowerShell from "./powershell";

export interface ScriptReturnType {
  type: "applescript" | "powershell";
  script: string;
  stdout?: string;
  error: string;
}

export default async function runScript(
  body: string
): Promise<ScriptReturnType> {
  if (process.platform === "darwin") {
    return runAppleScript(body);
  } else if (process.platform === "win32") {
    return runPowerShell(body);
  } else {
    return {
      type: "applescript",
      script: body,
      error: "Unsupported platform",
    };
  }
}

async function runAppleScript(
  body: string
): Promise<ScriptReturnType> {
  const filePath = path.join(TMPDIR, "script.scpt");
  fs.writeFileSync(filePath, body);
  try {
    const { stdout } = await execPromise(`osascript ${filePath}`);
    return {
      type: "applescript",
      script: body,
      stdout,
      error: "",
    };
  } catch (error: unknown) {
    const { stderr } = error as ExecException;
    return {
      type: "applescript",
      script: body,
      error: stderr ?? "",
    };
  }
}
