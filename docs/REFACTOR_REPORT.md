# Entrega de estabilización — HelioPro

Fecha: 2026-09-10. Rama: `refactor/storage-ocr-pdf`. `main` permanece en `aa7fab4`; no se hizo push ni despliegue. Los cambios locales recibidos de PDF/DOCX se conservaron en el commit `1b7ed7d`, separado de la refactorización. La auditoría se escribió y confirmó antes de modificar código.

## Cambios realizados

- Abstracción de Object Storage privado con S3 configurable (AWS/R2/Supabase S3), modo local exclusivo de desarrollo, metadata StoredFile, SHA-256, referencias privadas, deduplicación verificada y lectura Base64 compatible.
- Migración aditiva, inventario, migración por lotes con verificación de bytes, journal fsync y compare-and-swap; rollback sin borrar objetos ni pisar ediciones posteriores.
- Parser normalizado con NIC/contrato separados, fechas, consumo actual, histórico, validaciones, duplicados/conflictos, confianza y warnings.
- Lectura por texto, layout XY, OCR y Textract opcional; interfaz preparada para extracción estructurada futura.
- Pantalla editable «Datos detectados de la factura» con confirmación explícita; la factura y los datos no se incorporan antes de confirmar.
- PDF dividido en generador, contrato, componentes y páginas; párrafos/tablas paginados, logos/imágenes tolerantes, gráficos y anexos recuperados, ajuste de caracteres, importes y opcionales.
- DOCX conservado y verificado: unidad USD/Wp, ITBIS cero, imágenes, anexos y tabla mensual sin página casi vacía.
- Autorización revalida empresa/usuario/rol; VIEWER no escribe; IDs de cliente/equipo/archivo respetan tenant; validación de cuerpos y uploads, URLs privadas, denegación de origen ajeno y logs sin datos privados.
- ESLint operativo, pruebas de regresión y scripts de inventario/exportación/OCR verificables. README y guías actualizados.

## Problemas encontrados por severidad

- **Crítico:** checkout inicial no compilaba (PDF y DOCX). Corregido.
- **Alto:** Base64 en PostgreSQL; OCR aplicaba resultados sin revisión y podía confundir columnas, contrato/NIC, años y duplicados; PDF sin paginación/contrato coherente; sesiones de empresas inactivas seguían válidas; validación de uploads y JSON insuficiente. Implementaciones corregidas; la externalización de bytes ya existentes requiere ejecutar la migración.
- **Medio:** numeración de propuestas susceptible a concurrencia (ahora bloqueo por tenant), limpieza/paginación Textract, fuentes de rasterización, página DOCX sobrante, expansión de imágenes, fixtures aparentemente reales, lint obsoleto. Corregidos. Quedan dos avisos de dependencias de desarrollo y verificaciones de despliegue pendientes.
- **Bajo:** listados sin paginación y optimización de agregados del dashboard. Se recomienda una etapa posterior medida con volumen real.

El diagnóstico detallado con archivos, causa, solución, riesgo y dependencias está en [TECHNICAL_AUDIT.md](TECHNICAL_AUDIT.md).

## Problemas corregidos y evidencia

| Verificación | Resultado |
|---|---|
| npm install | Correcto en la ejecución final; sin actualización forzada |
| npm run lint | Correcto, sin warnings |
| npm run typecheck | Correcto, strict conservado |
| npm test | 37 pruebas en 7 archivos, todas pasan |
| npx prisma validate | Esquema válido |
| npm run build | Build de producción correcto, 24 páginas/rutas procesadas |
| npm audit --omit=dev | 0 vulnerabilidades reportadas |
| Inventario READ ONLY | 2 empresas, 3 clientes, 6 equipos, 4 propuestas; 0 relaciones propuesta/cliente entre tenants inconsistentes |
| Datos Base64 | Aproximadamente 9,9 MB en documentos de equipos e imágenes; ninguna factura almacenada en invoiceData |
| Migración dry-run | Correcta; 13 campos candidatos; sin modificar registros |
| Exportación de propuestas existentes | 4 de 4 generan PDF y DOCX en memoria; 0 archivos privados persistidos |
| OCR real sobre fixture sintético rasterizado | EDENORTE, 12 meses, confidence 1 |
| QA visual PDF | Muestra de 9 páginas revisada; fuentes legibles, gráfico, cotización y equipos |
| QA visual DOCX | Exportado por LibreOffice; 8 páginas revisadas, corregida la fila que producía una página casi vacía |

Las pruebas tenant usan dobles de Prisma para ejercitar handlers, sesiones y filtros de compañía; la lectura/exportación de los cuatro registros usa la BD disponible real. No equivalen a pruebas de escritura entre empresas contra staging. La interfaz de confirmación se implementó, pero no se pudo realizar su recorrido interactivo: el navegador conectado no tenía instancias disponibles.

Se intentó el renderer de la guía DOCX y faltaba pdf2image; Word se bloqueó. Se verificó la firma del instalador LibreOffice ya presente y se extrajo a una carpeta temporal para renderizar, sin añadirlo al proyecto. Docker no pudo iniciar. Un servidor local de Next bloqueó la DLL de Prisma durante instalación/build; se detuvo para regenerar y se recuperó la verificación. Los comandos finales anteriores pasan.

## Problemas pendientes

1. **Aplicar en staging la migración aditiva y configurar Object Storage.** StoredFile no existe todavía en la BD disponible. Las cargas nuevas requieren ese paso antes de usar esta rama en un despliegue.
2. Ejecutar --apply y ensayar --rollback sobre una copia de staging; validar permisos del proveedor S3, URLs firmadas y recuperación de fallos. No se usaron credenciales de un bucket real ni se migraron datos productivos.
3. Completar pruebas interactivas de carga/revisión/corrección/confirmación, escrituras multiempresa y autenticación con cuentas de staging. Probar facturas Edenorte anonimizadas de más layouts y Textract real si se habilita.
4. Dos avisos **moderados de desarrollo** en Vitest 3/@vitest/mocker, [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). La actualización específica a 4.1.11 falló por un error interno de npm 10 (`Cannot read properties of null (reading edgesOut)`); se conserva la versión instalada y verificada. No se ejecutó audit fix --force. No exponer servidores de pruebas en red; resolver la actualización con gestor/entorno limpio.
5. Preparar rate limiting distribuido, antivirus/cuarentena, cuotas por empresa, retención y limpieza de objetos huérfanos, métricas y trabajos OCR asíncronos según carga real. Los límites actuales no sustituyen estas medidas operativas.
6. Revisar comercial/legalmente los textos regulatorios, garantías y tarifas heredados antes de vender HelioPro. Esta refactorización conserva su contenido y no certifica su vigencia.

## Variables de entorno nuevas

| Variable | Uso |
|---|---|
| STORAGE_PROVIDER | s3 en producción; local solo desarrollo |
| STORAGE_LOCAL_DIR | Carpeta privada de desarrollo, .storage por defecto |
| STORAGE_BUCKET | Bucket privado |
| STORAGE_ENDPOINT | Endpoint S3 compatible; vacío para AWS predeterminado |
| STORAGE_REGION | Región del proveedor; auto por defecto |
| STORAGE_FORCE_PATH_STYLE | true para proveedores que requieran paths por bucket |
| STORAGE_ACCESS_KEY_ID | Credencial de servidor; AWS también admite su cadena habitual si se omite |
| STORAGE_SECRET_ACCESS_KEY | Secreto de servidor, nunca NEXT_PUBLIC |

ALLOW_DEV_DASHBOARD ahora es false por defecto. AUTH_SECRET y variables AWS Textract existentes se conservan. `.env.example` no contiene credenciales reales.

## Migraciones y rollback

1. Respaldar BD, probar restauración y preparar bucket privado.
2. En staging ejecutar `npx prisma migrate deploy` y `npx prisma generate` para `20260910140000_add_stored_files` (tabla e índices aditivos).
3. Inventariar con `npx tsx scripts/migrate-storage.ts --company ID`.
4. Migrar con `npx tsx scripts/migrate-storage.ts --company ID --apply --manifest RUTA_PRIVADA/rollback.jsonl`.
5. Probar ambos formatos, imágenes y permisos; ensayar `npx tsx scripts/migrate-storage.ts --rollback --company ID --manifest RUTA_PRIVADA/rollback.jsonl`.

El manifiesto contiene bytes originales y requiere permisos/cifrado fuera de Git. No hay DROP de columnas ni borrado automático de archivos. Los bytes antiguos se verifican antes de cambiar la referencia. El rollback solo restaura referencias que aún coinciden con lo migrado. Más detalles en [STORAGE_MIGRATION.md](STORAGE_MIGRATION.md).

## Cómo probar Edenorte

1. Ejecutar `npm test` y `npx tsx scripts/verify-invoice-ocr.ts`.
2. Con sesión activa en staging, abrir Nueva propuesta y cargar PDF/imagen sintético de hasta 3 MB desde la UI.
3. Verificar que aparece «Datos detectados de la factura» y que todavía no cambian los campos de la propuesta.
4. Corregir cliente, NIC/contrato, tarifa, período, consumo actual y meses. Probar negativos, cero, mes 13 y duplicados: debe exigir corrección.
5. Cancelar y comprobar conservación; volver a cargar y confirmar. Solo entonces deben incorporarse datos/factura.
6. Guardar y reabrir; comprobar metadata en calculationInput.utilityBill e inclusión de factura al exportar.
7. Repetir con PDF escaneado, texto desordenado, historial parcial y otra distribuidora. Ver [INVOICE_READER.md](INVOICE_READER.md).

## Cómo probar PDF y DOCX

1. Ejecutar `npx tsx scripts/generate-verification-proposals.ts` para muestras ficticias.
2. Inspeccionar output/pdf/propuesta-edenorte-verificacion.pdf y qa-docx/propuesta-edenorte-verificacion.docx (ignorados por Git).
3. Rasterizar PDF con `npx tsx scripts/render-verification.ts ARCHIVO.pdf tmp/revision`; para DOCX exportar primero con Word/LibreOffice.
4. Revisar textos españoles, portada/logos, consumos, gráfico, importes USD/DOP/Wp, ITBIS cero, equipos, anexos y pies.
5. En la aplicación probar propuestas con/sin imágenes y adjuntos, textos muy largos y muchos conceptos. Descargar también propuestas guardadas.
6. Ejecutar `npx tsx scripts/verify-existing-exports.ts` para verificar hasta 20 propuestas en memoria sin guardar archivos.
7. Repetir con dos empresas e intentar IDs/referencias ajenas: no debe entregarse contenido. Ver [PDF_ARCHITECTURE.md](PDF_ARCHITECTURE.md).

## Riesgos y compatibilidad

- No desplegar código que escribe StoredFile antes de aplicar la migración y configurar el proveedor. El adaptador local se rechaza en producción.
- Los campos *Data ahora pueden contener referencias privadas; lectores externos que asumían siempre Base64 deben adaptarse. Las APIs/UI de este repositorio conservan compatibilidad.
- PDFs/archivos fuera de límites o con contenido activo detectado se rechazan al cargar; adjuntos heredados inválidos/excesivos se representan con aviso, sin abortar todo el documento.
- En PDF, caracteres fuera del repertorio estándar se transliteran o sustituyen; no hay garantía de emoji/alfabetos adicionales. Etiquetas muy largas se ajustan; tablas y párrafos conservan contenido mediante paginación.
- Meses sin año ancla, columnas ambiguas y formatos nuevos pueden requerir corrección manual. La confianza es heurística, no probabilidad certificada.
- La autorización reconsulta usuario/empresa; añade una lectura de BD y hace efectiva la desactivación inmediatamente. VIEWER ya no puede escribir.
- Objects/metadata subidos antes de una operación de negocio fallida pueden quedar sin referencia; no se borran automáticamente para evitar perder archivos compartidos.
- La prueba visual de Word puede variar ligeramente respecto de LibreOffice; queda validar en las versiones utilizadas por clientes.

## Próxima etapa recomendada (no implementada)

Primero staging multiempresa reproducible y CI con PostgreSQL/S3 de pruebas. Después, cuotas/retención y jobs OCR/PDF con límites y observabilidad; RBAC detallado y auditoría de acciones; versionado inmutable de propuestas y modelos/plantillas; revisión de tarifas/textos comerciales; onboarding, dominios, planes y facturación. Medir volumen antes de agregar infraestructura o cambiar tecnologías.

## Archivos creados

- `app/api/files/[id]/route.ts`
- `components/invoice-review.tsx`
- `docs/INVOICE_READER.md`
- `docs/PDF_ARCHITECTURE.md`
- `docs/REFACTOR_REPORT.md`
- `docs/STORAGE_MIGRATION.md`
- `docs/TECHNICAL_AUDIT.md`
- `eslint.config.mjs`
- `lib/api-handler.ts`
- `lib/api-validation.ts`
- `lib/proposal-assets.ts`
- `lib/proposal-pdf/components/chart.ts`
- `lib/proposal-pdf/components/flow.ts`
- `lib/proposal-pdf/components/primitives.ts`
- `lib/proposal-pdf/generator.test.ts`
- `lib/proposal-pdf/generator.ts`
- `lib/proposal-pdf/pages/analysis.ts`
- `lib/proposal-pdf/pages/attachments.ts`
- `lib/proposal-pdf/pages/back-cover.ts`
- `lib/proposal-pdf/pages/conditions.ts`
- `lib/proposal-pdf/pages/cover.ts`
- `lib/proposal-pdf/pages/phases.ts`
- `lib/proposal-pdf/pages/quote.ts`
- `lib/proposal-pdf/pages/summary.ts`
- `lib/proposal-pdf/pages/warranties.ts`
- `lib/proposal-pdf/types.ts`
- `lib/proposal-types.ts`
- `lib/proposal-validation.ts`
- `lib/storage/files.ts`
- `lib/storage/index.ts`
- `lib/storage/local.ts`
- `lib/storage/s3.ts`
- `lib/storage/storage.test.ts`
- `lib/storage/types.ts`
- `lib/storage/validation.ts`
- `lib/tenant-security.test.ts`
- `lib/utility-bill/fixtures.ts`
- `lib/utility-bill/parser.test.ts`
- `lib/utility-bill/parser.ts`
- `lib/utility-bill/pipeline.ts`
- `lib/utility-bill/types.ts`
- `prisma/migrations/20260910140000_add_stored_files/migration.sql`
- `scripts/migrate-storage.ts`
- `scripts/render-verification.ts`
- `scripts/verify-existing-exports.ts`
- `scripts/verify-invoice-ocr.ts`
- `scripts/verify-stabilization-db.ts`
- `vitest.config.ts`

## Archivos modificados

- `.env.example`
- `.gitignore`
- `README.md`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/companies/route.ts`
- `app/api/company/route.ts`
- `app/api/customers/route.ts`
- `app/api/dashboard/route.ts`
- `app/api/equipment/[id]/documents/route.ts`
- `app/api/equipment/route.ts`
- `app/api/me/route.ts`
- `app/api/ocr/route.ts`
- `app/api/proposals/docx/route.ts`
- `app/api/proposals/pdf/route.ts`
- `app/api/proposals/route.ts`
- `components/company-profile-form.tsx`
- `components/solar-calculator-app.tsx`
- `lib/auth-edge.ts`
- `lib/auth.ts`
- `lib/docx-builder.ts`
- `lib/equipment-attachments.ts`
- `lib/ocr.test.ts`
- `lib/ocr.ts`
- `lib/pdf-builder.ts`
- `lib/pdf-images.ts`
- `lib/pdf-text.ts`
- `lib/proposal-export.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `prisma/schema.prisma`
- `proxy.ts`
- `scripts/generate-verification-proposals.ts`
