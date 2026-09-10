# Exportación de propuestas

Se mantienen pdf-lib y docx. `lib/pdf-builder.ts` es una fachada compatible; `lib/docx-builder.ts` conserva su API. No se reemplazó el diseño completo: se conservaron formato Letter, colores, portada, jerarquía y contenido del layout local, corrigiendo errores y recuperando personalización/anexos que esa versión había perdido respecto del commit base.

## Módulos

- `lib/proposal-types.ts`: contrato compartido ProposalDocumentInput; exportación de tipo compatible desde docx-builder.
- `lib/proposal-validation.ts`: Zod para propuestas, números finitos, límites, opcionales nulos, arrays mensuales normalizados a 12 posiciones. No se inventa una propuesta sin company/customer/project/result. Los valores mensuales ausentes se representan como 0 solo para renderizar; la revisión de factura tiene reglas más estrictas.
- `lib/proposal-export.ts`: carga una propuesta guardada por id/companyId y comprueba que su cliente pertenece al mismo tenant; convierte Decimal explícitamente y elimina casts any.
- `lib/proposal-assets.ts`: resuelve referencias privadas y normaliza imágenes con sharp. PNG/JPEG/WebP, rotación y reducción; imágenes corruptas se omiten sin abortar el documento.
- `lib/equipment-attachments.ts`: obtiene únicamente equipos de la empresa; los documentos de inventario no se aceptan por asignación directa del cliente. Los tres selectores actuales (panel/inversor/batería) siguen conservados.
- `lib/proposal-pdf/generator.ts`: crea documento, fuentes, marca, importes y contexto, invoca páginas y escribe metadata/numeración.
- `components/primitives.ts`: texto seguro para fuentes estándar, ajuste de etiquetas, wrapping con división de palabras muy largas, formas y formatos numéricos.
- `components/flow.ts`: cursor vertical, títulos, párrafos, saltos de página y tablas de altura variable. Repite encabezado al paginar y divide filas mayores que una página sin perder texto.
- `components/chart.ts`: gráfico reutilizable de consumo/generación real.
- `pages/`: portada, resumen, cotización, análisis, condiciones, garantías, fases, equipos/anexos y contraportada. Las páginas editoriales de estructura fija conservan coordenadas; los contenidos variables usan flujo. No se pretendió eliminar toda coordenada del dibujo vectorial.

## Causas corregidas

El checkout inicial contenía declaraciones duplicadas (quoteTax/badgeY/badgeW), tipo PDF diferente al DOCX, exchangeRate ausente, `align` pasado a una API que no lo acepta y un renombre parcial quotePricePerKwp. Ahora los cálculos y tipos son comunes; alineación mide el ancho real. USD/Wp divide kWp por 1000 y respeta ITBIS desactivado o tasa cero.

La portada dibujaba un rectángulo opaco sobre la foto; se retiró esa superposición. Tablas de cotización fijas podían salir de página; ahora paginan y conservan filas completas o continuadas. Texto personalizado, logos de cliente/equipo, contraportada y anexos se incorporan otra vez. El gráfico ya no se etiqueta como datos de ejemplo. La tabla mensual DOCX tiene márgenes compactos y filas indivisibles para evitar una página adicional casi vacía.

La rasterización PDF.js usaba font faces de navegador en canvas nativo, deformando glifos. Ahora usa el renderizador interno, fuentes incluidas en pdfjs-dist, rutas portables y tracing de esas fuentes en las APIs OCR/DOCX. Consulta técnica: [PDF.js, opciones de carga y fuentes](https://mozilla.github.io/pdf.js/api/draft/api.js.html).

## Robustez y límites

Fuentes estándar conservan español, acentos y ñ; subíndices/flechas se transliteran. Caracteres fuera del repertorio se sustituyen por `?` en PDF; DOCX conserva Unicode. No se incluye una fuente Unicode nueva ni se garantiza fidelidad de emoji u otros alfabetos. Las etiquetas compactas se ajustan y, si no caben a 7 pt, se abrevian con puntos; cuerpos y tablas de flujo conservan el texto íntegro. Los datos completos de cliente/propuesta figuran en el resumen.

Se aceptan hasta 200 conceptos, 30 000 caracteres de texto libre y 10 000 por descripción, con números finitos y límites. Cada archivo tiene máximo 4 MiB. Anexos PDF máximo 20 páginas por archivo; PDF limita además 80 páginas importadas. Un adjunto corrupto/protegido/excesivo añade un aviso visible con su nombre en lugar de abortar o truncarse silenciosamente. Las nuevas cargas rechazan PDFs inválidos, con acciones automáticas/JavaScript/archivos incrustados detectables. Esto no equivale a certificación antimalware.

Rasterización: máximo 20 millones de píxeles por página y 40 millones acumulados por documento. Bytes de entrada se copian antes de entregarlos al worker; cleanup/destroy se ejecutan aunque falle el procesamiento. DOCX incluye anexos rasterizados; PDF copia páginas. No hay fetch de URLs arbitrarias. Referencias a archivos de otra empresa se rechazan; objetos propios no disponibles se omiten con aviso/log seguro.

Logs identifican operación (`pdf.attachment_unavailable`, `proposal.image_unavailable`, `storage.object_unavailable`, `pdf.export_failed`, `docx.export_failed`), sin contenido de factura, credenciales ni URLs firmadas. Errores de API no exponen stack traces. Descargas no-store/nosniff. Los importes/reglas financieras existentes se conservan; esta refactorización no certifica la vigencia de los textos regulatorios/comerciales heredados.

## Verificación

`npm test` genera PDF y DOCX reales; prueba sin imágenes, imagen corrupta, ITBIS cero, español, filas largas/65 equipos y factura dañada. Las pruebas de autorización ejercitan rutas con dobles de Prisma y verifican los filtros reales companyId. Eso no sustituye una prueba contra PostgreSQL y S3 de staging.

`npx tsx scripts/generate-verification-proposals.ts` escribe ejemplos sintéticos en output/pdf y qa-docx (ignorados). `npx tsx scripts/render-verification.ts archivo.pdf directorio` rasteriza páginas para revisión. Para DOCX se puede exportar con Word/LibreOffice y renderizar el PDF resultante. No confundir apertura ZIP correcta con fidelidad visual: se revisan ambas.

Prueba manual:

1. Iniciar sesión con empresa activa; cargar propuesta existente y descargar PDF y DOCX.
2. Crear una propuesta sin logos/factura, otra con imágenes y documentos técnicos, y otra con textos/cotización largos.
3. Revisar portada, colores, acentos, tabla, gráfico, condiciones, importes USD/DOP, precio por Wp, factura y anexos.
4. Verificar ITBIS 0 y desactivado, varios equipos, factura corrupta heredada y objetos propios temporalmente ausentes.
5. Editar una celda/texto en Word para confirmar que sigue siendo editable. Los anexos rasterizados no son texto editable.
6. Repetir con una segunda empresa e intentar IDs/referencias de la primera: debe denegarse el acceso.
