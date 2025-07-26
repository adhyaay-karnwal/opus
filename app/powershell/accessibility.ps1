# Add the UI Automation types
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Get-ClickableElements {
    $rootElement = [System.Windows.Automation.AutomationElement]::RootElement
    $trueCondition = [System.Windows.Automation.Automation.ControlViewCondition]
    $elements = $rootElement.FindAll("Descendants", $trueCondition)
    $clickableElements = @()

    foreach ($element in $elements) {
        try {
            $clickablePoint = $null
            if ($element.TryGetClickablePoint([ref]$clickablePoint)) {
                $properties = @{
                    id = $element.Current.AutomationId
                    name = $element.Current.Name
                    controlType = $element.Current.LocalizedControlType
                    x = $clickablePoint.X
                    y = $clickablePoint.Y
                    width = $element.Current.BoundingRectangle.Width
                    height = $element.Current.BoundingRectangle.Height
                }
                $clickableElements += $properties
            }
        } catch {
            # Ignore elements that cause errors
        }
    }

    return $clickableElements
}

$elements = Get-ClickableElements
$json = $elements | ConvertTo-Json
Write-Output $json
