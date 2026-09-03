param([Parameter(Mandatory = $true)][string]$InputPath)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $InputPath))

try {
    foreach ($name in @(
        'word/document.xml',
        'word/styles.xml',
        'word/theme/theme1.xml',
        'word/_rels/document.xml.rels',
        'word/header1.xml',
        'word/footer1.xml'
    )) {
        $entry = $zip.GetEntry($name)
        if ($null -eq $entry) { continue }
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
        Write-Output "PART=$name"
        if ($name -eq 'word/document.xml') {
            [regex]::Matches($xml, '<w:sectPr[\s\S]*?</w:sectPr>') | ForEach-Object { $_.Value }
            [regex]::Matches($xml, '<w:tblGrid>[\s\S]*?</w:tblGrid>') | ForEach-Object { $_.Value }
        }
        elseif ($name -eq 'word/styles.xml') {
            [regex]::Matches($xml, '<w:style[^>]+w:styleId="(?:Normal|Title|Heading1|Heading2)"[\s\S]*?</w:style>') | ForEach-Object { $_.Value }
        }
        else {
            $xml.Substring(0, [Math]::Min($xml.Length, 6000))
        }
    }
}
finally {
    $zip.Dispose()
}
