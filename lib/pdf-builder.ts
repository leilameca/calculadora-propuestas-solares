import { PDFDocument, PDFFont, PDFPage, PDFPageDrawTextOptions, rgb, StandardFonts } from "pdf-lib";
import { MONTHS, type SolarCalculationResult } from "./solar-calculator";

export interface PdfProposalInput {
  company: {
    name: string;
    rnc?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    slogan?: string;
    logoBase64?: string;
    coverImageBase64?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    proposalValidityDays?: number;
  };
  customer: { name: string; nic?: string; address?: string };
  project: { name: string; city: string; utility: string; tariff: string; systemType: string; panelWatts: number; inverter?: string };
  consumption: number[];
  result: SolarCalculationResult;
  quoteItems: Array<{ name: string; description?: string; quantity?: number; amountUsd: number }>;
  proposalNumber?: string;
  date?: string;
}

const PAGE_W = 612; // Letter width (8.5in)
const PAGE_H = 792; // Letter height (11in)
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

function hexToRgb(hex: string, fallback = "0F4C5C") {
  const clean = (hex || "").replace("#", "");
  const value = /^[0-9A-Fa-f]{6}$/.test(clean) ? clean : fallback;
  return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(0.09, 0.13, 0.2), options: Partial<PDFPageDrawTextOptions> = {}) {
  page.drawText(text, { x, y, font, size, color, ...options });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function formatUsd(v: number) {
  return `US$ ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDop(v: number) {
  return `RD$ ${Math.round(v).toLocaleString("es-DO")}`;
}

function formatNum(v: number) {
  return Math.round(v).toLocaleString("es-DO");
}

async function loadImage(pdf: PDFDocument, base64?: string) {
  if (!base64) return null;
  try {
    const data = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    if (base64.includes("image/png")) return await pdf.embedPng(bytes);
    return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function buildProposalPdf(input: PdfProposalInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const primary = hexToRgb(input.company.primaryColor, "0F4C5C");
  const secondary = hexToRgb(input.company.secondaryColor, "2F7D32");
  const accent = hexToRgb(input.company.accentColor, "F2A900");
  const ink = rgb(0.09, 0.13, 0.2);
  const muted = rgb(0.4, 0.45, 0.55);
  const light = rgb(0.95, 0.96, 0.98);
  const white = rgb(1, 1, 1);

  const date = input.date || new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date());
  const quoteSubtotal = input.quoteItems.reduce((sum, item) => sum + item.amountUsd, 0);
  const quoteTax = input.result.costUsd > 0 ? input.result.itbisUsd * (quoteSubtotal / input.result.costUsd) : 0;
  const quoteTotalDop = (quoteSubtotal + quoteTax) * (input.project.exchangeRate || 0);
  const quotePricePerWp = input.result.installedKwp > 0 ? (quoteSubtotal + quoteTax) / (input.result.installedKwp * 1000) : 0;
  const quoteTotal = quoteSubtotal + quoteTax;
  const logo = await loadImage(pdf, input.company.logoBase64);
  const cover = await loadImage(pdf, input.company.coverImageBase64);

  // ============ PÁGINA 1: PORTADA ============
  const page1 = pdf.addPage([PAGE_W, PAGE_H]);

  // Fondo superior con color primario
  drawRect(page1, 0, PAGE_H - 260, PAGE_W, 260, primary);

  // Logo o nombre
  if (logo) {
    const dims = logo.scale(0.5);
    page1.drawImage(logo, { x: MARGIN, y: PAGE_H - 120, width: Math.min(dims.width, 120), height: Math.min(dims.height, 50) });
  } else {
    drawText(page1, input.company.name.toUpperCase(), MARGIN, PAGE_H - 90, helveticaBold, 18, white);
  }

  // Título principal
  drawText(page1, "PROPUESTA", MARGIN, PAGE_H - 190, helveticaBold, 44, white);
  drawText(page1, "ENERGÉTICA", MARGIN, PAGE_H - 230, helveticaBold, 44, accent);
  drawText(page1, "SISTEMA SOLAR FOTOVOLTAICO", MARGIN, PAGE_H - 255, helvetica, 12, white);

  // Imagen de portada
  if (cover) {
    const coverW = CONTENT_W;
    const coverH = 180;
    const coverY = PAGE_H - 260 - coverH - 20;
    page1.drawImage(cover, { x: MARGIN, y: coverY, width: coverW, height: coverH });
    drawRect(page1, MARGIN, coverY, coverW, coverH, primary);
  } else {
    drawRect(page1, MARGIN, PAGE_H - 460, CONTENT_W, 180, light);
    drawText(page1, "FOTOGRAFÍA AÉREA / PROYECTO", MARGIN + 20, PAGE_H - 400, helveticaBold, 14, primary);
    drawText(page1, input.project.city, MARGIN + 20, PAGE_H - 380, helvetica, 12, muted);
  }

  // Bloque "PREPARADO PARA"
  const prepY = PAGE_H - 500;
  drawRect(page1, MARGIN, prepY - 20, CONTENT_W, 100, light);
  drawText(page1, "PREPARADO PARA", MARGIN + 16, prepY + 60, helveticaBold, 11, secondary);
  drawText(page1, input.customer.name, MARGIN + 16, prepY + 36, helveticaBold, 20, ink);
  drawText(page1, input.customer.address || input.project.city, MARGIN + 16, prepY + 16, helvetica, 11, muted);

  // Badges de métricas
  const badgeY = prepY - 60;
  const badgeW = (CONTENT_W - 20) / 2;
  drawRect(page1, MARGIN, badgeY - 50, badgeW, 50, primary);
  drawText(page1, `${formatNum(input.result.annualGeneration)} kWh`, MARGIN + 12, badgeY - 12, helveticaBold, 16, white);
  drawText(page1, "GENERADOS / AÑO", MARGIN + 12, badgeY - 30, helvetica, 9, white);

  drawRect(page1, MARGIN + badgeW + 20, badgeY - 50, badgeW, 50, accent);
  drawText(page1, "25+", MARGIN + badgeW + 32, badgeY - 12, helveticaBold, 16, ink);
  drawText(page1, "AÑOS DE VIDA ÚTIL", MARGIN + badgeW + 32, badgeY - 30, helvetica, 9, ink);

  // Pie de página
  drawLine(page1, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page1, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page1, "01", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 2: DESCRIPCIÓN ============
  const page2 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page2, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page2, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page2, "01", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  let y = PAGE_H - 100;
  drawText(page2, "Descripción del Proyecto y Objetivos", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page2, `Titular: ${input.customer.name}  |  Cuenta: ${input.customer.nic || "N/D"}  |  Fecha: ${date}`, MARGIN, y, helvetica, 10, muted);
  y -= 30;

  const description = `El proyecto plantea una solución de abastecimiento energético para ${input.customer.name}, fundamentada en una generación estimada de ${formatNum(input.result.monthlyGenerationBase)} kWh/mes, equivalente a ${formatNum(input.result.annualGeneration)} kWh/año, mediante un sistema solar fotovoltaico de alta eficiencia diseñado a la medida por ${input.company.name}.`;
  const words = description.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (helvetica.widthOfTextAtSize(test, 11) > CONTENT_W) {
      drawText(page2, line, MARGIN, y, helvetica, 11, ink);
      y -= 18;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    drawText(page2, line, MARGIN, y, helvetica, 11, ink);
    y -= 30;
  }

  // Objetivos
  drawText(page2, "OBJETIVOS DEL PROYECTO", MARGIN, y, helveticaBold, 13, primary);
  y -= 24;
  const objectives = [
    ["Eficiencia energética", "Lograr un suministro eléctrico eficiente y sostenible para la operación del cliente."],
    ["Sostenibilidad", "Contribuir con la preservación del medio ambiente mediante fuentes renovables."],
    ["Ahorro fiscal", "Reducir costos energéticos mediante autogeneración y los beneficios de la Ley 57-07."],
    ["Independencia", "Disminuir la exposición a las alzas tarifarias y a las interrupciones del servicio."],
  ];
  for (const [title, desc] of objectives) {
    drawRect(page2, MARGIN, y - 34, 4, 34, secondary);
    drawText(page2, title, MARGIN + 16, y - 12, helveticaBold, 11, ink);
    drawText(page2, desc, MARGIN + 16, y - 26, helvetica, 9, muted);
    y -= 48;
  }

  y -= 10;
  drawRect(page2, MARGIN, y - 50, CONTENT_W, 50, light);
  drawText(page2, "Importante.", MARGIN + 12, y - 16, helveticaBold, 9, primary);
  drawText(page2, "El cálculo de generación está basado en el promedio de consumo energético reflejado en las facturas eléctricas del cliente.", MARGIN + 12, y - 30, helvetica, 9, muted);
  y -= 70;

  // Marco regulatorio
  drawText(page2, "MARCO REGULATORIO — INYECCIÓN A LA RED", MARGIN, y, helveticaBold, 13, primary);
  y -= 20;
  const regulatory = `De acuerdo con la normativa vigente de la Superintendencia de Electricidad (SIE), los nuevos clientes de las categorías BTS-1 (residencial) y BTS-2 (comercial de baja demanda) están sujetos a un cargo equivalente a un porcentaje del valor de la tarifa eléctrica sobre la energía inyectada a la red, como contraprestación por el uso de la infraestructura de distribución. Este cargo aplica únicamente a la energía exportada — no a la energía autoconsumida en sitio. ${input.company.name} diseña cada sistema para maximizar el autoconsumo y minimizar el impacto de esta regulación.`;
  const regWords = regulatory.split(" ");
  line = "";
  for (const word of regWords) {
    const test = line ? `${line} ${word}` : word;
    if (helvetica.widthOfTextAtSize(test, 9) > CONTENT_W) {
      drawText(page2, line, MARGIN, y, helvetica, 9, ink);
      y -= 14;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) drawText(page2, line, MARGIN, y, helvetica, 9, ink);

  drawLine(page2, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page2, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page2, "02", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 3: COTIZACIÓN ============
  const page3 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page3, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page3, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page3, "02", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  y = PAGE_H - 100;
  drawText(page3, "Inversión y Cotización del Sistema", MARGIN, y, helveticaBold, 18, primary);
  y -= 24;
  drawText(page3, `Sistema solar fotovoltaico de ${input.result.installedKwp.toFixed(2)} kWp  →  generación estimada ${formatNum(input.result.monthlyGenerationBase)} kWh/mes  |  ${formatNum(input.result.annualGeneration)} kWh/año`, MARGIN, y, helvetica, 10, ink);
  y -= 20;
  drawText(page3, `— ${input.result.panelCount} módulos bifaciales ${input.project.panelWatts} W  |  — Inversor ${input.project.inverter || "por seleccionar"}  |  — Monitoreo incluido`, MARGIN, y, helvetica, 10, ink);
  y -= 40;

  // Tabla de cotización
  const col1 = MARGIN;
  const col2 = MARGIN + 260;
  const col3 = PAGE_W - MARGIN - 120;
  const headerY = y;
  drawRect(page3, MARGIN, headerY - 24, CONTENT_W, 24, primary);
  drawText(page3, "CONCEPTO", col1 + 10, headerY - 8, helveticaBold, 10, white);
  drawText(page3, "CAPACIDAD", col2 + 10, headerY - 8, helveticaBold, 10, white);
  drawText(page3, "MONTO", col3 + 10, headerY - 8, helveticaBold, 10, white);
  y -= 40;

  for (const item of input.quoteItems) {
    drawRect(page3, MARGIN, y - 24, CONTENT_W, 24, light);
    drawText(page3, item.name, col1 + 10, y - 8, helvetica, 10, ink);
    drawText(page3, item.description || "Incluido", col2 + 10, y - 8, helvetica, 10, muted);
    drawText(page3, formatUsd(item.amountUsd), col3 + 10, y - 8, helveticaBold, 10, ink);
    y -= 30;
  }

  // Totales
  y -= 10;
  drawRect(page3, MARGIN, y - 24, CONTENT_W, 24, light);
  drawText(page3, "Sub-Total", col1 + 10, y - 8, helveticaBold, 11, ink);
  drawText(page3, formatUsd(quoteSubtotal), col3 + 10, y - 8, helveticaBold, 11, ink);
  y -= 30;
  drawRect(page3, MARGIN, y - 24, CONTENT_W, 24, light);
  drawText(page3, "ITBIS", col1 + 10, y - 8, helveticaBold, 11, ink);
  const quoteTax = input.result.costUsd > 0 ? input.result.itbisUsd * (quoteSubtotal / input.result.costUsd) : 0;
  drawText(page3, formatUsd(quoteTax), col3 + 10, y - 8, helveticaBold, 11, ink);
  y -= 34;
  drawRect(page3, MARGIN, y - 30, CONTENT_W, 30, primary);
  drawText(page3, "INVERSIÓN TOTAL", col1 + 10, y - 10, helveticaBold, 13, white);
  drawText(page3, formatUsd(quoteSubtotal + quoteTax), col3 + 10, y - 10, helveticaBold, 13, white);
  y -= 50;
  drawRect(page3, MARGIN, y - 24, CONTENT_W, 24, light);
  drawText(page3, "EQUIVALENTE EN RD$", col1 + 10, y - 8, helveticaBold, 11, ink);
  drawText(page3, `RD$ ${Math.round(quoteTotalDop).toLocaleString("es-DO")}`, col3 + 10, y - 8, helveticaBold, 11, ink);
  y -= 30;
  drawRect(page3, MARGIN, y - 24, CONTENT_W, 24, light);
  drawText(page3, "PRECIO POR Wp", col1 + 10, y - 8, helveticaBold, 11, ink);
  drawText(page3, formatUsd(quotePricePerWp), col3 + 10, y - 8, helveticaBold, 11, ink);
  y -= 30;
  drawText(page3, "* Precio general por kWp instalado, llave en mano — no se desglosa por componente. Equipos sujetos a disponibilidad del fabricante.", MARGIN, y, helveticaOblique, 8, muted);

  drawLine(page3, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page3, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page3, "03", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 4: ANÁLISIS ============
  const page4 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page4, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page4, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page4, "03", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  y = PAGE_H - 100;
  drawText(page4, "Análisis de Consumo y Producción Solar", MARGIN, y, helveticaBold, 18, primary);
  y -= 30;

  // Métricas
  const metricW = (CONTENT_W - 20) / 3;
  drawRect(page4, MARGIN, y - 50, metricW, 50, primary);
  drawText(page4, formatDop(input.result.annualSavingsDop), MARGIN + 10, y - 14, helveticaBold, 14, white);
  drawText(page4, "AHORRO ANUAL ESTIMADO", MARGIN + 10, y - 30, helvetica, 8, white);

  drawRect(page4, MARGIN + metricW + 10, y - 50, metricW, 50, secondary);
  drawText(page4, `${formatNum(input.result.annualGeneration)} kWh`, MARGIN + metricW + 20, y - 14, helveticaBold, 14, white);
  drawText(page4, "GENERACIÓN ANUAL", MARGIN + metricW + 20, y - 30, helvetica, 8, white);

  drawRect(page4, MARGIN + 2 * (metricW + 10), y - 50, metricW, 50, accent);
  drawText(page4, `~${input.result.co2AvoidedTons.toFixed(1)} Ton`, MARGIN + 2 * (metricW + 10) + 10, y - 14, helveticaBold, 14, ink);
  drawText(page4, "CO₂ EVITADO / AÑO", MARGIN + 2 * (metricW + 10) + 10, y - 30, helvetica, 8, ink);

  y -= 80;

  // Tabla mensual
  const tableW = CONTENT_W;
  const colWidths = [tableW * 0.25, tableW * 0.25, tableW * 0.25, tableW * 0.25];
  const rowH = 20;
  const headerRowY = y;
  drawRect(page4, MARGIN, headerRowY - rowH, tableW, rowH, primary);
  const headers = ["MES", "CONSUMO kWh", "GENERACIÓN kWh", "COBERTURA"];
  let cx = MARGIN;
  headers.forEach((h, i) => {
    drawText(page4, h, cx + 8, headerRowY - 14, helveticaBold, 9, white);
    cx += colWidths[i];
  });
  y -= rowH + 2;

  MONTHS.forEach((month, index) => {
    const rowY = y;
    drawRect(page4, MARGIN, rowY - rowH, tableW, rowH, index % 2 ? light : white);
    const cells = [
      month,
      formatNum(input.consumption[index]),
      formatNum(input.result.monthlyGeneration[index]),
      `${input.result.monthlyCoverage[index].toFixed(1)}%`,
    ];
    cx = MARGIN;
    cells.forEach((cell, i) => {
      drawText(page4, cell, cx + 8, rowY - 14, i === 3 ? helveticaBold : helvetica, 9, i === 3 && input.result.monthlyCoverage[index] >= 100 ? secondary : ink);
      cx += colWidths[i];
    });
    y -= rowH;
  });

  y -= 20;
  drawText(page4, "Datos de ejemplo — el gráfico real se genera a partir del levantamiento de consumo del cliente.", MARGIN, y, helveticaOblique, 8, muted);
  y -= 16;
  drawText(page4, "Importante. La generación estimada dependerá de las condiciones climatológicas del sitio. El ahorro proyectado tiene un margen de +/-5%.", MARGIN, y, helveticaOblique, 8, muted);

  drawLine(page4, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page4, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page4, "04", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 5: MARCO LEGAL ============
  const page5 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page5, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page5, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page5, "04", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  y = PAGE_H - 100;
  drawText(page5, "Marco Legal y Beneficios", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page5, "Ley 57-07", MARGIN, y, helveticaBold, 14, secondary);
  y -= 30;

  drawText(page5, "BENEFICIOS DE LA LEY 57-07", MARGIN, y, helveticaBold, 12, primary);
  y -= 24;
  const benefits = [
    ["Exención de impuestos de importación", "Cap. III — Art. 9"],
    ["Exención de impuesto sobre la renta", "Cap. III — Art. 10"],
    ["Reducción de impuestos por financiamiento externo", "Cap. III — Art. 11"],
    ["Crédito fiscal hasta 40% del costo de inversión", "Cap. III — Art. 12"],
  ];
  for (const [benefit, ref] of benefits) {
    drawRect(page5, MARGIN, y - 24, CONTENT_W, 24, light);
    drawText(page5, benefit, MARGIN + 10, y - 8, helvetica, 10, ink);
    drawText(page5, ref, PAGE_W - MARGIN - 10, y - 8, helveticaBold, 10, secondary, { align: "right" });
    y -= 30;
  }

  y -= 20;
  drawText(page5, "NOTAS Y DATOS IMPORTANTES", MARGIN, y, helveticaBold, 12, primary);
  y -= 24;
  const notes = [
    "Los pagos se realizan en USD o DOP a la tasa de venta del Banco Central del día.",
    "Los sistemas de inyección a red dejan de producir si se interrumpe el suministro eléctrico.",
    "El cálculo estimado se basa en el promedio de consumo anual del cliente.",
    "Equipos sujetos a disponibilidad; pueden reemplazarse por similares o superiores.",
  ];
  for (const note of notes) {
    drawText(page5, `—  ${note}`, MARGIN + 10, y, helvetica, 10, ink);
    y -= 20;
  }

  y -= 20;
  drawRect(page5, MARGIN, y - 50, CONTENT_W, 50, light);
  drawText(page5, "Importante.", MARGIN + 12, y - 16, helveticaBold, 9, primary);
  drawText(page5, "El cliente deberá cubrir entre RD$7,800 – RD$12,000 anuales durante 3 años por gastos de exoneración de impuestos (Ley 57-07).", MARGIN + 12, y - 30, helvetica, 9, muted);

  drawLine(page5, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page5, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page5, "05", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 6: GARANTÍAS ============
  const page6 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page6, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page6, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page6, "05", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  y = PAGE_H - 100;
  drawText(page6, "Garantías del Sistema", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page6, "Respaldo total en equipos y servicio", MARGIN, y, helvetica, 12, muted);
  y -= 40;

  const warranties = [
    ["Panel Solar Fotovoltaico", "GARANTÍA DEL PRODUCTO", "10 años", "GARANTÍA DE RENDIMIENTO", "30 años", primary],
    ["Inversor de Red", "GARANTÍA DEL PRODUCTO", "5 años", "GARANTÍA DE RENDIMIENTO", "10 años", secondary],
    ["Soporte Técnico", "SOPORTE INCLUIDO", "2 años", "ASISTENCIA", "24/7", accent],
  ] as const;

  for (const [title, label1, value1, label2, value2, color] of warranties) {
    drawRect(page6, MARGIN, y - 80, CONTENT_W, 80, light);
    drawRect(page6, MARGIN, y - 80, 6, 80, color);
    drawText(page6, title, MARGIN + 20, y - 20, helveticaBold, 14, ink);
    drawText(page6, label1, MARGIN + 20, y - 40, helvetica, 9, muted);
    drawText(page6, value1, MARGIN + 20, y - 56, helveticaBold, 12, color);
    drawText(page6, label2, MARGIN + 200, y - 40, helvetica, 9, muted);
    drawText(page6, value2, MARGIN + 200, y - 56, helveticaBold, 12, color);
    y -= 100;
  }

  y -= 20;
  drawRect(page6, MARGIN, y - 40, CONTENT_W, 40, primary);
  drawText(page6, `${input.company.name.toUpperCase()}  ·  25+ AÑOS DE VIDA ÚTIL  ·  0 EMISIÓN DE CO₂  ·  SOPORTE TÉCNICO 24/7`, PAGE_W / 2, y - 14, helveticaBold, 9, white, { align: "center" });

  drawLine(page6, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page6, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page6, "06", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 7: FASES ============
  const page7 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page7, 0, PAGE_H - 60, PAGE_W, 60, primary);
  drawText(page7, "PROPUESTA ENERGÉTICA", MARGIN, PAGE_H - 30, helveticaBold, 16, white);
  drawText(page7, "06", PAGE_W - MARGIN, PAGE_H - 30, helveticaBold, 16, accent, { align: "right" });

  y = PAGE_H - 100;
  drawText(page7, "Fases del Proyecto", MARGIN, y, helveticaBold, 18, primary);
  y -= 20;
  drawText(page7, "Proceso de implementación paso a paso", MARGIN, y, helvetica, 12, muted);
  y -= 40;

  const phases = [
    ["Aprobación Distribuidora", "Evaluación y aprobación por parte de la distribuidora eléctrica."],
    ["Instalación de Equipos", "Montaje de paneles, inversor, estructura y cableado en sitio."],
    ["Visita de Supervisión", "Inspección técnica oficial de la instalación."],
    ["Acuerdos de Interconexión", "Firma de documentos de conexión a la red eléctrica."],
    ["Carta Medidor Bidireccional", "Emisión de carta oficial para instalación del medidor."],
    ["Instalación del Medidor", "Instalación del contador bidireccional por la distribuidora."],
    ["Arranque del Sistema", "Puesta en marcha y verificación del sistema fotovoltaico."],
  ];

  phases.forEach(([title, desc], index) => {
    const isLast = index === phases.length - 1;
    drawRect(page7, MARGIN, y - 40, 40, 40, isLast ? accent : primary);
    drawText(page7, String(index + 1), MARGIN + 20, y - 14, helveticaBold, 16, isLast ? ink : white, { align: "center" });
    drawText(page7, title, MARGIN + 60, y - 14, helveticaBold, 12, ink);
    drawText(page7, desc, MARGIN + 60, y - 28, helvetica, 9, muted);
    y -= 52;
  });

  y -= 20;
  drawRect(page7, MARGIN, y - 50, CONTENT_W, 50, light);
  drawText(page7, "Importante.", MARGIN + 12, y - 16, helveticaBold, 9, primary);
  drawText(page7, "Cada proceso está sujeto a las reglas de la distribuidora eléctrica. La empresa no es responsable de atrasos causados por dicha institución, y gestiona todos los trámites ante CNE, distribuidoras y DGII.", MARGIN + 12, y - 30, helvetica, 9, muted);

  drawLine(page7, MARGIN, 40, PAGE_W - MARGIN, 40, primary, 2);
  drawText(page7, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 28, helveticaBold, 8, primary, { align: "right" });
  drawText(page7, "07", PAGE_W - MARGIN, 16, helvetica, 8, muted, { align: "right" });

  // ============ PÁGINA 8: CONTRAportada ============
  const page8 = pdf.addPage([PAGE_W, PAGE_H]);
  drawRect(page8, 0, 0, PAGE_W, PAGE_H, primary);

  if (cover) {
    const coverW = PAGE_W;
    const coverH = 300;
    page8.drawImage(cover, { x: 0, y: PAGE_H - coverH, width: coverW, height: coverH });
  }

  drawText(page8, "Transformemos su energía", PAGE_W / 2, PAGE_H - 380, helveticaBold, 28, white, { align: "center" });
  drawText(page8, "Solicite su cotización sin compromiso — sin costo ni obligación.", PAGE_W / 2, PAGE_H - 410, helvetica, 12, white, { align: "center" });

  const contactY = PAGE_H - 480;
  drawText(page8, "TELÉFONO", PAGE_W / 2, contactY, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.phone || "N/D", PAGE_W / 2, contactY - 18, helvetica, 12, white, { align: "center" });
  drawText(page8, "EMAIL", PAGE_W / 2, contactY - 50, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.email || "N/D", PAGE_W / 2, contactY - 68, helvetica, 12, white, { align: "center" });
  drawText(page8, "UBICACIÓN", PAGE_W / 2, contactY - 100, helveticaBold, 10, accent, { align: "center" });
  drawText(page8, input.company.address || "República Dominicana", PAGE_W / 2, contactY - 118, helvetica, 12, white, { align: "center" });

  const badgeY = 120;
  const badgeW = (PAGE_W - 2 * MARGIN - 20) / 3;
  drawRect(page8, MARGIN, badgeY, badgeW, 50, white);
  drawText(page8, "25+", MARGIN + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "AÑOS VIDA ÚTIL", MARGIN + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawRect(page8, MARGIN + badgeW + 10, badgeY, badgeW, 50, white);
  drawText(page8, "0", MARGIN + badgeW + 10 + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "EMISIÓN CO₂", MARGIN + badgeW + 10 + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawRect(page8, MARGIN + 2 * (badgeW + 10), badgeY, badgeW, 50, white);
  drawText(page8, "24/7", MARGIN + 2 * (badgeW + 10) + badgeW / 2, badgeY + 18, helveticaBold, 16, primary, { align: "center" });
  drawText(page8, "SOPORTE TÉCNICO", MARGIN + 2 * (badgeW + 10) + badgeW / 2, badgeY + 4, helvetica, 8, muted, { align: "center" });

  drawText(page8, `${input.company.name.toUpperCase()}  ·  RD`, PAGE_W / 2, 40, helveticaBold, 12, white, { align: "center" });
  drawText(page8, `${input.company.name.toUpperCase()}  ·  ENERGÍA SOLAR`, PAGE_W - MARGIN, 16, helveticaBold, 8, white, { align: "right" });
  drawText(page8, "08", PAGE_W - MARGIN, 16, helvetica, 8, white, { align: "right" });

  return pdf.save();
}