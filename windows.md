# Windows Compatibility Guide for Opus

This document outlines the steps and considerations for making the Opus application work on Windows. The main challenge is replacing the macOS-specific Swift accessibility code with Windows equivalents.

## Core Functionality to Port

The macOS version uses Swift with Apple's Accessibility API to:
1. List all clickable UI elements in the active window
2. Get element properties (role, title, position, size)
3. Programmatically click elements
4. Interact with the accessibility tree

## Windows Implementation Strategy

### 1. Windows UI Automation (UIA) API

Windows provides the UI Automation (UIA) API for accessibility, which is the Windows equivalent to macOS's Accessibility API.

Key components to use:
- `IUIAutomation` interface - Main interface for UI Automation
- `IUIAutomationElement` - Represents UI elements
- `TreeScope` enum - Defines the scope of element searches
- `ControlType` - Defines control types (similar to roles in macOS)

### 2. Required Changes

#### 2.1 Replace Swift Code with C++/WinRT or C#

Create a new Windows Runtime Component in C++/WinRT or C# that provides the same interface as the Swift code:

```csharp
// Example C# interface
public interface IWindowsAccessibility
{
    Task<string> ListClickableElementsAsync();
    Task<ClickResult> ClickElementAsync(int elementId);
}

public class ClickResult
{
    public bool Success { get; set; }
    public ClickedElement ClickedElement { get; set; }
    public string Error { get; set; }
}

public class ClickedElement
{
    public int Id { get; set; }
    public string Title { get; set; }
}
```

#### 2.2 Update Electron Main Process

Modify the main Electron process to use the Windows implementation instead of the Swift script:

```typescript
// In electron/main.ts
let windowsAccessibility: IWindowsAccessibility | null = null;

if (process.platform === 'win32') {
  // Load Windows-specific implementation
  windowsAccessibility = require('./windows/accessibility');
}

// Update fetchAllClickableItems
export async function fetchAllClickableItems(): Promise<ClickableItem[]> {
  if (process.platform === 'win32' && windowsAccessibility) {
    const result = await windowsAccessibility.ListClickableElementsAsync();
    return JSON.parse(result) as ClickableItem[];
  } else {
    // Existing macOS implementation
    const { stdout } = await execPromise("./swift/accessibility.swift json-list");
    return JSON.parse(stdout) as ClickableItem[];
  }
}
```

### 3. Building for Windows

#### 3.1 Prerequisites

- Install Visual Studio 2022 with:
  - Desktop development with C++
  - Universal Windows Platform development
  - C++/WinRT
- Install Windows 10/11 SDK
- Install Node.js and npm

#### 3.2 Build Steps

1. Build the Windows Runtime Component:
   ```bash
   cd windows
   msbuild /p:Configuration=Release /p:Platform=x64
   ```

2. Build the Electron app:
   ```bash
   npm run build
   ```

3. Package the app:
   ```bash
   npx electron-builder --win --x64
   ```

### 4. Required Permissions

For the Windows app to access UI elements of other applications, you'll need to:

1. Add the following to your app's manifest:
   ```xml
   <Capabilities>
     <rescap:Capability Name="uiAutomation" />
     <rescap:Capability Name="inputInjectionBrokered" />
   </Capabilities>
   ```

2. Request UI Automation permissions programmatically:
   ```csharp
   var uiAutomationClient = new CUIAutomation8();
   var root = uiAutomationClient.GetRootElement();
   // If this fails, the app needs elevation or permissions
   ```

### 5. Testing Considerations

1. Test with different DPI settings
2. Test with different Windows themes and scaling
3. Test with User Account Control (UAC) enabled/disabled
4. Test with different Windows versions (10/11)

### 6. Known Limitations

1. Some applications may not expose their UI elements to UIA
2. Performance may vary compared to the macOS version
3. Some macOS-specific features may not have direct Windows equivalents

### 7. Alternative Approaches

If UIA doesn't meet your needs, consider:

1. **Windows UI Automation API (COM-based)**
2. **Windows Accessibility API (MSAA/IAccessible)**
3. **Direct UI Automation (DUIA)**
4. **Windows Input Simulator** for mouse/keyboard automation

### 8. Resources

- [UI Automation Fundamentals](https://docs.microsoft.com/en-us/windows/win32/winauto/uiauto-fundamentals)
- [UI Automation API Reference](https://docs.microsoft.com/en-us/windows/win32/api/uiautomationclient/)
- [Windows App SDK](https://docs.microsoft.com/en-us/windows/apps/windows-app-sdk/)
- [Electron Windows Installation](https://www.electronjs.org/docs/latest/tutorial/installation#windows)
