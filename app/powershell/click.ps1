param (
    [string]$automationId
)

# Add the UI Automation types
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$rootElement = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $automationId)
$element = $rootElement.FindFirst("Descendants", $condition)

if ($element) {
    $invokePattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    if ($invokePattern) {
        $invokePattern.Invoke()
        Write-Output "Clicked element with AutomationId: $automationId"
    } else {
        Write-Error "Element with AutomationId: $automationId does not support InvokePattern."
    }
} else {
    Write-Error "Element with AutomationId: $automationId not found."
}
