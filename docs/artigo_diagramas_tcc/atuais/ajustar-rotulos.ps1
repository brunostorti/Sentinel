$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'atividades-ciclo.svg'
$xml = New-Object System.Xml.XmlDocument
$xml.Load($path)
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$texts = $xml.SelectNodes('//*[local-name()="text"]')
foreach ($name in @('Revisar planos?', 'Solicitar certificado?')) {
    $condition = @($texts | Where-Object { $_.InnerText -eq $name })
    if ($condition.Count -ne 1) { throw "Decision not found: $name" }
    $polygon = $condition[0].PreviousSibling
    while ($polygon -and $polygon.LocalName -ne 'polygon') { $polygon = $polygon.PreviousSibling }
    if (-not $polygon) { throw "Decision shape not found: $name" }
    $coords = $polygon.GetAttribute('points').Split(',')
    $xs = for ($i = 0; $i -lt $coords.Count; $i += 2) { [double]::Parse($coords[$i], $culture) }
    $left = ($xs | Measure-Object -Minimum).Minimum
    $right = ($xs | Measure-Object -Maximum).Maximum
    $y = [double]::Parse($condition[0].GetAttribute('y'), $culture)
    $label = @($texts | Where-Object {
        $_.InnerText.StartsWith('[') -and
        [math]::Abs([double]::Parse($_.GetAttribute('x'), $culture) - $right) -lt 1 -and
        [math]::Abs([double]::Parse($_.GetAttribute('y'), $culture) - $y) -lt 20
    })
    if ($label.Count -ne 1) { throw "Guard not found: $name" }
    $width = [double]::Parse($label[0].GetAttribute('textLength'), $culture)
    $label[0].SetAttribute('x', ($left - $width - 4).ToString('0.###', $culture))
}
# Move the return action clear of the plan-approval connector.
$actionText = $texts | Where-Object { $_.InnerText -eq 'Abrir nova reavaliação' }
if ($actionText) {
    $rect = $actionText.PreviousSibling
    while ($rect -and $rect.LocalName -ne 'rect') { $rect = $rect.PreviousSibling }
    if (-not $rect) { throw 'Return action shape not found' }
    $top = [double]::Parse($rect.GetAttribute('y'), $culture)
    $bottom = $top + [double]::Parse($rect.GetAttribute('height'), $culture)
    $center = [double]::Parse($rect.GetAttribute('x'), $culture) + [double]::Parse($rect.GetAttribute('width'), $culture)/2
    $delta = -24
    $rect.SetAttribute('y', ($top+$delta).ToString('0.###', $culture))
    $current = $rect.NextSibling
    while ($current -and $current.LocalName -eq 'text') {
        $current.SetAttribute('y', ([double]::Parse($current.GetAttribute('y'), $culture)+$delta).ToString('0.###', $culture))
        $current = $current.NextSibling
    }
    foreach ($line in $xml.SelectNodes('//*[local-name()="line"]')) {
        if ([math]::Abs([double]::Parse($line.GetAttribute('x1'), $culture)-$center) -gt 0.01 -or
            [math]::Abs([double]::Parse($line.GetAttribute('x2'), $culture)-$center) -gt 0.01) { continue }
        foreach ($attr in @('y1', 'y2')) {
            $value = [double]::Parse($line.GetAttribute($attr), $culture)
            if ([math]::Abs($value-$top) -lt 0.01 -or [math]::Abs($value-$bottom) -lt 0.01) {
                $line.SetAttribute($attr, ($value+$delta).ToString('0.###', $culture))
            }
        }
    }
    foreach ($polygon in $xml.SelectNodes('//*[local-name()="polygon"]')) {
        $coords = $polygon.GetAttribute('points').Split(',')
        if ($coords.Count -ne 8) { continue }
        $tipX = [double]::Parse($coords[2], $culture)
        $tipY = [double]::Parse($coords[3], $culture)
        if ([math]::Abs($tipX-$center) -lt 0.01 -and [math]::Abs($tipY-$bottom) -lt 0.01) {
            for ($i=1; $i -lt $coords.Count; $i+=2) {
                $coords[$i] = ([double]::Parse($coords[$i], $culture)+$delta).ToString('0.###', $culture)
            }
            $polygon.SetAttribute('points', ($coords -join ','))
        }
    }
}

# Route the reapplication loop through a reserved left-hand strip in Management.
if (-not $actionText) { throw 'Return action text not found' }
function Read-Number($node, $attribute) {
    return [double]::Parse($node.GetAttribute($attribute), $culture)
}
function Format-Number([double]$value) {
    return $value.ToString('0.###', $culture)
}
function Shape-Before($node) {
    $shape = $node.PreviousSibling
    while ($shape -and $shape.LocalName -ne 'polygon') { $shape = $shape.PreviousSibling }
    if (-not $shape) { throw 'Decision polygon not found' }
    return ,$shape
}
function Read-Points($node) {
    return @($node.GetAttribute('points').Split(',') | ForEach-Object { [double]::Parse($_, $culture) })
}
$decisionText = @($texts | Where-Object { $_.InnerText -eq 'Reavaliar?' })
if ($decisionText.Count -ne 1) { throw 'Reapplication decision not found' }
$decision = Shape-Before $decisionText[0]
$decisionPoints = Read-Points $decision
$decisionLeft = $decisionPoints[6]
$decisionRight = $decisionPoints[2]
$decisionY = $decisionPoints[3]
$oldCenter = Read-Number $rect 'x'
$oldCenter += (Read-Number $rect 'width')/2
$actionTop = Read-Number $rect 'y'
$actionBottom = $actionTop + (Read-Number $rect 'height')
$channel = -140.0
$margin = 300.0
$dx = $channel - $oldCenter
$oldLines = @($xml.SelectNodes('//*[local-name()="line"]') | Where-Object {
    [math]::Abs((Read-Number $_ 'x1')-$oldCenter) -lt 0.01 -or
    [math]::Abs((Read-Number $_ 'x2')-$oldCenter) -lt 0.01
})
if ($oldLines.Count -ne 4) { throw "Unexpected return route: $($oldLines.Count) segments" }
$topJoinLine = @($oldLines | Where-Object {
    [math]::Abs((Read-Number $_ 'y1')-(Read-Number $_ 'y2')) -lt 0.01 -and
    (Read-Number $_ 'y1') -lt $actionTop
})
if ($topJoinLine.Count -ne 1) { throw 'Return merge segment not found' }
$joinY = Read-Number $topJoinLine[0] 'y1'
$oldJoinX = Read-Number $topJoinLine[0] 'x2'
$oldArrows = @($xml.SelectNodes('//*[local-name()="polygon"]') | Where-Object {
    $p = Read-Points $_
    $p.Count -eq 8 -and (
        ([math]::Abs($p[2]-$oldCenter) -lt 0.01 -and [math]::Abs($p[3]-$actionBottom) -lt 0.01) -or
        ([math]::Abs($p[2]-$oldJoinX) -lt 0.01 -and [math]::Abs($p[3]-$joinY) -lt 0.01)
    )
})
if ($oldArrows.Count -ne 2) { throw 'Return arrowheads not found' }
$join = @($xml.SelectNodes('//*[local-name()="polygon"]') | Where-Object {
    $p = Read-Points $_
    $p.Count -eq 10 -and [math]::Abs($p[2]-$oldJoinX) -lt 0.01 -and [math]::Abs($p[3]-$joinY) -lt 0.01
})
if ($join.Count -ne 1) { throw 'Return merge node not found' }
$joinPoints = Read-Points $join[0]
$joinLeft = $joinPoints[6]
$drawing = $rect.ParentNode
foreach ($node in @($oldLines) + @($oldArrows)) { [void]$node.ParentNode.RemoveChild($node) }
$rect.SetAttribute('x', (Format-Number ((Read-Number $rect 'x')+$dx)))
$current = $rect.NextSibling
while ($current -and $current.LocalName -eq 'text') {
    $current.SetAttribute('x', (Format-Number ((Read-Number $current 'x')+$dx)))
    $current = $current.NextSibling
}
$guard = @($texts | Where-Object {
    $_.InnerText -eq '[sim]' -and [math]::Abs((Read-Number $_ 'x')-$decisionRight) -lt 1 -and
    [math]::Abs((Read-Number $_ 'y')-$decisionY) -lt 20
})
if ($guard.Count -ne 1) { throw 'Reapplication guard not found' }
$guard[0].SetAttribute('x', (Format-Number ($decisionLeft-(Read-Number $guard[0] 'textLength')-6)))
$ns = 'http://www.w3.org/2000/svg'
foreach ($route in @(
    "M $decisionLeft $decisionY H $channel V $actionBottom",
    "M $channel $actionTop V $joinY H $joinLeft"
)) {
    $edge = $xml.CreateElement('path', $ns)
    $edge.SetAttribute('d', $route)
    $edge.SetAttribute('fill', 'none')
    $edge.SetAttribute('style', 'stroke:#334155;stroke-width:1.146;')
    [void]$drawing.AppendChild($edge)
}
$arrowPoints = @(
    @(($channel-4.583), ($actionBottom+11.458), $channel, $actionBottom, ($channel+4.583), ($actionBottom+11.458), $channel, ($actionBottom+6.875)),
    @(($joinLeft-11.458), ($joinY-4.583), $joinLeft, $joinY, ($joinLeft-11.458), ($joinY+4.583), ($joinLeft-6.875), $joinY)
)
foreach ($points in $arrowPoints) {
    $arrow = $xml.CreateElement('polygon', $ns)
    $arrow.SetAttribute('points', (($points | ForEach-Object { Format-Number $_ }) -join ','))
    $arrow.SetAttribute('fill', '#334155')
    $arrow.SetAttribute('style', 'stroke:#334155;stroke-width:1.146;stroke-linejoin:miter;stroke-miterlimit:10;')
    [void]$drawing.AppendChild($arrow)
}

# Extend only the Management lane; translate the drawing into the positive viewBox.
$laneLeft = 22.917
foreach ($line in $xml.SelectNodes('//*[local-name()="line"]')) {
    if ([math]::Abs((Read-Number $line 'x1')-$laneLeft) -lt 0.01 -and
        [math]::Abs((Read-Number $line 'x2')-$laneLeft) -lt 0.01) {
        $line.SetAttribute('x1', (Format-Number ($laneLeft-$margin)))
        $line.SetAttribute('x2', (Format-Number ($laneLeft-$margin)))
    }
}
$header = @($xml.SelectNodes('//*[local-name()="rect"]') | Where-Object { $_.GetAttribute('fill') -eq '#E2E8F0' })
if ($header.Count -ne 1) { throw 'Lane header not found' }
$header[0].SetAttribute('x', (Format-Number ((Read-Number $header[0] 'x')-$margin)))
$header[0].SetAttribute('width', (Format-Number ((Read-Number $header[0] 'width')+$margin)))
$title = $texts | Where-Object { $_.InnerText -eq 'Gestão (RH / Admin)' }
$title.SetAttribute('x', (Format-Number ((Read-Number $title 'x')-$margin/2)))
$svg = $xml.DocumentElement
$view = $svg.GetAttribute('viewBox').Split(' ')
$view[2] = Format-Number ([double]::Parse($view[2], $culture)+$margin)
$svg.SetAttribute('viewBox', ($view -join ' '))
$svg.SetAttribute('width', (Format-Number ([double]::Parse($svg.GetAttribute('width').Replace('px',''), $culture)+$margin))+'px')
$svg.SetAttribute('style', "width:$($view[2])px;height:$($view[3])px;background:#FFFFFF;")
$svg.SetAttribute('preserveAspectRatio', 'xMidYMid meet')
$group = $xml.CreateElement('g', $ns)
$group.SetAttribute('transform', "translate($margin 0)")
foreach ($child in @($svg.ChildNodes)) {
    if ($child.LocalName -notin @('defs', 'title', 'desc')) { [void]$group.AppendChild($child) }
}
[void]$svg.AppendChild($group)
$xml.Save($path)
