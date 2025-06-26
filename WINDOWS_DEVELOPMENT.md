# Windows Development Guide for Opus

This document provides guidance for developing and building the Opus application for Windows, with a focus on the UI Automation capabilities.

## Overview

The Windows version of Opus relies on a native UI Automation (UIA) component to interact with and control other applications. This component replaces the Swift-based accessibility features used on macOS.

## 1. Windows UI Automation (UIA) Component

A custom native component (e.g., C# Class Library or C++/WinRT component) is required to interface with the Windows UIA API.

**Location of sources (example):** `windows/accessibility/`
**Interface definition (placeholder):** `windows/accessibility/IWindowsAccessibility.cs`

### Responsibilities of the UIA Component:
- **List UI Elements:** Provide a method (e.g., `ListClickableElements()`) that returns a JSON string listing interactable UI elements from the active or a target window. Each element should include an ID (AutomationID or a generated unique ID), role, title, and any other relevant properties.
- **Click Elements:** Provide a method (e.g., `ClickElement(id)`) to perform a click action on a UI element specified by its ID.
- **Get Focused Window Info:** Provide a method (e.g., `GetFocusedWindowInfo()`) that returns a JSON string with details about the currently focused window, such as the application name and window title.

### Implementation Details:
- **Technology:** C# with .NET (e.g., using `System.Windows.Automation`) or C++/WinRT are recommended.
- **Interop with Electron/Node.js:** The compiled native module (e.g., DLL) will need to be callable from Node.js in the Electron main process. Common methods include:
    - **`edge-js`**: Useful for C#/.NET components. The Electron main process would use `require('edge-js')` to load and call methods from the .NET assembly.
    - **`ffi-napi`**: For C-style DLL exports.
    - **Native Node.js Addon (N-API)**: For C++ components, providing a robust integration.
    - **WinRT Projection**: If building a WinRT component, Node.js has some support for calling these directly.
- **Output:** The methods exposed to Node.js should ideally accept simple types (strings, numbers) and return JSON strings for complex data structures to simplify interop.
- **Placeholder in `electron/main.ts`:** The `electron/main.ts` file contains a `windowsAccessibility` object that is a placeholder for your actual loaded native module. You will need to replace the placeholder/mock implementation with the actual loading and invocation logic for your compiled UIA component.

### Building the UIA Component (Example for C#):
1.  **Prerequisites:**
    *   Visual Studio 2022 with ".NET desktop development" workload.
    *   Windows 10/11 SDK.
2.  **Create Project:** Create a new Class Library project in the `windows/accessibility/` directory (e.g., `Opus.Accessibility.csproj`).
3.  **Implement Logic:** Implement the UIA interaction logic using `System.Windows.Automation` or other relevant APIs.
4.  **Build:**
    ```bash
    cd windows/accessibility
    dotnet build -c Release
    ```
    The resulting DLL (e.g., `windows/accessibility/bin/Release/netX.X/Opus.Accessibility.dll`) will be loaded by Electron. Adjust the path in `electron/main.ts` when loading the module.

## 2. Electron Main Process (`electron/main.ts`)

The `electron/main.ts` file has been adapted to:
- Conditionally load the Windows UIA component (currently a placeholder).
- Use the UIA component for `fetchAllClickableItems`, `clickItem`, and `GetFocusedWindowInfo` on Windows.
- Use cross-platform APIs for screenshots (`desktopCapturer`).
- Conditionally execute AppleScript (macOS) or PowerShell scripts (Windows).

**You will need to modify `electron/main.ts` to correctly load and call your implemented UIA component.**

## 3. AI Agent Prompts (`electron/ai.ts`)

The prompts for `scriptsAgent` and `stepsAgent` have been updated to be Windows-aware.
- `scriptsAgent` is instructed to generate PowerShell scripts (wrapped in \`\`\`powershell ... \`\`\`) or indicate actions for the UIA component.
- `stepsAgent` generates steps assuming a Windows environment, targeting UIA interactions or PowerShell.

## 4. Build Configuration (`electron-builder.json5`)

The `electron-builder.json5` file has been configured for Windows:
- `appId`: "com.electron.opus"
- `productName`: "Opus"
- `win.uiAccess`: Set to `true`. This is critical as it requests the necessary privileges in the application manifest for UI Automation to work across different applications. Without this, UIA calls to interact with other applications might fail.

## 5. File Paths and Temporary Files

- Screenshot files are saved in a subdirectory within `app.getPath('userData')/screenshots/`.
- Temporary script files (AppleScript or PowerShell) are written to `app.getPath('temp')` before execution.

## 6. Testing and Debugging on Windows

- **White Screen Issue:** If you encounter a white blank screen, check Electron's main process and renderer process logs for errors. This could be due to:
    - Errors in loading JavaScript modules.
    - Failures in the UIA component loading or execution.
    - Unhandled exceptions in the main or renderer process.
- **UIA Component Not Working:**
    - Ensure the component is built correctly and placed where Electron can load it.
    - Verify the interop mechanism (e.g., `edge-js` setup) is correct.
    - Check for any exceptions thrown by the UIA component itself.
    - Confirm `uiAccess: true` is effectively set in the manifest of the built application. You can inspect the manifest of the generated `.exe` using tools like Resource Hacker.
- **AI Functionality:** Test the AI's ability to control the computer on Windows.
    - Verify that `fetchAllClickableItems` returns meaningful data.
    - Test `clickItem` on various UI elements.
    - Ensure PowerShell scripts generated by the AI execute correctly.

This guide should provide a starting point for completing the Windows-specific native development required for Opus.
The original `windows.md` file may contain further low-level details on UIA API usage.
