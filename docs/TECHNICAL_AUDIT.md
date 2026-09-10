# Auditoría técnica — HelioPro

Fecha: 2026-09-10. Revisión del checkout local de `leilameca/calculadora-propuestas-solares`, base `aa7fab4`. Diagnóstico escrito antes de modificar código. Rama de trabajo: `refactor/storage-ocr-pdf`.

## Alcance y arquitectura

Next.js 16.3.4 App Router, React 19, Tailwind 3, TypeScript estricto, Prisma 6.12 y PostgreSQL. No se requiere reemplazar estas tecnologías. `app/dashboard` contiene las pantallas; los componentes cliente llaman a Route Handlers en `app/api`. La calculadora concentra formulario, OCR, edición y exportación en `components/solar-calculator-app.tsx`. `lib/solar-calculator.ts` separa la matemática y tiene cuatro pruebas. Prisma comparte un cliente; el esquema contiene Company, User, Customer, EquipmentInventory y Proposal, con índices por empresa y relaciones.

JWT HS256 de ocho horas en cookie HttpOnly; el proxy protege páginas, cada API verifica su sesión. SuperAdmin administra empresas y clientes con selección explícita. Las consultas principales usan companyId; no se ha demostrado una fuga transversal por esas consultas. No hay RLS ni relaciones compuestas que impidan inconsistencias multiempresa en escrituras ajenas a estas APIs.

Archivos: FileReader/canvas convierten imágenes y facturas a data URLs. Documentos técnicos multipart se convierten a Base64 en servidor. PDF usa pdf-lib con fuentes estándar; DOCX usa docx, sharp y rasterización pdfjs/canvas para anexos. OCR combina pdfjs con agrupación XY, Tesseract local y Textract/S3 opcional. No existe todavía abstracción de almacenamiento ni registro de metadata.

Se revisaron esquema y migraciones, APIs de sesión/empresa/clientes/equipos/propuestas/dashboard/OCR, interfaces de carga y exportación, generadores y helpers, scripts de QA, configuración y pruebas. No se ejecutaron escrituras ni migraciones sobre una base externa; tamaños reales y distribución de blobs requieren un inventario de solo lectura en el entorno autorizado.

## Estado inicial reproducido

- Cambios previos sin commit en `lib/pdf-builder.ts` (494 inserciones/242 eliminaciones aproximadamente) y `lib/docx-builder.ts` (renombre parcial). Deben preservarse como antecedente identificable.
- `npm test`: 11 pruebas pasan en 3 archivos. No cubren exportación completa, APIs ni aislamiento.
- `npm run typecheck`: falla por variables repetidas, contrato PDF incompleto, opción inexistente `align` y variable DOCX renombrada parcialmente.
- `npm run lint`: falla porque `next lint` no existe en esta versión. No hay ESLint configurado.
- El build no se considera viable mientras fallen esos errores de compilación.

## Hallazgos

| ID | Criticidad | Archivos afectados | Problema y causa probable | Solución propuesta | Riesgo / dependencias |
|---|---|---|---|---|---|
| A01 | crítico | lib/pdf-builder.ts; lib/docx-builder.ts | Checkout no compila: declaraciones duplicadas, align inexistente, exchangeRate ausente del tipo, quotePricePerKwp no definido | Conservar antecedente local; reparar contrato compartido y separar primitivas/páginas del PDF; corregir unidad USD/Wp | Medio: regresión visual; pdf-lib, docx, TypeScript |
| A02 | alto | prisma/schema.prisma; app/api/equipment/[id]/documents/route.ts; app/api/proposals/route.ts | datasheetData, certificateData e invoiceData guardan bytes Base64 en texto; los listados de equipos ya omiten documentos, el detalle de propuesta los carga completos | Registro de objetos privados, interfaz storage, lectura compatible y migración reanudable sin borrado automático | Alto operativo: respaldo, bucket y rollback; Prisma, SDK S3 existente |
| A03 | alto | app/api/company/route.ts; app/api/customers/route.ts; app/api/equipment/route.ts; components/company-profile-form.tsx; lib/client-images.ts | Campos llamados URL y coverImages también reciben data URLs; duplicación entre cliente, empresa, propuesta y solicitudes de exportación | Externalizar imágenes y referencias, resolver únicamente objetos del tenant, sin descargar URLs arbitrarias | Medio: imágenes antiguas y logos; sharp |
| A04 | alto | lib/ocr.ts; components/solar-calculator-app.tsx | Parser usa último número o primer número sin suficiente contexto; inventa año actual, pisa duplicados y aplica datos inmediatamente | Parser normalizado, fechas/contexto/tablas, validación con warnings/confidence y revisión editable obligatoria | Medio: diversidad de facturas; fixtures sintéticos y pruebas de regresión |
| A05 | alto | lib/pdf-text.ts; lib/pdf-images.ts; app/api/ocr/route.ts | pdfjs puede transferir/detachar Uint8Array antes del fallback; límites de página/píxeles insuficientes; excepciones se convierten en texto vacío | Copias de bytes, límites de recursos, limpieza en finally, etapas observables y resultados parciales explícitos | Medio: CPU/memoria, pdfjs, canvas, Tesseract |
| A06 | alto | app/api/ocr/route.ts | Textract no pagina NextToken; fallo al iniciar ocurre antes de finally y puede dejar archivo en S3; key incluye nombre de factura | Job completo dentro de cleanup, claves opacas por empresa, paginación y timeout | Bajo de código/medio operativo; AWS S3 y Textract, permisos y lifecycle |
| A07 | alto | lib/pdf-builder.ts; lib/proposal-export.ts; rutas PDF/DOCX | Dos contratos de propuesta, cast any de JSON, bytes/imágenes inválidos, fuentes WinAnsi, coordenadas fijas y tablas sin paginación | Contrato común validado, assets tolerantes, texto compatible y componentes de flujo; conservar anexos, factura, marca y personalización | Alto visual: verificar ambos formatos con datos extremos; pdf-lib, docx, sharp |
| A08 | alto | lib/auth.ts; app/api/* | JWT sigue autorizando usuario/empresa desactivados durante ocho horas; VIEWER puede mutar varios recursos | Revalidar usuario/empresa/rol en servidor; impedir mutaciones VIEWER; probar denegaciones e IDs ajenos | Medio: una consulta de sesión adicional; jose, Prisma |
| A09 | alto | app/api/proposals/route.ts; rutas exports; APIs uploads | JSON confiado sin schema; límites solo cliente o MIME declarado; falta límite acumulado antes de parsear; errores internos expuestos | Validación Zod de servidor, límites de cuerpo/bytes/tipo real, nombres seguros, errores controlados; comprobar referencias por tenant | Medio: clientes con payload inválido deben corregirse; Zod existente |
| A10 | medio | app/api/proposals/route.ts; prisma/schema.prisma | Número basado en count puede colisionar con solicitudes concurrentes; referencias de inversor no comprobadas | Serializar numeración por empresa/año y validar equipos; conservar restricción unique | Medio: concurrencia de PostgreSQL, transacciones |
| A11 | medio | lib/docx-builder.ts; lib/pdf-images.ts | DOCX exige 12 consumos y rasteriza hasta 20 páginas por documento sin avisar de truncamiento; imágenes pueden abortar todo | Normalización común, límites explícitos, anexos fallidos identificados, verificación OOXML y visual | Medio: paginación Word varía por motor; docx, sharp, pdfjs |
| A12 | medio | package.json; tsconfig.json; pruebas | lint obsoleto; ausencia de pruebas de almacenamiento, exportaciones y autorización | Configurar lint real y ampliar tests de comportamiento; mantener strict | Bajo; dependencia de desarrollo lint justificada |
| A13 | medio | lib/ocr.test.ts; scripts/generate-verification-proposals.ts | Fixtures contienen nombres, NIC y direcciones aparentemente reales | Sustituir por datos claramente ficticios, sin añadir facturas privadas | Bajo; no reescribir historial Git sin autorización |
| A14 | medio | APIs, proxy.ts, README.md, .env.example | Sin rate limiting distribuido para OCR/login, fallback secreto dev, dashboard abierto en desarrollo por defecto, .env.example puede quedar ignorado | Cerrar defaults, documentar límites y protección operativa; endurecer sesión sin incluir secretos | Medio operativo; despliegue y gateway |
| A15 | bajo | app/api/dashboard/route.ts; listados | Listados sin paginación, carga de JSON de cálculo para agregados | Mantener funcionalidad, medir y planear paginación/agregación para siguiente etapa | Bajo; no bloquea esta estabilización |

## Decisión de implementación

Mantener Next/Prisma/PostgreSQL/pdf-lib/docx/Tesseract. Reutilizar SDK S3 y Zod existentes. Cambios de esquema aditivos. Almacenamiento privado detrás de rutas autenticadas (los logos también pueden ser privados); referencias de objetos comprobadas por companyId tanto al guardar como al exportar. Ninguna descarga de URL remota suministrada por el cliente. Migración explícita, por lotes, verificando integridad antes de cambiar referencias; no eliminar Base64 heredado sin un paso posterior autorizado.

Las guías de PDF y documentos se usarán para verificación visual de muestras generadas; la implementación permanece en las librerías actuales, conforme al alcance solicitado.

## Referencias técnicas consultadas

- [Next.js: configuración ESLint](https://nextjs.org/docs/app/api-reference/config/eslint) — configuración CLI compatible.
- [AWS: URLs prefirmadas](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) — URLs temporales son credenciales portadoras; no se persistirán como identificador.
- [PDF.js: LoadingTask](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentLoadingTask.html) — ciclo de vida y destrucción del worker.

El estado final de correcciones, verificaciones y restricciones externas se registra separadamente en la entrega; este documento conserva el diagnóstico inicial.

## Verificación posterior de solo lectura

Durante la implementación se consultó la BD sin escribir registros: 2 empresas, 3 clientes, 6 equipos y 4 propuestas. Se encontraron 9 899 080 bytes aproximados en columnas con contenido codificado: documentos de equipos 6 335 916; imágenes de empresa 1 846 390; imágenes de clientes 802 982; imágenes de propuestas 802 982; logos de equipos 110 810. No había invoiceData Base64. No se encontraron propuestas cuyo cliente perteneciera a otra empresa. StoredFile aún no existe: la migración queda por aplicar.

La verificación de los cuatro registros existentes detectó expansión de JPEG a PNG por encima del límite interno; se corrigió con reducción acotada y se añadió regresión. Los cuatro registros ya exportan PDF y DOCX en memoria, sin persistir documentos privados. La revisión visual detectó además glifos deformados en rasterización PDF.js y una página casi vacía en DOCX; ambos corregidos.

La entrega final conserva dos avisos moderados de desarrollo en Vitest/@vitest/mocker (un mismo advisory); audit de producción no detecta vulnerabilidades. La actualización específica de Vitest se intentó sin force y fue bloqueada por un error interno de npm 10 (`edgesOut`). Se recuperó la instalación actual y se verificó nuevamente. No se modificó la pila de producción por ese aviso.
