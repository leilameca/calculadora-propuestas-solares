# HelioPro — SaaS de propuestas solares

Aplicación Next.js (App Router), TypeScript, Tailwind CSS, Prisma y PostgreSQL para empresas instaladoras solares de República Dominicana.

## Puesta en marcha

1. Copie `.env.example` a `.env` y configure `DATABASE_URL` y `AUTH_SECRET`.
2. Ejecute `npm install`.
3. Ejecute `npm run db:generate` y `npm run db:migrate -- --name init`.
4. Cree la cuenta inicial con `npm run db:seed`.
5. Inicie el entorno con `npm run dev`.

En desarrollo el dashboard puede abrirse sin sesión. Defina `ALLOW_DEV_DASHBOARD=false` para probar el acceso obligatorio. En producción el middleware siempre exige una sesión firmada.

## Módulos

- Multi-tenant con aislamiento por `companyId`, roles y alta de empresas por SuperAdmin.
- Perfil comercial, marca dinámica y biblioteca de portadas.
- Clientes, inventario y selección explícita de inversor.
- Cálculo solar con HSP, tarifas, estacionalidad, degradación, ROI y CO2 trasladados del prototipo.
- OCR de imágenes con Tesseract.js. Para PDFs multipágina configure `AWS_REGION` y `AWS_TEXTRACT_S3_BUCKET`.
- Exportación `.docx` editable de ocho páginas con encabezado, pie, métricas, tablas y colores del tenant.

## Verificación

- `npm test`: pruebas de la matemática solar y del promedio facturado.
- `npm run typecheck`: validación TypeScript estricta.
- `npm run build`: compilación de producción.
- `npx tsx scripts/generate-sample-docx.ts`: genera una propuesta de control en `qa-docx/`.

El factor ITBIS se conserva en `0.0018` (0.18%) porque es el valor utilizado por el prototipo recibido. Si la regla comercial debe ser 18%, cambie `LEGACY_ITBIS_RATE` con aprobación funcional y añada una prueba de regresión.
