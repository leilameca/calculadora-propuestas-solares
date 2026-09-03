param(
    [Parameter(Mandatory = $true)]
    [string[]]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$word = $null
$results = @()

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3

    foreach ($source in $InputPath) {
        $resolvedSource = (Resolve-Path -LiteralPath $source).Path
        $stem = [System.IO.Path]::GetFileNameWithoutExtension($resolvedSource)
        $safeStem = ($stem -replace '[^A-Za-z0-9._-]', '_')
        $pdfPath = Join-Path $resolvedOutput ($safeStem + '.pdf')
        $textPath = Join-Path $resolvedOutput ($safeStem + '.txt')

        $document = $word.Documents.OpenNoRepairDialog($resolvedSource, $false, $true, $false)

        try {
            $document.Repaginate()
            $pageCount = $document.ComputeStatistics(2)
            $sectionCount = $document.Sections.Count
            $tableCount = $document.Tables.Count
            $inlineShapeCount = $document.InlineShapes.Count
            $shapeCount = $document.Shapes.Count
            $document.ExportAsFixedFormat($pdfPath, 17)
            [System.IO.File]::WriteAllText($textPath, $document.Content.Text, [System.Text.Encoding]::UTF8)

            $results += [pscustomobject]@{
                source = $resolvedSource
                pdf = $pdfPath
                text = $textPath
                pages = $pageCount
                sections = $sectionCount
                tables = $tableCount
                inlineShapes = $inlineShapeCount
                floatingShapes = $shapeCount
            }
        }
        finally {
            $document.Close($false)
        }
    }
}
finally {
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

$results | ConvertTo-Json -Depth 4
