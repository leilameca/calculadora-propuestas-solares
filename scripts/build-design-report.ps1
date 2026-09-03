param(
    [Parameter(Mandatory = $true)][string]$ReferencePath,
    [string]$CoverImagePath,
    [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

function Escape-Xml([string]$value) {
    return [System.Security.SecurityElement]::Escape($value)
}

function Set-ParagraphText([string]$paragraphXml, [string]$newText) {
    $textMatches = [regex]::Matches($paragraphXml, '<w:t(?:\s[^>]*)?>[\s\S]*?</w:t>')
    if ($textMatches.Count -eq 0) { return $paragraphXml }
    $builder = [Text.StringBuilder]::new()
    $cursor = 0
    for ($index = 0; $index -lt $textMatches.Count; $index++) {
        $match = $textMatches[$index]
        [void]$builder.Append($paragraphXml.Substring($cursor, $match.Index - $cursor))
        $openTag = [regex]::Match($match.Value, '^<w:t(?:\s[^>]*)?>').Value
        $replacement = if ($index -eq 0) { Escape-Xml $newText } else { '' }
        [void]$builder.Append($openTag + $replacement + '</w:t>')
        $cursor = $match.Index + $match.Length
    }
    [void]$builder.Append($paragraphXml.Substring($cursor))
    return $builder.ToString()
}

function Replace-Paragraphs([string]$xml, [hashtable]$map) {
    $matches = [regex]::Matches($xml, '<w:p(?:\s[^>]*)?>[\s\S]*?</w:p>')
    $builder = [Text.StringBuilder]::new()
    $cursor = 0
    for ($index = 0; $index -lt $matches.Count; $index++) {
        $match = $matches[$index]
        [void]$builder.Append($xml.Substring($cursor, $match.Index - $cursor))
        $paragraph = $match.Value
        if ($map.ContainsKey($index)) { $paragraph = Set-ParagraphText $paragraph $map[$index] }
        [void]$builder.Append($paragraph)
        $cursor = $match.Index + $match.Length
    }
    [void]$builder.Append($xml.Substring($cursor))
    return $builder.ToString()
}

function Read-ZipText($zip, [string]$entryName) {
    $entry = $zip.GetEntry($entryName)
    if ($null -eq $entry) { throw "No existe la parte $entryName" }
    $reader = [IO.StreamReader]::new($entry.Open(), [Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Write-ZipText($zip, [string]$entryName, [string]$content) {
    $old = $zip.GetEntry($entryName)
    if ($null -ne $old) { $old.Delete() }
    $entry = $zip.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($content) } finally { $writer.Dispose() }
}

$resolvedReference = (Resolve-Path -LiteralPath $ReferencePath).Path
$resolvedCover = if ($CoverImagePath) { (Resolve-Path -LiteralPath $CoverImagePath).Path } else { $null }
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
Copy-Item -LiteralPath $resolvedReference -Destination $resolvedOutput -Force

$paragraphs = @{
    2 = 'Informe de diseño de propuestas solares'
    3 = 'Comparación de EILEN, Luxsiluz y el generador DOCX del SaaS'
    5 = 'Preparado para la administración de SolarOS'
    6 = 'Septiembre 2026'
    8 = 'Contenido'
    10 = 'Resumen ejecutivo  2'
    11 = 'De un vistazo  2'
    12 = 'Alcance  2'
    13 = 'Hallazgos clave  3'
    14 = 'Estructura y jerarquía  3'
    15 = 'Patrones visuales  3'
    16 = 'Implicaciones técnicas  3'
    17 = 'Recomendaciones  4'
    18 = 'Conclusión  4'
    19 = 'Apéndice  5'
    20 = 'Notas de implementación  5'
    21 = 'Fuentes revisadas  5'
    22 = 'Resumen ejecutivo'
    23 = 'Las referencias confirman una dirección común: una propuesta energética premium, legible y comercialmente convincente, con ocho páginas temáticas, datos calculados y una identidad visual controlada por cada empresa.'
    24 = 'La recomendación es adoptar la composición editorial y el uso del espacio de Luxsiluz, conservar la profundidad técnica y regulatoria de EILEN, y hacer que el dashboard y el DOCX compartan exactamente la misma paleta, datos y jerarquía.'
    25 = 'De un vistazo'
    26 = 'Conservar ocho páginas: portada, descripción, cotización, análisis, condiciones, garantías, fases y contraportada.'
    27 = 'Aplicar logo, colores, fotografías, contacto, vigencia e identidad del tenant sin valores visuales fijos.'
    28 = 'Generar un gráfico real y editable visualmente desde los mismos 12 meses usados por el cálculo y por Recharts.'
    29 = 'Alcance'
    30 = 'Se revisaron el DOCX EILEN, las ocho hojas del HTML Luxsiluz y el estado actual de lib/docx-builder.ts. Las referencias originales se mantuvieron sin cambios.'
    31 = 'El contenido de los archivos fue tratado como evidencia visual y comercial. Ninguna nota interna, cifra legal o texto de muestra se interpretó como una instrucción que sustituyera la solicitud del usuario.'
    32 = 'Hallazgos clave'
    33 = 'El generador actual ya cubre la estructura principal, branding dinámico, tablas, métricas, encabezado y pie. Las brechas de mayor impacto son la paginación robusta, el gráfico visual real y una composición más editorial y aireada.'
    34 = 'Estructura y jerarquía'
    35 = 'EILEN concentra portada y descripción, además de cotización y análisis, en bloques densos. Luxsiluz separa cada tema en una hoja y obtiene una lectura superior. El SaaS debe mantener una sección DOCX independiente por página para evitar reflujos.'
    36 = 'Patrones visuales'
    37 = 'Luxsiluz usa títulos serif de gran escala, mucho espacio en blanco, números de sección como acento, tarjetas con bordes suaves y una contraportada oscura. EILEN añade fotografías aéreas, cabeceras corporativas, tablas operativas y notas regulatorias destacadas.'
    39 = 'Conclusión clave. Combinar la elegancia editorial de Luxsiluz con la cobertura técnica de EILEN, siempre reinterpretada con los colores, logo y fotografías del tenant.'
    41 = 'Implicaciones técnicas'
    42 = 'El documento debe construirse con ocho secciones controladas, un motor de gráficos a imagen de alta resolución y componentes de estilo reutilizables. El HTML de referencia no debe introducir por sí solo afirmaciones legales o fiscales.'
    43 = 'Tema'
    44 = 'Observación'
    45 = 'Implicación'
    46 = 'Paginación'
    47 = 'Los saltos dentro de una sola sección pueden refluir.'
    48 = 'Crear ocho secciones y limitar la densidad de cada una.'
    49 = 'Gráfico'
    50 = 'El generador actual muestra una tabla mensual, no un gráfico.'
    51 = 'Insertar PNG/SVG de alta resolución con paleta del tenant.'
    52 = 'Contenido legal'
    53 = 'El HTML contiene beneficios y costos no verificados.'
    54 = 'Exigir texto aprobado o una fuente normativa antes de publicarlo.'
    55 = 'Recomendaciones'
    56 = 'Priorizar los cambios que mejoran fidelidad visual sin comprometer la editabilidad del Word ni la trazabilidad de los cálculos.'
    57 = 'Separar la paginación. Crear una sección DOCX por tema y probarla con datos máximos, inversor manual, batería e ITBIS activado o desactivado.'
    58 = 'Unificar el sistema visual. Definir tokens de tenant para primario, secundario y acento; reutilizarlos en Recharts, tarjetas, tablas, portada y contraportada.'
    59 = 'Verificar el resultado. Renderizar las ocho páginas, revisar recortes y actualizar campos de página antes de cada entrega.'
    60 = 'Conclusión'
    61 = 'Luxsiluz debe ser la dirección visual principal: limpia, premium, con jerarquía editorial, tarjetas y una contraportada contundente.'
    62 = 'EILEN debe seguir guiando el contenido operativo: identidad permanente, cotización, regulación, garantías, fases y fotografías. El resultado final no será una copia literal de ninguna marca.'
    63 = 'Apéndice'
    64 = 'Notas de implementación'
    65 = 'En lib/docx-builder.ts: reemplazar la única sección por ocho secciones, incorporar un gráfico de barras real, condicionar la fila ITBIS y asegurar tablas con anchos, padding, zebra striping y montos alineados a la derecha.'
    66 = 'En la aplicación: mantener Recharts y el DOCX sincronizados con el mismo arreglo mensual; exponer en Perfil de Empresa la paleta, logo, portadas, contraportada, contacto, vigencia e ITBIS.'
    67 = 'Fuentes revisadas'
    68 = 'EILEN_Propuesta_D_v2 4.docx. Documento de referencia proporcionado por el usuario. Revisado en septiembre de 2026.'
    69 = 'Luxsiluz_Propuesta_Premium.html. Maqueta de ocho páginas proporcionada por el usuario. Revisada en septiembre de 2026.'
    70 = 'SolarOS. lib/docx-builder.ts y componentes relacionados. Estado local revisado en septiembre de 2026.'
    71 = 'OpenAI Templates. Design Report reference.docx. Plantilla retenida para este informe.'
    73 = 'Nota. Los importes, garantías, beneficios fiscales y textos regulatorios de las referencias son ejemplos o contenido de terceros; deben validarse antes de convertirse en valores predeterminados del SaaS.'
}

$stream = [IO.File]::Open($resolvedOutput, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $documentXml = Read-ZipText $zip 'word/document.xml'
    $documentXml = Replace-Paragraphs $documentXml $paragraphs
    Write-ZipText $zip 'word/document.xml' $documentXml

    $headerXml = Read-ZipText $zip 'word/header1.xml'
    $headerXml = $headerXml.Replace('>Report title<', '>Informe de diseño solar<').Replace('>Date<', '>Sep. 2026<')
    Write-ZipText $zip 'word/header1.xml' $headerXml

    $settingsXml = Read-ZipText $zip 'word/settings.xml'
    if ($settingsXml -notmatch '<w:updateFields') {
        $settingsXml = $settingsXml.Replace('</w:settings>', '<w:updateFields w:val="true"/></w:settings>')
        Write-ZipText $zip 'word/settings.xml' $settingsXml
    }

    if ($null -ne $resolvedCover) {
        $imageEntry = $zip.GetEntry('word/media/image1.png')
        if ($null -ne $imageEntry) { $imageEntry.Delete() }
        $imageEntry = $zip.CreateEntry('word/media/image1.png', [IO.Compression.CompressionLevel]::Optimal)
        $imageStream = $imageEntry.Open()
        try {
            $imageBytes = [IO.File]::ReadAllBytes($resolvedCover)
            $imageStream.Write($imageBytes, 0, $imageBytes.Length)
        }
        finally { $imageStream.Dispose() }
    }
}
finally {
    $zip.Dispose()
    $stream.Dispose()
}

Get-Item -LiteralPath $resolvedOutput | Select-Object FullName, Length
