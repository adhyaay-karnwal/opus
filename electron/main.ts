import "dotenv/config";
import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Notification,
  nativeImage,
  desktopCapturer, // Added for screenshots
} from "electron";
import { fileURLToPath } from "node:url";
import { run } from "@openai/agents";
import { stepsAgent, scriptsAgent } from "./ai.ts";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs, { writeFile } from "fs";
import { Jimp } from "jimp";

app.setName("Opus");
app.setAboutPanelOptions({ applicationName: "Opus" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execPromise = promisify(exec);

type message = {
  type: string;
  message: string;
};

type task = {
  title: string;
  messages: message[];
};

const tasks: task[] = [];

export interface ClickableItem {
  id: number;
  role: string;
  title: string;
  description: string;
}

export interface ClickableItem {
  id: number; // This ID is now locally generated if from Windows UIA
  role: string;
  title: string;
  description: string; // Or other properties from UIA
  // Windows-specific properties might be different, ensure mapping or common structure
  winProps?: any; // Placeholder for actual properties from UIA like AutomationId, etc.
}

// Placeholder for the Windows UIA native module
// The actual loading mechanism will depend on how the C#/C++/WinRT component is built and exposed
// e.g., using edge-js, ffi-napi, or a native Node module.
let windowsAccessibility: {
  ListClickableElements: () => string; // Assuming it returns a JSON string
  ClickElement: (id: number | string) => string; // ID might be string if it's an AutomationID
  GetFocusedWindowInfo: () => string; // Returns JSON string with { appName: string, windowTitle: string }
} | null = null;

if (process.platform === "win32") {
  try {
    // This is a placeholder path. Adjust if the DLL/component is elsewhere.
    // const modulePath = path.join(__dirname, '..', 'windows', 'accessibility', 'Opus.Accessibility.dll');
    // For C# with edge-js, it might look like:
    // windowsAccessibility = require('edge-js')({
    //   assemblyFile: modulePath,
    //   typeName: 'Opus.Accessibility.UIAWrapper', // Or whatever the class is
    //   methodName: '*' // To export all methods, or list them
    // });
    // For now, we'll keep it null and add stubs, actual implementation will require the built component.
    console.log(
      "Windows platform detected. Native UIA module would be loaded here."
    );
    // Replace with actual loading of the compiled Windows module
    // For testing purposes, you could mock it:
    /*
    windowsAccessibility = {
      ListClickableElements: () => {
        console.log("[Mock UIA] ListClickableElements called");
        return JSON.stringify([
          { id: 1, role: 'button', title: 'Mock Button 1', description: 'A mock button' },
          { id: 2, role: 'textbox', title: 'Mock Textbox', description: 'A mock textbox' }
        ]);
      },
      ClickElement: (id: number | string) => {
        console.log(`[Mock UIA] ClickElement called for ID: ${id}`);
        return JSON.stringify({ success: true, clicked_element: { id: id, title: `Mock Element ${id}` } });
      },
      GetFocusedWindowInfo: () => {
        return JSON.stringify({ appName: "Explorer", windowTitle: "File Explorer" });
      }
    };
    */
  } catch (error) {
    console.error("Failed to load Windows UIA module:", error);
    windowsAccessibility = null;
  }
}

export async function fetchAllClickableItems(): Promise<ClickableItem[]> {
  if (process.platform === "win32" && windowsAccessibility) {
    try {
      const resultJson = await windowsAccessibility.ListClickableElements(); // Assuming async if it involves I/O
      const items = JSON.parse(resultJson) as ClickableItem[];
      // Ensure IDs are numbers if the rest of the system expects that.
      // UIA elements might have string AutomationIds. This part needs careful handling
      // based on what the native module provides.
      return items.map((item, index) => ({ ...item, id: item.id || index }));
    } catch (error) {
      console.error("Windows UIA: Failed to fetch clickable items:", error);
      return [];
    }
  } else if (process.platform === "darwin") {
    try {
      const { stdout } = await execPromise(
        "./swift/accessibility.swift json-list"
      );
      if (!stdout) {
        return [];
      }
      return JSON.parse(stdout) as ClickableItem[];
    } catch (error) {
      console.error("macOS Swift: Failed to fetch clickable items:", error);
      return [];
    }
  } else {
    console.warn(
      "fetchAllClickableItems: Unsupported platform:",
      process.platform
    );
    return [];
  }
}

export async function clickItem(id: number | string): Promise<{ // ID might be string for Windows
  success: boolean;
  clicked_element?: { id: number | string; title: string };
  error?: string;
}> {
  if (process.platform === "win32" && windowsAccessibility) {
    try {
      const resultJson = await windowsAccessibility.ClickElement(id); // Assuming async
      return JSON.parse(resultJson);
    } catch (error) {
      console.error(`Windows UIA: Failed to click item ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else if (process.platform === "darwin") {
    try {
      // Ensure Darwin side always uses number ID for execPromise
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numericId)) {
        return { success: false, error: "Invalid ID format for macOS click." };
      }
      const { stdout } = await execPromise(
        `./swift/accessibility.swift click ${numericId}`
      );
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`macOS Swift: Failed to click item ${id}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      try {
        // Swift script might return JSON error structure
        return JSON.parse(errorMessage);
      } catch {
        return { success: false, error: errorMessage };
      }
    }
  } else {
    console.warn("clickItem: Unsupported platform:", process.platform);
    return { success: false, error: "Unsupported platform" };
  }
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "click.png"),
    width: 500,
    height: 160,
    resizable: false,
    trafficLightPosition: { x: -100, y: -100 },
    alwaysOnTop: false,
    ...(process.platform === "darwin"
      ? {
          autoHideMenuBar: true,
          titleBarStyle: "hiddenInset",
          frame: false,
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });
  win.webContents.openDevTools({ mode: "detach" });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const icon = nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "click.png")
    );
    app.dock.setIcon(icon);
  }
  new Notification({
    title: "Hello from Opus",
    body: "Opus is ready! Type a prompt and run your first task.",
  }).show();
  createWindow();
});

ipcMain.on("resize", async (event, w, h) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  if (win) {
    const [winWidth] = win.getSize();
    const x = Math.round(width * 0.85 - winWidth / 2);
    win.setPosition(x, 50, true);
  }

  win?.setSize(w, h, true);
});

ipcMain.on("message", async (event, msg) => {
  const currentMessages: message[] = [];

  console.log("Got message:", msg);
  win?.setSize(500, 500, true);

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  if (win) {
    const [winWidth] = win.getSize();
    const x = Math.round(width * 0.85 - winWidth / 2);
    win.setPosition(x, 50, true);
  }

  console.log("getting steps");

  // Ensure screenshots directory exists in userData path
  const userDataPath = app.getPath("userData");
  const screenshotsBaseDir = path.join(userDataPath, "screenshots");
  if (!fs.existsSync(screenshotsBaseDir)) {
    fs.mkdirSync(screenshotsBaseDir, { recursive: true });
  }
  const folderName = path.join(screenshotsBaseDir, `${Date.now()}-${msg.replaceAll(" ", "-")}`);
  // folderName is now an absolute path, fs.mkdirSync below is for the specific task's subfolder
  try {
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName, { recursive: true }); // Ensure this specific task's screenshot folder is created
      console.log("created task screenshot folder:", folderName);
    }
  } catch (err) {
    console.log("did not create task screenshot folder:", folderName);
    console.error(err);
  }

  const history: {
    step: string;
    script?: string;
    error?: string;
  }[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.time("while-loop-iteration");
    console.log("taking screenshot");

    console.time("fetchAllClickableItems");
    const clickableItems = await fetchAllClickableItems();
    console.timeEnd("fetchAllClickableItems");

    const clickableItemsText =
      clickableItems.length > 0
        ? `\n\nHere is a list of clickable elements on the screen:\n${clickableItems
            .map(
              (item) =>
                // Adjust ID display if it can be string for Windows
                `  - ID: ${item.id}, Role: ${item.role}, Title: ${item.title}`
            )
            .join("\n")}`
        : "";
    console.log(clickableItemsText);

    let imgBase64: string | null = null;
    console.time("screenshot-and-process");
    try {
      if (process.platform === "darwin") {
        // Use app.getPath('temp') for temporary files
        const tempDir = app.getPath("temp");
        const tmpPath = path.join(tempDir, `${Date.now()}-screenshot.png`);
        await execPromise(`screencapture -C -x "${tmpPath}"`);
        const image = await Jimp.read(tmpPath);
        image.resize({ w: width, h: height }); // width and height from primaryDisplay

        const dotColor = 0x00ff00ff; // green with full alpha (RGBA)
        const radius = 5;
        for (let y = 0; y < image.bitmap.height; y += 100) {
          for (let x = 0; x < image.bitmap.width; x += 100) {
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                  image.setPixelColor(dotColor, x + dx, y + dy);
                }
              }
            }
          }
        }
        imgBase64 = await image.getBase64Async(Jimp.MIME_PNG);
        fs.unlink(tmpPath, (err) => {
          if (err) console.error("Failed to delete temp screenshot:", err);
        });
      } else {
        // Cross-platform screenshot using desktopCapturer
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: width, height: height }, // Capture at screen resolution
        });
        // Assuming primary display is the first source, which is common
        const primaryScreenSource = sources.find(s => s.display_id === String(screen.getPrimaryDisplay().id)) || sources[0];

        if (primaryScreenSource) {
          const pngBuffer = primaryScreenSource.thumbnail.toPNG();
          const image = await Jimp.read(pngBuffer);
          // Jimp processing (resize, dots) - ensure width/height are correctly defined
           image.resize({ w: width, h: height }); // Ensure primaryDisplay width/height are used

          const dotColor = 0x00ff00ff; // green with full alpha
          const radius = 5;
          for (let y = 0; y < image.bitmap.height; y += 100) {
            for (let x = 0; x < image.bitmap.width; x += 100) {
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  if (dx * dx + dy * dy <= radius * radius) {
                    image.setPixelColor(dotColor, x + dx, y + dy);
                  }
                }
              }
            }
          }
          imgBase64 = await image.getBase64Async(Jimp.MIME_PNG);
        } else {
          console.error("Could not find primary screen source for screenshot.");
          imgBase64 = ""; // or a default placeholder image
        }
      }
    } catch (e) {
      console.error("Error taking or processing screenshot:", e);
      imgBase64 = ""; // or a default placeholder image
    }
    console.timeEnd("screenshot-and-process");

    if (!imgBase64) {
      console.error("Failed to capture screenshot, skipping this iteration.");
      // Consider how to handle this - maybe break or send error to renderer
      history.push({step: "Screenshot Failed", error: "Could not capture screen image."});
      if (history.length > 5) history.shift();
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait before retrying
      continue;
    }
    const img = imgBase64; // Keep variable name 'img' for later use

    const formattedHistory = history
      .map(
        (item) =>
          `- Step: ${item.step}` +
          (item.script ? `\n  - Script:\n${item.script}` : "") +
          (item.error
            ? `\n  - Status: Failed\n  - Error: ${item.error}`
            : `\n  - Status: Success`)
      )
      .join("\n\n");

    let frontApp = "";
    let windowTitle = ""; // For Windows
    let structuredDOM = "";
    console.time("get-front-app-and-dom");

    if (process.platform === "darwin") {
      try {
        const { stdout } = await execPromise(
          `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`
        );
        frontApp = stdout.trim();
        if (frontApp === "Safari") {
          const jsToInject = `function serializeDOM(node) { if (!node || node.nodeType !== 1) return null; const children = [...node.children].map(serializeDOM).filter(Boolean); return { tag: node.tagName, id: node.id || null, class: node.className || null, role: node.getAttribute('role') || null, text: node.innerText?.trim().slice(0, 100) || null, clickable: typeof node.onclick === 'function' || ['A', 'BUTTON'].includes(node.tagName), children: children.length ? children : null }; } JSON.stringify(serializeDOM(document.body));`;
          const { stdout: safariDOM } = await execPromise(
            `osascript -e 'tell application "Safari" to do JavaScript "${jsToInject.replace(
              /"/g,
              '\\"'
            )}"'`,
            { maxBuffer: 1024 * 1024 * 50 } // 50MB
          );
          structuredDOM = safariDOM;
        }
      } catch (e) {
        console.error("macOS: Could not get front app or Safari DOM", e);
      }
    } else if (process.platform === "win32" && windowsAccessibility) {
      try {
        const focusedWindowInfoJson = await windowsAccessibility.GetFocusedWindowInfo(); // Assuming async
        const info = JSON.parse(focusedWindowInfoJson);
        frontApp = info.appName || "Unknown Application";
        windowTitle = info.windowTitle || "Unknown Window";
        // structuredDOM for Edge/Chrome on Windows would require a more complex setup,
        // potentially involving browser extensions or WebDriver. For now, it remains empty.
        console.log(`Windows Focused App: ${frontApp}, Title: ${windowTitle}`);
      } catch (e) {
        console.error("Windows UIA: Could not get focused window info", e);
        frontApp = "Unknown Application";
      }
    } else {
      frontApp = "Unknown Application";
    }
    console.timeEnd("get-front-app-and-dom");

    const userContent: (
      | {
          type: "input_text";
          text: string;
        }
      | {
          type: "input_image";
          image: string;
        }
    )[] = [
      {
        type: "input_text",
        text: `Initial task request: ${msg}
  The current application in focus is ${frontApp}.
  All previous steps taken so far:
  ${formattedHistory}
  ${clickableItemsText}`,
      },
      { type: "input_image", image: img },
    ];

    const textInput = userContent[0];
    if (structuredDOM && textInput.type === "input_text") {
      console.log("structuredDom", structuredDOM);
      textInput.text += `\n\nHere is a structured JSON representation of the DOM of the current Safari page:\n${structuredDOM}`;
    }

    console.time("stepsAgent-run");
    const stepsOutput = (
      await run(stepsAgent, [{ role: "user", content: userContent }])
    ).state._currentStep;
    console.timeEnd("stepsAgent-run");
    console.log(stepsOutput);
    if (stepsOutput?.type != "next_step_final_output") return;
    const stepString = stepsOutput?.output;
    if (stepString.includes("STOP")) {
      new Notification({
        title: "Task complete",
        body: stepString.replace(" STOP", ""),
      }).show();

      event.sender.send("reply", {
        type: "complete",
        message: stepString.replace(" STOP", ""),
      });

      currentMessages.push({
        type: "complete",
        message: stepString.replace(" STOP", ""),
      });
      tasks.push({ title: msg, messages: currentMessages });
      event.sender.send("update-tasks", tasks);

      break;
    }
    new Notification({ title: "Running Step", body: stepString }).show();
    event.sender.send("reply", { type: "info", message: stepString });

    currentMessages.push({ type: "info", message: stepString });

    const clickMatch = stepString.match(/^Click element (\d+)/i);
    if (clickMatch) {
      const elementId = parseInt(clickMatch[1], 10);
      console.time("clickItem");
      const result = await clickItem(elementId);
      console.timeEnd("clickItem");
      const historyEntry = {
        step: stepString,
        script: `clickItem(${elementId})`,
        ...(result.error && { error: result.error }),
      };
      history.push(historyEntry);
      if (history.length > 5) {
        history.shift();
      }
      if (result.error) {
        console.error(`Failed to click element ${elementId}:`, result.error);
      }
      console.timeEnd("while-loop-iteration");
      continue;
    }

    console.log(`${Date.now()} - ${stepString}`);

    const base64Data = img.replace(/^data:image\/png;base64,/, "");

    console.time("writeFile-screenshot");
    const screenshotFileName = `${Date.now()}-${stepString
      .replaceAll(" ", "-")
      .replaceAll(",", "")
      .replaceAll("/", "")}.png`;
    // folderName is already an absolute path
    writeFile(
      path.join(folderName, screenshotFileName),
      base64Data,
      "base64",
      function (err) {
        if (err) console.log("error writing screenshot file: " + err);
        console.timeEnd("writeFile-screenshot");
      }
    );

    console.time("scriptsAgent-run");
    const scriptOutput = (
      await run(scriptsAgent, [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Instruction to execute: ${stepString}
${formattedHistory ? `\nLast 5 steps:\n${formattedHistory}` : ""}
The current application in focus is ${frontApp}.
Dimensions of window: ${width}x${height}
${clickableItemsText}
${
  structuredDOM
    ? `\nHere is a structured JSON representation of the DOM of the current Safari page:\n${structuredDOM}`
    : ""
}`,
            },
            { type: "input_image", image: img },
          ],
        },
      ])
    ).state._currentStep;
    console.timeEnd("scriptsAgent-run");
    if (scriptOutput?.type != "next_step_final_output") continue;
    let scriptContent = scriptOutput?.output;

    if (scriptContent) {
      const historyEntry = { step: stepString, script: scriptContent, error: "" };
      scriptContent = scriptContent.replace(/^```(applescript|powershell|shell)?\s*|\s*```$/g, "");

      try {
        const tempDir = app.getPath("temp");
        if (process.platform === "darwin") {
          console.log("Executing AppleScript:", scriptContent);
          const scriptPath = path.join(tempDir, "script.scpt");
          fs.writeFileSync(scriptPath, scriptContent);
          const { stdout, stderr } = await execPromise(`osascript "${scriptPath}"`); // Ensure path is quoted if it contains spaces
          if (stderr) {
            console.error(`AppleScript stderr: ${stderr}`);
            historyEntry.error = stderr;
          }
          if (stdout) console.log(`AppleScript stdout: ${stdout}`);
        } else if (process.platform === "win32") {
          // Assuming AI will generate PowerShell for Windows scripts
          // Or specific commands for the UIA module (which should be handled before this block)
          console.log("Executing PowerShell script:", scriptContent);
          const scriptPath = path.join(tempDir, "script.ps1");
          fs.writeFileSync(scriptPath, scriptContent);

          // Execution policy might prevent running scripts.
          // path.resolve() is not strictly necessary here as scriptPath is already absolute
          const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`;
          const { stdout, stderr } = await execPromise(command);
          if (stderr) {
            console.error(`PowerShell stderr: ${stderr}`);
            historyEntry.error = stderr;
          }
          if (stdout) console.log(`PowerShell stdout: ${stdout}`);
        } else {
          console.warn(`Script execution not supported on platform: ${process.platform}`);
          historyEntry.error = `Unsupported platform: ${process.platform}`;
        }

        if (historyEntry.error) {
          history.push(historyEntry);
        } else {
          history.push({ step: stepString, script: scriptContent });
        }
      } catch (e: unknown) {
        console.error("Error executing script: ", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        history.push({ step: stepString, script: scriptContent, error: errorMessage });
      }
    } else {
      history.push({ step: stepString });
    }
    if (history.length > 5) {
      history.shift();
    }
    // await new Promise((resolve) => setTimeout(resolve, 250));
    console.timeEnd("while-loop-iteration");
  }
});
