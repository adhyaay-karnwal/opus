// C# interface for Windows UI Automation
// As suggested in windows.md

public interface IWindowsAccessibility
{
    // Task<string> ListClickableElementsAsync();
    // Task<ClickResult> ClickElementAsync(int elementId);

    // Note: System.Threading.Tasks.Task may not be directly usable
    // in a WinRT component exposed to JavaScript.
    // Consider using Windows.Foundation.IAsyncOperation<string>
    // or returning JSON strings directly if interop issues arise.

    string ListClickableElements(); // Synchronous for simplicity, or use async pattern suitable for WinRT
    string ClickElement(int elementId); // Synchronous for simplicity
}

public class ClickResult // This might need to be a struct or have attributes for WinRT
{
    public bool Success { get; set; }
    public ClickedElement ClickedElement { get; set; }
    public string Error { get; set; }
}

public class ClickedElement // This might need to be a struct or have attributes for WinRT
{
    public int Id { get; set; }
    public string Title { get; set; }
}

// Placeholder for actual UI element structure returned by ListClickableElements
// This should be a JSON string representing an array of objects like:
// { "id": 1, "role": "button", "title": "Submit", "description": "Submits the form" }
// The ClickableItem interface in main.ts can be used as a reference for the structure.
