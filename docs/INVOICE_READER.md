# Lector de facturas

`lib/utility-bill/types.ts` define ParsedUtilityBill: distribuidora, cliente, NIC, contrato separado, tarifa, dirección, período, consumo actual, histórico, confianza (0–1), warnings y origen de extracción. Los valores son kWh. `lib/ocr.ts` conserva la fachada parseElectricInvoice y consumption/recognized para consumidores anteriores; recognized no autoriza aplicar los datos.

## Etapas

1. PDF.js extrae texto del flujo original, copiando bytes para que el worker no invalide el original.
2. Si no es suficiente, reconstruye filas por Y (tolerancia de 2 puntos) y ordena por X. El parser reconoce filas y tablas horizontales mes/valor usando contexto de histórico. No toma indiscriminadamente importes de pago como consumo.
3. Si faltan 12 meses o confianza >= 0.8, rasteriza hasta 12 páginas, con límites de píxeles, y usa Tesseract español. Imágenes pasan directamente por OCR, después de validar el archivo y normalizar contraste/tamaño con sharp. Los workers y loading tasks se destruyen en finally. Las fuentes de PDF.js viajan con el despliegue.
4. Textract es opcional cuando el resultado local es insuficiente. Usa bucket AWS separado, key opaca por empresa, paginación NextToken y eliminación temporal aun si falla el inicio. Se recomienda lifecycle del bucket como segunda protección frente a interrupción de proceso.
5. StructuredBillExtractor es un punto de extensión opcional. No hay modelo IA ni envío automático a un proveedor nuevo. Un resultado futuro debe pasar el schema y las mismas validaciones; texto de factura se trata como datos, nunca instrucciones.

Se conserva el candidato con mejor puntuación; no se fusionan campos incompatibles entre lecturas. Se devuelven warnings si alguna etapa falla. Un documento no reconocido siempre permite entrada manual. La API no persiste ni aplica datos y no registra texto de facturas.

## Parser y validación

Normaliza Unicode NFC, acentos para búsqueda, espacios y separadores. Meses completos/abreviados y formatos mes/año o día/mes/año para período. Valores como 1.234,50 y 1,234.50 se interpretan en kWh. Un separador con tres dígitos se considera de millares; formatos ambiguos requieren revisión humana. El histórico industrial toma la columna de consumo anterior a potencia, conservando la regresión probada del formato existente. No existe soporte universal para tablas con columnas cambiadas sin etiquetas fiables.

Año entre 2000 y año actual+1, mes entero 1–12, kWh finito >0 y <=10 millones. Año omitido solo se propaga después de un año explícito; se incrementa en transición diciembre/enero. No se inventa el año actual. Duplicados idénticos se colapsan con aviso; duplicados contradictorios se excluyen para entrada manual. Se ordena cronológicamente y se conservan los 12 meses más recientes. Se avisa de huecos, histórico incompleto y extremos (más de 1 millón, o más de 5 veces/menos de un quinto de la mediana).

Confianza: distribuidora 0.15, cliente 0.10, NIC o contrato 0.10, tarifa 0.05, período 0.05, actual 0.05, histórico hasta 0.50 proporcional a 12 meses. Cada warning distinto resta 0.04, con penalización máxima 0.30. Es una heurística de completitud/coherencia, no probabilidad estadística de exactitud. Fallos técnicos adicionales se muestran como warnings sin alterar retroactivamente la comparación de candidatos.

## Revisión y persistencia

`components/invoice-review.tsx` muestra **Datos detectados de la factura**: todos los campos editables, añadir/quitar meses, confianza, warnings, Confirmar datos y Cancelar. Duplicados o valores inválidos impiden confirmar. Hasta confirmar no cambia el cliente, consumo ni factura de la propuesta. Confirmar no equivale a guardar: solo actualiza el formulario; el usuario guarda después. Contrato/período/actual y demás datos normalizados quedan en calculationInput.utilityBill. Consumo actual no se replica artificialmente a 12 meses. Tarifa desconocida no sustituye una tarifa válida de la calculadora.

NIC ya no se rellena automáticamente con un contrato. Cuando solo aparece contrato, se deja el NIC vacío y se conserva el identificador separado. Esto corrige una ambigüedad de la implementación anterior.

## Pruebas y reproducción

`npm test` ejecuta fixtures sintéticos (`lib/utility-bill/fixtures.ts`, parser.test.ts y ocr.test.ts). Cubre factura completa, orden alterado, XY, histórico parcial, duplicados, vacío, otra distribuidora, valores inválidos, separadores y fallbacks. No se añaden facturas privadas.

1. Arrancar con BD de staging y sesión de empresa activa.
2. En Nueva propuesta, cargar PDF/PNG/JPEG sintético (UI máximo 3 MiB para compatibilidad de guardado; API máximo 4 MiB).
3. Comprobar que los datos de la propuesta no cambian antes de confirmar.
4. Corregir cliente/NIC/contrato y al menos un mes; comprobar que 0, negativo, mes 13 y duplicados no permiten confirmar.
5. Cancelar y comprobar que la propuesta anterior permanece intacta; volver a cargar y confirmar.
6. Guardar, reabrir y exportar factura; probar también PDF escaneado, sin datos y de otra distribuidora.

## Límites y futuras distribuidoras

PDF protegido, tablas separadas en columnas sin correspondencia espacial, gráficos sin valores impresos, caracteres OCR confundidos, meses sin año ancla y documentos excesivos pueden necesitar entrada manual. Tesseract necesita acceder a su idioma español durante la primera inicialización (o caché de despliegue); los fallos se muestran al usuario. Límite de CPU/tiempo del hosting puede requerir jobs asíncronos en la siguiente etapa. Configurar rate limiting distribuido en el despliegue antes de cargas comerciales intensivas.

EDEESTE y EDESUR mantienen lectura genérica con warning. Para soporte específico: añadir fixtures anonimizados de cada layout, extraer un adaptador por distribuidora que devuelva ParsedUtilityBill, conectarlo al dispatcher de parseUtilityBill y reutilizar validateBill/pipeline/revisión sin duplicar APIs. No declarar equivalencia con Edenorte sin pruebas de las columnas propias.
