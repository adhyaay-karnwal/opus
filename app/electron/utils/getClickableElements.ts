import { execPromise, logWithElapsed } from "./utils";
import { Element } from "../types";
import * as fs from "node:fs";
import * as path from "node:path";

export interface GetClickableElementsReturnType {
  clickableElements: Element[];
}

export async function getClickableElements(
  stepFolder: string
): Promise<GetClickableElementsReturnType> {
  let scriptPath = "";
  if (process.platform === "darwin") {
    scriptPath = "swift/accessibility.swift";
  } else if (process.platform === "win32") {
    scriptPath = "app/powershell/accessibility.ps1";
  }

  if (scriptPath === "") {
    throw new Error("Unsupported platform");
  }

  const { stdout } = await execPromise(
    process.platform === "win32"
      ? `powershell -ExecutionPolicy Bypass -File ${scriptPath}`
      : `swift ${scriptPath} json-list`
  );

  const clickableElements = JSON.parse(stdout);
  fs.writeFileSync(
    path.join(stepFolder, "clickable_elements.json"),
    JSON.stringify(clickableElements, null, 2)
  );
  logWithElapsed("getClickableElements", "Got clickable elements");
  return { clickableElements };
}
