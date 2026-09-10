# Almacenamiento privado y migración

`lib/storage/types.ts` define upload, delete, read, metadata y URL temporal. S3ObjectStorage usa el SDK S3 existente y un pequeño módulo oficial de firma; admite AWS S3, R2, Supabase S3 y otros endpoints compatibles mediante configuración. No exige ACL públicas ni un proveedor concreto. LocalObjectStorage sirve exclusivamente para desarrollo, fuera de public/, y deniega URLs firmadas. En producción falta de configuración falla cerrada.

StoredFile guarda companyId, proveedor, key opaca, nombre saneado, tamaño, MIME, SHA-256 y fechas. Los campos históricos de nombre `*Data` ahora aceptan `/api/files/:id`; las columnas no se eliminan ni renombran. Los campos URL y coverImages también aceptan esas referencias. Se siguen leyendo data URLs antiguas hasta migrarlas. PDF/DOCX resuelven bytes en servidor con comprobación de empresa e integridad. Nunca se descargan URLs arbitrarias (SSRF). La ruta privada exige sesión vigente y companyId, no-store/nosniff y descarga de documentos. No hay URLs públicas de facturas. `getUrl` es capacidad interna del adaptador, no un endpoint accesible sin autorización; una URL firmada es una credencial temporal y nunca se persiste.

## Configuración

- STORAGE_PROVIDER: `s3` en producción, `local` por defecto solo en desarrollo.
- STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_REGION: bucket privado, endpoint opcional y región (`auto` para servicios que lo soporten).
- STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY: credenciales exclusivamente servidor; AWS puede usar su cadena de credenciales si se omiten.
- STORAGE_FORCE_PATH_STYLE: `true` si el endpoint lo requiere.
- STORAGE_LOCAL_DIR: directorio privado local de desarrollo, por defecto `.storage` (ignorado).

Mantener el mismo bucket/endpoint para los objetos existentes. Cambiar de proveedor exige copiar y verificar objetos y actualizar metadata explícitamente. Habilitar cifrado, backups/versionado y políticas de mínimo privilegio en el servicio elegido. Límites: 4 MiB por archivo, formatos PDF/PNG/JPEG/WebP, firma/decodificación de imágenes y 20 millones de píxeles. La validación no sustituye un antivirus; anexos PDF se importan como páginas, no se ejecutan. El bucket no debe servir contenido activo públicamente.

## Secuencia segura

1. Respaldar PostgreSQL y verificar restauración. Preparar bucket privado y credenciales. Probar primero en una copia de staging.
2. Instalar dependencias y ejecutar `npx prisma migrate deploy` y `npx prisma generate`. La migración `20260910140000_add_stored_files` solo agrega tabla, índices y relación.
3. Con las variables de BD explícitas, inventariar sin escribir: `npx tsx scripts/migrate-storage.ts --company ID`. No lee automáticamente `.env`: cargar las variables con el mecanismo del entorno (por ejemplo `node --env-file=.env --import tsx scripts/migrate-storage.ts ...`). Omita --company solo para un inventario global autorizado.
4. Migrar: `npx tsx scripts/migrate-storage.ts --company ID --apply --manifest RUTA_PRIVADA/rollback.jsonl`. El manifiesto contiene Base64 original: nunca subirlo a Git, ni compartirlo, y cifrarlo/proteger permisos en el sistema operativo. Se recorren lotes de 25 registros; cada objeto se sube y relee para SHA-256 antes de registrar y hacer fsync del rollback. Luego compare-and-swap evita sobreescribir modificaciones concurrentes.
5. Repetir el inventario: referencias ya migradas se omiten. Un fallo puede dejar un objeto sin referencia, pero conserva la fuente; no se elimina automáticamente. Revisar objetos huérfanos después del período de rollback y retención acordado, no durante la migración.
6. Verificar imágenes, factura, documentos de equipos y exportaciones con dos empresas. Comparar hashes/tamaños y revisar la restauración en staging.
7. Rollback de datos: `npx tsx scripts/migrate-storage.ts --rollback --manifest RUTA_PRIVADA/rollback.jsonl --company ID`. Restaura solo si el valor todavía coincide con la referencia migrada; no pisa ediciones posteriores. No borra objetos. Mantener la aplicación compatible y StoredFile durante todo el rollback; no revertir código a una versión que solo entiende Base64 sin restaurar antes las referencias nuevas.

No se ejecuta esta migración de datos ni una migración contra producción como parte del desarrollo. Los archivos heredados mayores que los límites o inválidos deben tratarse individualmente; el script detiene el lote sin eliminar su fuente. PostgreSQL puede necesitar mantenimiento normal posterior para recuperar espacio físico; no ejecutar VACUUM FULL automáticamente (bloquea).

## Compatibilidad y operación

Las nuevas escrituras no guardan Base64; una actualización fallida después de subir puede dejar metadata/objeto huérfano, nunca una referencia a bytes no verificados. Delete existe en el adaptador, pero no se expone una API de borrado general que pudiera romper propuestas que comparten archivos. Para recolección futura se necesita analizar referencias y retención. El manifiesto es requisito de rollback, no una segunda base permanente de archivos. Las imágenes URL externas heredadas requieren importación explícita, no fetch automático del servidor.
