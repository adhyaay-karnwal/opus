import { desktopCapturer } from "electron";
import { execPromise, logWithElapsed } from "./utils";
import { Window } from "../types";

import * as fs from "node:fs";
import * as path from "node:path";

export async function takeAndSaveScreenshots(
  appName: string,
  stepFolder: string
) {
  logWithElapsed(
    "takeAndSaveScreenshots",
    `Taking screenshot of app window for app: ${appName}`
  );
  let windows: Window[] = [];
  if (process.platform === "darwin") {
    const { stdout: swiftWindowsStdout } = await execPromise(
      `swift swift/windows.swift`
    );
    windows = JSON.parse(swiftWindowsStdout);
  } else if (process.platform === "win32") {
    const { stdout: psWindowsStdout } = await execPromise(
      `powershell -ExecutionPolicy Bypass -File app/powershell/windows.ps1`
    );
    windows = JSON.parse(psWindowsStdout);
  }

  const filteredWindows = windows.filter(
    (window: Window) => window.app === appName
  );

  const sources = await desktopCapturer.getSources({
    types: ["window"],
    fetchWindowIcons: true,
    thumbnailSize: { width: 3840, height: 2160 },
  });
  logWithElapsed("takeAndSaveScreenshots", `Got desktop sources`);
  const matchingPairs = [];
  for (const window of filteredWindows) {
    const source = sources.find(
      (s) => typeof s.name === "string" && s.name === window.name
    );
    if (source) {
      matchingPairs.push({ window, source });
    }
  }
  let screenshotBase64;
  for (const { window, source } of matchingPairs) {
    const image = source.thumbnail;
    if (!image.isEmpty()) {
      console.log(window.name, window.name.replace(" ", "-"));
      const screenshotPath = path.join(
        stepFolder,
        `screenshot-${encodeURI(window.name)}.png`
      );
      fs.writeFileSync(screenshotPath, image.toPNG());
      logWithElapsed(
        "takeAndSaveScreenshots",
        `Saved screenshot: ${screenshotPath}`
      );
      if (!screenshotBase64) {
        screenshotBase64 = fs.readFileSync(screenshotPath).toString("base64");
      }
    }
  }
  return screenshotBase64;
}
