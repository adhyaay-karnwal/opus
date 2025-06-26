# Windows Specific Implementation Guide

This directory contains code and components specific to the Windows version of Opus.

## UI Automation Component

The core Windows-specific functionality for interacting with the UI of other applications resides in a UI Automation (UIA) component, likely to be implemented in C# or C++/WinRT.

**Path to component project (example):** `windows/accessibility/Opus.Accessibility.csproj` (You will need to create this project)

### Interface

The component should aim to provide an interface similar to the one defined in `windows/accessibility/IWindowsAccessibility.cs`. This interface is a starting point and might need adjustments based on the chosen implementation technology (C#, C++/WinRT) and interop requirements with Node.js/Electron.

The key methods expected are:
- `ListClickableElements()`: Returns a JSON string representing an array of clickable UI elements in the currently active window. Each element should have at least an `id`, `role`, and `title`.
- `ClickElement(int elementId)`: Programmatically clicks the UI element corresponding to the given ID. Returns a JSON string indicating success or failure, and details of the clicked element.

Refer to the `ClickableItem` interface in `electron/main.ts` for the expected structure of element data.

### Implementation Guidance

- Use Windows UI Automation (UIA) API.
- Refer to the original `windows.md` file in the repository root for detailed strategy, prerequisites, and links to Microsoft documentation.

### Building the Component

As per `windows.md`, the general steps to build the component (once created, e.g., as a C# Class Library targeting .NET or a WinRT component) would be:

1.  **Prerequisites:**
    *   Install Visual Studio 2022 with:
        *   Desktop development with C++ (if using C++/WinRT)
        *   .NET desktop development (if using C#)
        *   Universal Windows Platform development (if creating a UWP component, though a standard .NET Class Library might be simpler for Electron interop via `edge-js` or a similar tool if not using WinRT directly)
        *   C++/WinRT (if applicable)
    *   Install Windows 10/11 SDK.

2.  **Build Command (Example for a .NET project):**
    Navigate to the component's project directory (e.g., `cd windows/accessibility`)
    ```bash
    dotnet build -c Release
    ```
    Or, if it's a C++/WinRT project using MSBuild:
    ```bash
    msbuild /p:Configuration=Release /p:Platform=x64 YourProjectName.vcxproj
    ```
    The output (e.g., a DLL) will need to be placed in a location where the Electron app can access it, or packaged appropriately. The specifics depend on how the native module is loaded into Node.js (e.g. using `ffi-napi`, `edge-js`, or if it's a WinRT component that Node.js can call).

### Integration with Electron

The Electron main process (`electron/main.ts`) will be modified to:
- Conditionally load this Windows UIA component on `win32` platforms.
- Call its methods instead of the Swift scripts used on macOS.

The exact mechanism for loading (e.g., `require()`, `ffi-napi`, `edge-js`) will depend on the type of component built. `edge-js` is a common choice for C# interop. If building a true WinRT component, Node.js has some built-in support for loading WinRT components, but this can be complex.

### Manifest Capabilities
Ensure the final packaged Electron application for Windows has the necessary capabilities in its manifest, as detailed in `windows.md` and to be configured in `electron-builder.json5`:
```xml
<Capabilities>
  <rescap:Capability Name="uiAutomation" />
  <rescap:Capability Name="inputInjectionBrokered" />
</Capabilities>
```

This setup is crucial for the AI-driven computer control features to function on Windows. You, the developer, will need to implement the native Windows UIA logic.
