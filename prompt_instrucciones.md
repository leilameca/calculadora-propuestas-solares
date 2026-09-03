Actúa como Desarrollador Full-Stack Senior y Arquitecto de Software. Vamos a transformar y escalar una calculadora solar en HTML/JS a un SaaS completo en Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI y PostgreSQL con Prisma ORM.

==================================================
1. REGLAS TÉCNICAS Y RESTRICCIONES ESTRICTAS
==================================================
- NO USAR SUPABASE. Configurar PostgreSQL nativo vía Prisma ORM (para Railway, Render o VPS).
- PROHIBIDO EL USO DE EMOJIS en toda la interfaz. Usar exclusivamente `lucide-react`.
- CONSERVAR INTACTAS LAS FÓRMULAS Y PARÁMETROS SOLARES EXISTENTES:
  * HSP por provincia de República Dominicana.
  * Tarifas eléctricas vigentes (EDENORTE, EDESUR, EDEESTE en BTS-1, BTS-2, BTD, BTH, MTD, etc.).
  * Factores de estacionalidad, degradación a 25 años (0.6% anual), ROI, ITBIS comercial predeterminado (18%) y CO2 evitado.
  * El ITBIS debe poder activarse, desactivarse o configurarse por empresa; la misma regla debe aplicarse en UI, persistencia y Word.

==================================================
2. MULTI-TENANT, AUTH Y PERFIL DE EMPRESA
==================================================
- Rol SuperAdmin: Para la Fase 1, el SuperAdmin creará las empresas y usuarios manualmente.
- Perfil de Empresa (Tenant):
  * Datos comerciales: Nombre, RNC, Dirección, Teléfono, Email.
  * Personalización de marca: Subida de Logo y selección de paleta de colores (Primario, Secundario, Acento) para la UI y la plantilla de Word exportada.
  * Biblioteca de Portadas: Subida de imágenes de proyectos para la portada/contraportada.

==================================================
3. PARSER OCR FACTURA EDENORTE & ENTRADA MANUAL
==================================================
- Carga de PDF/Imagen de factura eléctrica (EDENORTE).
- Extraer vía OCR (Tesseract.js / AWS Textract):
  1. Nombre del cliente: Extraer EXCLUSIVAMENTE de "NOMBRE O RAZON SOCIAL" (IGNORAR "TITULAR DE PAGO").
  2. NIC / Contrato, Dirección y Tarifa.
  3. Histórico de consumo: Las facturas de EDENORTE traen 13 meses. OMITIR SIEMPRE el primer mes listado (el mes repetido del año pasado) y tomar solo los 12 meses recientes.
- LÓGICA DE PROMEDIO INTELIGENTE: Al seleccionar los últimos N meses (3, 6, 9, etc.), calcular sobre los últimos N meses efectivamente FACTURADOS descartando el mes base del año anterior.
- Si la factura es de EDESUR, EDEESTE o no es reconocida, habilitar un formulario de ingreso 100% manual.

==================================================
4. ANÁLISIS TÉCNICO Y SELECCIÓN DE INVERSORES
==================================================
- Banner Informativo en el Dashboard: Mostrar un badge dinámico:
  "Según el promedio de [X] kWh, este consumo requiere teóricamente [N] paneles de [W]W para el 100% de cobertura."
- Selección de Inversor: Desactivar la asignación automática obligatoria. Permitir al usuario elegirlo desde un "Inventario de Equipos" registrado o escribir marca/modelo manualmente.

==================================================
5. GENERADOR DE PROPUESTAS WORD (.DOCX) - FORMATO EILEN
==================================================
Implementar `/lib/docx-builder.ts` usando la librería `docx` para exportar la propuesta de 8 páginas replicando la estructura de EILEN Electric Service:

- REGLAS DE DISEÑO:
  * Encabezados, bordes superiores y cajas de notas usando el Color Primario de la empresa.
  * Aplicar también Color Secundario y Acento en métricas, divisores y elementos destacados, manteniendo contraste legible.
  * Tablas estilizadas con padding interno (mínimo 8pt) y anchos explícitos en %. Montos alineados a la DERECHA.
  * Márgenes uniformes de 2.5 cm, tipografía Arial/Aptos y encabezado/pie permanente con logo, contacto, RNC, vigencia y número de página.
  * Saltos de página explícitos (`PageBreak`) entre secciones para evitar desbordamientos.
- ESTRUCTURA DE PÁGINAS:
  * Pág 1 (Portada): Logo, foto aérea superior, título "PROPUESTA ENERGÉTICA", bloque "PREPARADO PARA" (Cliente, Sistema kWp, Ubicación, NIC, Fecha) y badges de KWh/Año y Vida útil.
  * Pág 2 (Descripción & Ley SIE): Resumen, objetivos, nota de cálculo promedio y bloque obligatorio sobre el cargo del 25% de la SIE a la energía inyectada para BTS-1 y BTS-2.
  * Pág 3 (Cotización USD): Resumen de equipos y tabla detallada en USD (Módulos, Inversor, Batería si aplica, Estructura, Cableado, Mano de obra, Sub-total, ITBIS, Inversión Total USD y Precio/Wp).
  * Pág 4 (Análisis & Gráfico): Badges de Ahorro Anual (RD$), Generación (KWh), CO2 y tabla/gráfico comparativo Ene-Dic.
  * Pág 5 (Condiciones Generales): Tasa de cambio Banco Central, política de interrupción por falla de red, etc.
  * Pág 6 (Garantías): Paneles (producto/rendimiento), Inversores y Soporte Técnico.
  * Pág 7 (Fases del Proyecto): Diagrama de 7 pasos estilizado (Aprobación Distribuidora -> Instalación -> Visita -> Acuerdos -> Carta Medidor -> Instalación Medidor -> Arranque).
  * Pág 8 (Contraportada): Cierre visual con foto, datos de contacto final y eslogan.

==================================================
6. PASOS INICIALES DE EJECUCIÓN
==================================================
1. Definir `schema.prisma` (`Company`, `User`, `Customer`, `EquipmentInventory`, `Proposal`).
2. Migrar la lógica matemática del `index.html` a `/lib/solar-calculator.ts`.
3. Crear las rutas del App Router para Dashboard, Carga de Factura y Generador de Word.

==================================================
7. CRITERIOS DE ACEPTACIÓN
==================================================
- `npm test`, `npm run typecheck`, `npm run build` y `npx prisma validate` deben finalizar sin errores.
- El cálculo de ejemplo debe demostrar ITBIS al 18%, ITBIS desactivado y tasa personalizada.
- Una prueba OCR debe demostrar que “TITULAR DE PAGO” nunca reemplaza “NOMBRE O RAZON SOCIAL”.
- Una factura EDENORTE con 13 meses debe producir exactamente los 12 meses recientes; EDESUR/EDEESTE deben activar entrada manual.
- El `.docx` debe contener siete saltos explícitos, ocho páginas lógicas, encabezado/pie y tablas con geometría fija.
- La propuesta debe usar el inversor seleccionado o escrito por el usuario; nunca uno calculado automáticamente.

==================================================
ACTUALIZACIÓN ESTRICTA: PARSER OCR FACTURA EDENORTE
==================================================
Aplica las siguientes reglas estrictas de extracción para facturas de EDENORTE:

1. REGLA DE EXTRACCIÓN DE NOMBRE DEL CLIENTE:
   - Extraer EXCLUSIVAMENTE el valor del campo "NOMBRE O RAZON SOCIAL".
   - IGNORAR por completo el campo "TITULAR DE PAGO" (ya que puede corresponder a un tercero/razón social administrativa).

2. REGLA DE CONSUMO HISTÓRICO Y PROMEDIOS (GRÁFICO/TABLA DE 13 MESES):
   - Las facturas de EDENORTE muestran 13 meses en su histórico (desde "Ago [Año Pasado]" hasta "Ago [Año Actual]").
   - OMITIR SIEMPRE el primer mes listado (el mes repetido del año pasado, p. ej., "Ago 2025").
   - Procesar únicamente los 12 meses efectivamente facturados del periodo reciente (p. ej., desde Sep hasta Ago del año actual).
   - Al seleccionar "Promedio de los últimos N meses" (ej. 3, 6, 9 meses), calcular la media retrocediendo desde el último mes facturado disponible en el documento (el mes más reciente), descartando siempre el mes base del año anterior.

3. COBERTURA DE DISTRIBUIDORAS:
   - El parser OCR automático estará habilitado ÚNICAMENTE para facturas de EDENORTE.
   - Para EDESUR y EDEESTE (o facturas no reconocidas), activar un formulario de ingreso de datos 100% manual.
