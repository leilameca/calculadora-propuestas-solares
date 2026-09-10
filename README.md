# HelioPro — SaaS de propuestas solares

Aplicación Next.js (App Router), TypeScript, Tailwind CSS, Prisma y PostgreSQL para empresas instaladoras solares de República Dominicana.

## Puesta en marcha

1. Copie `.env.example` a `.env` y configure `DATABASE_URL` y `AUTH_SECRET`.
2. Ejecute `npm install`.
3. Ejecute `npm run db:generate` y `npm run db:migrate -- --name init`.
4. Cree la cuenta inicial con `npm run db:seed`.
5. Inicie el entorno con `npm run dev`.

El dashboard exige sesión también en desarrollo. Solo para demos locales puede activar explícitamente `ALLOW_DEV_DASHBOARD=true`; las APIs siguen exigiendo autenticación. En producción el middleware siempre exige una sesión firmada.

## Módulos

- Multi-tenant con aislamiento por `companyId`, roles y alta de empresas por SuperAdmin.
- Perfil comercial, marca dinámica y biblioteca de portadas.
- Clientes, inventario y selección explícita de inversor.
- Cálculo solar con HSP, tarifas, estacionalidad, degradación, ROI y CO2 trasladados del prototipo.
- Modo de diseño automático (según consumo) o manual (cantidad de paneles).
- Facturas: texto PDF, reconstrucción de layout, OCR Tesseract y Textract opcional; revisión editable antes de confirmar.
- Exportación `.docx` editable de ocho páginas con encabezado, pie, métricas, tablas y colores del tenant.
- Persistencia de propuestas con generación automática de número `PROP-YYYY-NNN`, creación de clientes y estado comercial.

## Verificación

- `npm test`: matemática solar, parser, exportaciones, almacenamiento y autorización con dobles de Prisma.
- `npm run lint`: ESLint/TypeScript; Next.js 16 ya no proporciona `next lint`.
- `npm run typecheck`: validación TypeScript estricta.
- `npm run build`: compilación de producción.
- `npx tsx scripts/verify-database.ts`: verifica conexión, empresas, usuarios y migraciones aplicadas.
- `npx tsx scripts/generate-sample-docx.ts`: genera una propuesta de control en `qa-docx/`.

El ITBIS comercial predeterminado es 18%. Cada empresa puede desactivarlo o definir una tasa propia; el cálculo, la persistencia y la exportación Word reciben la misma configuración.

## Despliegue en Vercel

### 1. Base de datos PostgreSQL

Cree una base de datos PostgreSQL en [Railway](https://railway.app), [Render](https://render.com), [Neon](https://neon.tech) o un VPS. Obtenga la cadena de conexión.

### 2. Variables de entorno en Vercel

En el panel de Vercel (Project → Settings → Environment Variables), agregue:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Prisma) |
| `DIRECT_URL` | Cadena de conexión directa (para migraciones) |
| `AUTH_SECRET` | Clave secreta JWT (cadena aleatoria larga) |
| `SUPERADMIN_EMAIL` | Correo del SuperAdmin inicial |
| `SUPERADMIN_PASSWORD` | Contraseña del SuperAdmin inicial |
| `AWS_REGION` | Opcional: región de AWS para Textract (PDFs) |
| `AWS_TEXTRACT_S3_BUCKET` | Opcional: bucket S3 para PDFs |
| `AWS_ACCESS_KEY_ID` | Opcional: credenciales AWS |
| `AWS_SECRET_ACCESS_KEY` | Opcional: credenciales AWS |

### 3. Migraciones en producción

Después de conectar la base de datos, ejecute las migraciones:

```bash
npx prisma migrate deploy
```

Luego cree la cuenta SuperAdmin:

```bash
npm run db:seed
```

### 4. Despliegue

Conecte el repositorio en Vercel o use la CLI:

```bash
vercel --prod
```

El archivo `vercel.json` ya está configurado con el framework Next.js y el comando de build.
## Estabilización de almacenamiento, facturas y exportaciones

Consulte [auditoría técnica](docs/TECHNICAL_AUDIT.md), [migración de archivos](docs/STORAGE_MIGRATION.md), [lector de facturas](docs/INVOICE_READER.md) y [arquitectura PDF/DOCX](docs/PDF_ARCHITECTURE.md).

Los archivos nuevos se guardan en Object Storage privado (S3 compatible) y PostgreSQL conserva referencias/metadata. En desarrollo se permite `.storage/`; en producción configure `STORAGE_PROVIDER=s3` y las variables de `.env.example`. Antes de desplegar este cambio aplique `npx prisma migrate deploy` y genere el cliente con `npx prisma generate`. Los blobs antiguos siguen siendo legibles; su migración es un comando explícito con rollback, no un borrado automático.

La migración de datos no debe ejecutarse sobre producción sin respaldo y ensayo en staging. Para la entrega y verificaciones de esta etapa consulte [el reporte](docs/REFACTOR_REPORT.md).
