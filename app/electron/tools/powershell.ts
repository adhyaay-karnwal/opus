import { TMPDIR } from "../main";
import fs from "node:fs";
import path from "node:path";
import { execPromise } from "../utils/utils";
import { ExecException } from "node:child_process";

export interface PowerShellReturnType {
  type: "powershell";
  script: string;
  stdout?: string;
  error: string;
}

export default async function runPowerShell(
  body: string
): Promise<PowerShellReturnType> {
  const filePath = path.join(TMPDIR, "script.ps1");
  fs.writeFileSync(filePath, body);
  try {
    const { stdout } = await execPromise(`powershell -ExecutionPolicy Bypass -File ${filePath}`);
    return {
      type: "powershell",
      script: body,
      stdout,
      error: "",
    };
  } catch (error: unknown) {
    const { stderr } = error as ExecException;
    return {
      type: "powershell",
      script: body,
      error: stderr ?? "",
    };
  }
}
