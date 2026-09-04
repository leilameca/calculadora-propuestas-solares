import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb, type RGB } from "pdf-lib";
import { MONTHS } from "./solar-calculator";
import type { ProposalDocumentInput } from "./docx-builder";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 71;
const CONTENT_W = PAGE_W - MARGIN * 2;
const INK = rgb(15 / 255, 23 / 255, 42 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255);
const LIGHT = rgb(243 / 255, 244 / 255, 246 / 255);
const WHITE = rgb(1, 1, 1);

type Fonts = { regular: PDFFont; bold: PDFFont; display: PDFFont; displayItalic: PDFFont };
type Brand = { primary: RGB; secondary: RGB; accent: RGB };

function color(value: string | undefined, fallback: string): RGB {
  const hex = (value || fallback).replace("#", "");
  const safe = /^[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
  return rgb(parseInt(safe.slice(0, 2), 16) / 255, parseInt(safe.slice(2, 4), 16) / 255, parseInt(safe.slice(4, 6), 16) / 255);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of String(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
      else { if (line) result.push(line); line = word; }
    }
    result.push(line);
  }
  return result;
}

function paragraph(page: PDFPage, text: string, x: number, y: number, options: { font: PDFFont; size?: number; color?: RGB; width?: number; lineHeight?: number } ): number {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size * 1.4;
  const lines = wrap(text, options.font, size, options.width ?? CONTENT_W);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font: options.font, color: options.color ?? INK }));
  return y - lines.length * lineHeight;
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let value = text;
  while (value.length > 3 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) value = value.slice(0, -1);
  return `${value}...`;
}

async function embedDataImage(pdf: PDFDocument, dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return match[1].toLowerCase() === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
}

function header(page: PDFPage, input: ProposalDocumentInput, fonts: Fonts, brand: Brand, pageNumber: number) {
  page.drawText(input.company.name, { x: MARGIN, y: PAGE_H - 43, size: 10, font: fonts.bold, color: brand.primary });
  const contact = [input.company.phone, input.company.email].filter(Boolean).join("  |  ");
  const contactWidth = fonts.regular.widthOfTextAtSize(contact, 8);
  page.drawText(contact, { x: Math.max(MARGIN, PAGE_W - MARGIN - contactWidth), y: PAGE_H - 43, size: 8, font: fonts.regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: PAGE_H - 52 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 52 }, thickness: 1.2, color: brand.primary });
  footer(page, input, fonts, brand, pageNumber);
}

function footer(page: PDFPage, input: ProposalDocumentInput, fonts: Fonts, brand: Brand, pageNumber: number, dark = false) {
  const footerColor = dark ? rgb(.7, .76, .86) : MUTED;
  page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_W - MARGIN, y: 42 }, thickness: .7, color: dark ? rgb(.2, .27, .38) : brand.secondary });
  page.drawText(`RNC ${input.company.rnc || "N/D"}  |  Vigencia: ${input.company.proposalValidityDays || 15} días`, { x: MARGIN, y: 28, size: 7.5, font: fonts.regular, color: footerColor });
  const pageText = String(pageNumber).padStart(2, "0");
  page.drawText(pageText, { x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(pageText, 7.5), y: 28, size: 7.5, font: fonts.regular, color: footerColor });
}

function title(page: PDFPage, index: number, text: string, fonts: Fonts, brand: Brand) {
  page.drawText(String(index).padStart(2, "0"), { x: MARGIN, y: 684, size: 26, font: fonts.displayItalic, color: brand.accent });
  paragraph(page, text, MARGIN + 44, 686, { font: fonts.display, size: 24, width: CONTENT_W - 44, lineHeight: 25 });
}

function metric(page: PDFPage, x: number, y: number, width: number, height: number, value: string, label: string, fonts: Fonts, stroke: RGB, valueColor: RGB = INK) {
  page.drawRectangle({ x, y, width, height, borderColor: stroke, borderWidth: 1, color: WHITE });
  const safeValue = fitText(value, fonts.display, 18, width - 20);
  page.drawText(safeValue, { x: x + (width - fonts.display.widthOfTextAtSize(safeValue, 18)) / 2, y: y + height - 34, size: 18, font: fonts.display, color: valueColor });
  const safeLabel = fitText(label.toUpperCase(), fonts.bold, 7.5, width - 16);
  page.drawText(safeLabel, { x: x + (width - fonts.bold.widthOfTextAtSize(safeLabel, 7.5)) / 2, y: y + 18, size: 7.5, font: fonts.bold, color: MUTED });
}

function drawChart(page: PDFPage, input: ProposalDocumentInput, fonts: Fonts, brand: Brand, x: number, y: number, width: number, height: number) {
  page.drawRectangle({ x, y, width, height, borderColor: rgb(.86, .89, .93), borderWidth: 1, color: WHITE });
  page.drawText("GENERACIÓN VS. CONSUMO - KWH / MES", { x: x + 18, y: y + height - 24, size: 9, font: fonts.bold, color: INK });
  const values = [...input.consumption, ...input.result.monthlyGeneration];
  const max = Math.max(...values, 1) * 1.12;
  const chartX = x + 35, chartY = y + 34, chartW = width - 50, chartH = height - 72;
  for (let line = 0; line <= 4; line += 1) {
    const lineY = chartY + (chartH * line) / 4;
    page.drawLine({ start: { x: chartX, y: lineY }, end: { x: chartX + chartW, y: lineY }, thickness: .5, color: rgb(.9, .92, .95) });
  }
  const groupWidth = chartW / 12;
  input.consumption.forEach((consumption, index) => {
    const solar = input.result.monthlyGeneration[index];
    const barWidth = Math.max(3, groupWidth * .28);
    const left = chartX + index * groupWidth + groupWidth * .16;
    page.drawRectangle({ x: left, y: chartY, width: barWidth, height: Math.max(1, solar / max * chartH), color: brand.primary });
    page.drawRectangle({ x: left + barWidth + 2, y: chartY, width: barWidth, height: Math.max(1, consumption / max * chartH), color: brand.accent });
    const month = MONTHS[index].slice(0, 3).toUpperCase();
    page.drawText(month, { x: chartX + index * groupWidth + 2, y: chartY - 13, size: 5.5, font: fonts.regular, color: MUTED });
  });
}

export async function buildProposalPdf(input: ProposalDocumentInput): Promise<Uint8Array> {
  if (input.consumption.length !== 12) throw new Error("La propuesta requiere 12 consumos mensuales.");
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    display: await pdf.embedFont(StandardFonts.TimesRoman), displayItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
  };
  const brand: Brand = { primary: color(input.company.primaryColor, "0F4C5C"), secondary: color(input.company.secondaryColor, "2F7D32"), accent: color(input.company.accentColor, "F2A900") };
  const coverImage = await embedDataImage(pdf, input.company.coverImageBase64);
  const backImage = await embedDataImage(pdf, input.company.backCoverImageBase64 || input.company.coverImageBase64);
  const date = input.date || new Intl.DateTimeFormat("es-DO", { dateStyle: "long" }).format(new Date());

  // 1. Portada
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawText(input.company.name, { x: MARGIN, y: 745, size: 12, font: fonts.bold, color: brand.primary });
  const coverContact = [input.company.phone, input.company.email].filter(Boolean).join("  |  ");
  page.drawText(fitText(coverContact, fonts.regular, 8, 220), { x: 321, y: 745, size: 8, font: fonts.regular, color: MUTED });
  if (coverImage) page.drawImage(coverImage, { x: MARGIN, y: 515, width: CONTENT_W, height: 190 });
  else page.drawRectangle({ x: MARGIN, y: 515, width: CONTENT_W, height: 190, color: brand.primary });
  page.drawText("PROPUESTA", { x: MARGIN, y: 468, size: 34, font: fonts.display, color: INK });
  page.drawText("ENERGÉTICA", { x: MARGIN, y: 430, size: 34, font: fonts.displayItalic, color: brand.secondary });
  page.drawText("SISTEMA SOLAR FOTOVOLTAICO", { x: MARGIN, y: 402, size: 8, font: fonts.bold, color: brand.accent });
  page.drawRectangle({ x: MARGIN, y: 265, width: CONTENT_W, height: 105, borderColor: rgb(.85, .88, .93), borderWidth: 1, color: WHITE });
  const meta = [["PREPARADO PARA", input.customer.name], ["CAPACIDAD", `${input.result.installedKwp.toFixed(2)} kWp`], ["NIC", input.customer.nic || "N/D"], ["UBICACIÓN", input.customer.address || input.project.city], ["FECHA", date], ["PROPUESTA", input.proposalNumber || "BORRADOR"]];
  meta.forEach(([label, value], index) => { const col = index % 3, row = Math.floor(index / 3); const x = MARGIN + 18 + col * (CONTENT_W / 3); const y = 340 - row * 48; page.drawText(label, { x, y, size: 7, font: fonts.bold, color: MUTED }); page.drawText(fitText(value, fonts.bold, 10, CONTENT_W / 3 - 24), { x, y: y - 17, size: 10, font: fonts.bold, color: INK }); });
  const gap = 10, cardW = (CONTENT_W - gap * 2) / 3;
  metric(page, MARGIN, 145, cardW, 88, `${Math.round(input.result.annualGeneration).toLocaleString("es-DO")}`, "kWh generados / año", fonts, brand.primary);
  metric(page, MARGIN + cardW + gap, 145, cardW, 88, "25+", "años de vida útil", fonts, brand.secondary);
  metric(page, MARGIN + (cardW + gap) * 2, 145, cardW, 88, `RD$ ${Math.round(input.result.annualSavingsDop).toLocaleString("es-DO")}`, "ahorro anual estimado", fonts, brand.accent, brand.accent);
  footer(page, input, fonts, brand, 1);

  // 2. Descripción y regulación
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 2); title(page, 1, "Descripción del Proyecto y Objetivos", fonts, brand);
  let y = 606;
  y = paragraph(page, `El proyecto plantea una solución de abastecimiento energético para ${input.customer.name}, basada en una generación estimada de ${Math.round(input.result.annualGeneration / 12).toLocaleString("es-DO")} kWh/mes y ${Math.round(input.result.annualGeneration).toLocaleString("es-DO")} kWh/año mediante un sistema solar fotovoltaico de alta eficiencia.`, MARGIN, y, { font: fonts.regular, size: 11, lineHeight: 17 });
  page.drawText("OBJETIVOS DEL PROYECTO", { x: MARGIN, y: y - 20, size: 8, font: fonts.bold, color: MUTED }); y -= 45;
  [["Eficiencia energética", "Reducir el costo energético con generación distribuida."], ["Sostenibilidad", "Disminuir la huella de carbono con energía renovable."], ["Estabilidad", "Reducir la exposición a variaciones tarifarias."], ["Monitoreo", "Dar seguimiento al desempeño y a la producción."]].forEach(([heading, copy], index) => { const col = index % 2, row = Math.floor(index / 2); const bx = MARGIN + col * (CONTENT_W / 2); const by = y - row * 66; page.drawLine({ start: { x: bx, y: by + 7 }, end: { x: bx, y: by - 35 }, thickness: 1.2, color: brand.accent }); page.drawText(heading, { x: bx + 12, y: by, size: 10, font: fonts.bold, color: INK }); paragraph(page, copy, bx + 12, by - 17, { font: fonts.regular, size: 8.5, color: MUTED, width: CONTENT_W / 2 - 24, lineHeight: 11 }); });
  page.drawRectangle({ x: MARGIN, y: 300, width: CONTENT_W, height: 62, color: LIGHT }); page.drawLine({ start: { x: MARGIN + 16, y: 348 }, end: { x: MARGIN + 16, y: 314 }, thickness: 2, color: brand.accent }); paragraph(page, `Importante. El promedio de consumo usado es ${Math.round(input.result.averageMonthlyConsumption).toLocaleString("es-DO")} kWh/mes, calculado con los meses efectivamente facturados seleccionados.`, MARGIN + 30, 339, { font: fonts.bold, size: 9, width: CONTENT_W - 45, lineHeight: 13 });
  page.drawRectangle({ x: MARGIN, y: 125, width: CONTENT_W, height: 145, borderColor: rgb(.84, .88, .93), borderWidth: 1, color: WHITE }); page.drawText("MARCO REGULATORIO - INYECCIÓN A LA RED", { x: MARGIN + 18, y: 245, size: 9, font: fonts.bold, color: INK }); paragraph(page, "Para clientes en tarifas BTS-1 y BTS-2 de EDENORTE, EDESUR o EDEESTE, la energía inyectada a la red está sujeta al cargo regulatorio aplicable del 25%. La valorización final depende del esquema de medición, los acuerdos de interconexión y la regulación vigente al momento de aprobación.", MARGIN + 18, 221, { font: fonts.regular, size: 9, width: CONTENT_W - 36, lineHeight: 14 });

  // 3. Cotización
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 3); title(page, 2, "Inversión y Cotización del Sistema", fonts, brand);
  page.drawRectangle({ x: MARGIN, y: 585, width: CONTENT_W, height: 54, color: brand.primary }); paragraph(page, `Sistema solar de ${input.result.installedKwp.toFixed(2)} kWp > ${Math.round(input.result.annualGeneration / 12).toLocaleString("es-DO")} kWh/mes | ${Math.round(input.result.annualGeneration).toLocaleString("es-DO")} kWh/año`, MARGIN + 18, 614, { font: fonts.bold, size: 10, color: WHITE, width: CONTENT_W - 36, lineHeight: 13 });
  const tableTop = 545, rowH = 32, col1 = 245, col2 = 100, col3 = CONTENT_W - col1 - col2;
  page.drawText("CONCEPTO", { x: MARGIN + 8, y: tableTop, size: 7.5, font: fonts.bold, color: MUTED }); page.drawText("CANT.", { x: MARGIN + col1 + 8, y: tableTop, size: 7.5, font: fonts.bold, color: MUTED }); page.drawText("MONTO USD", { x: MARGIN + col1 + col2 + 8, y: tableTop, size: 7.5, font: fonts.bold, color: MUTED });
  let rowY = tableTop - 18;
  input.quoteItems.forEach((item, index) => { page.drawRectangle({ x: MARGIN, y: rowY - rowH + 8, width: CONTENT_W, height: rowH, color: index % 2 ? LIGHT : WHITE, borderColor: rgb(.87, .89, .92), borderWidth: .5 }); page.drawText(fitText(item.name, fonts.regular, 8.5, col1 - 16), { x: MARGIN + 8, y: rowY - 11, size: 8.5, font: fonts.regular, color: INK }); page.drawText(String(item.quantity || 1), { x: MARGIN + col1 + 8, y: rowY - 11, size: 8.5, font: fonts.regular, color: INK }); const amount = `US$ ${item.amountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; page.drawText(amount, { x: PAGE_W - MARGIN - 8 - fonts.bold.widthOfTextAtSize(amount, 8.5), y: rowY - 11, size: 8.5, font: fonts.bold, color: INK }); rowY -= rowH; });
  const subtotal = input.quoteItems.reduce((sum, item) => sum + item.amountUsd, 0);
  const totals: Array<[string, number, boolean]> = [["SUB-TOTAL", subtotal, false]];
  if (input.result.itbisUsd > 0) totals.push(["ITBIS", input.result.itbisUsd, false]);
  totals.push(["INVERSIÓN TOTAL", input.result.totalUsd, true], ["PRECIO POR Wp", input.result.pricePerWpUsd, false]);
  totals.forEach(([label, amount, highlight]) => { page.drawRectangle({ x: MARGIN, y: rowY - 28, width: CONTENT_W, height: 32, color: highlight ? brand.primary : LIGHT }); page.drawText(label, { x: MARGIN + 10, y: rowY - 16, size: highlight ? 10 : 8.5, font: fonts.bold, color: highlight ? WHITE : MUTED }); const value = label === "PRECIO POR Wp" ? `US$ ${amount.toFixed(2)} / Wp` : `US$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; page.drawText(value, { x: PAGE_W - MARGIN - 10 - fonts.bold.widthOfTextAtSize(value, highlight ? 10 : 8.5), y: rowY - 16, size: highlight ? 10 : 8.5, font: fonts.bold, color: highlight ? WHITE : INK }); rowY -= 34; });
  paragraph(page, "Equipos sujetos a disponibilidad del fabricante. Todo cambio de alcance debe cotizarse por escrito.", MARGIN, Math.max(88, rowY - 25), { font: fonts.displayItalic, size: 8, color: MUTED });

  // 4. Análisis
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 4); title(page, 3, "Análisis de Consumo y Producción Solar", fonts, brand);
  metric(page, MARGIN, 545, cardW, 84, `RD$ ${Math.round(input.result.annualSavingsDop).toLocaleString("es-DO")}`, "ahorro anual", fonts, brand.accent, brand.accent);
  metric(page, MARGIN + cardW + gap, 545, cardW, 84, `${Math.round(input.result.annualGeneration).toLocaleString("es-DO")}`, "generación anual kWh", fonts, brand.primary);
  metric(page, MARGIN + (cardW + gap) * 2, 545, cardW, 84, `${input.result.co2AvoidedTons.toFixed(1)} t`, "CO2 evitado / año", fonts, brand.secondary, brand.secondary);
  drawChart(page, input, fonts, brand, MARGIN, 195, CONTENT_W, 315);
  page.drawRectangle({ x: MARGIN, y: 104, width: CONTENT_W, height: 58, color: LIGHT }); paragraph(page, "Importante. La generación estimada depende de las condiciones climáticas, sombras, suciedad, disponibilidad de red y tolerancias de los equipos.", MARGIN + 18, 139, { font: fonts.regular, size: 8.5, width: CONTENT_W - 36, lineHeight: 12 });

  // 5. Condiciones generales
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 5); title(page, 4, "Condiciones Generales", fonts, brand);
  const conditions = ["Los pagos se realizan en USD o DOP a la tasa de venta acordada o a la referencia del Banco Central del día.", "Los sistemas On-Grid dejan de producir cuando se interrumpe el suministro eléctrico, salvo que exista respaldo compatible.", "La producción es una estimación de ingeniería basada en consumos, irradiancia, pérdidas y parámetros declarados.", "Equipos sujetos a disponibilidad; cualquier sustitución debe ser técnicamente equivalente o superior.", "Obras civiles, refuerzos de techo, permisos y cargos de terceros se incluyen solo cuando estén descritos."];
  y = 595; conditions.forEach((copy, index) => { const fill = index % 2 ? WHITE : LIGHT; page.drawRectangle({ x: MARGIN, y: y - 52, width: CONTENT_W, height: 58, color: fill }); page.drawRectangle({ x: MARGIN, y: y - 52, width: 42, height: 58, color: index % 2 ? brand.secondary : brand.primary }); page.drawText(String(index + 1).padStart(2, "0"), { x: MARGIN + 13, y: y - 25, size: 12, font: fonts.bold, color: WHITE }); paragraph(page, copy, MARGIN + 56, y - 12, { font: fonts.regular, size: 9.5, width: CONTENT_W - 70, lineHeight: 14 }); y -= 72; });

  // 6. Garantías
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 6); title(page, 5, "Garantías del Sistema", fonts, brand);
  const warrantyData = [["PANEL SOLAR", "Producto", "Según fabricante", "Rendimiento", "Hasta 25 años"], ["INVERSOR", "Producto", "Según modelo", "Cobertura", input.project.inverter || "Por seleccionar"], ["SOPORTE TÉCNICO", "Empresa", input.company.name, "Servicio", "Según contrato"]];
  const warrantyW = (CONTENT_W - 20) / 3;
  warrantyData.forEach((item, index) => { const x = MARGIN + index * (warrantyW + 10); page.drawRectangle({ x, y: 290, width: warrantyW, height: 315, borderColor: index === 1 ? brand.accent : rgb(.84, .88, .93), borderWidth: 1, color: WHITE }); page.drawText(item[0], { x: x + 16, y: 565, size: 10, font: fonts.bold, color: INK }); page.drawText(item[1].toUpperCase(), { x: x + 16, y: 510, size: 7, font: fonts.bold, color: MUTED }); paragraph(page, item[2], x + 16, 490, { font: fonts.display, size: 13, width: warrantyW - 32, lineHeight: 15 }); page.drawText(item[3].toUpperCase(), { x: x + 16, y: 420, size: 7, font: fonts.bold, color: MUTED }); paragraph(page, item[4], x + 16, 400, { font: fonts.display, size: 13, color: index === 1 ? brand.accent : brand.secondary, width: warrantyW - 32, lineHeight: 15 }); });
  page.drawRectangle({ x: MARGIN, y: 205, width: CONTENT_W, height: 54, color: brand.primary }); page.drawText(`${input.company.name.toUpperCase()}  |  25+ AÑOS DE VIDA ÚTIL  |  SOPORTE TÉCNICO`, { x: MARGIN + 18, y: 226, size: 8.5, font: fonts.bold, color: WHITE });

  // 7. Fases
  page = pdf.addPage([PAGE_W, PAGE_H]); header(page, input, fonts, brand, 7); title(page, 6, "Fases del Proyecto", fonts, brand);
  page.drawText("PROCESO DE IMPLEMENTACIÓN PASO A PASO", { x: MARGIN, y: 620, size: 8, font: fonts.bold, color: MUTED });
  const phases = ["Aprobación distribuidora", "Instalación de equipos", "Visita de supervisión", "Acuerdos de interconexión", "Carta medidor bidireccional", "Instalación del medidor", "Arranque del sistema"];
  phases.forEach((phase, index) => { const row = index < 4 ? 0 : 1; const col = row === 0 ? index : index - 4; const columns = row === 0 ? 4 : 3; const stepW = CONTENT_W / columns; const x = MARGIN + col * stepW + stepW / 2; const cy = row === 0 ? 515 : 365; page.drawCircle({ x, y: cy, size: 14, color: index === 3 || index === 6 ? brand.accent : brand.primary }); const n = String(index + 1); page.drawText(n, { x: x - fonts.bold.widthOfTextAtSize(n, 8) / 2, y: cy - 3, size: 8, font: fonts.bold, color: WHITE }); const lines = wrap(phase, fonts.bold, 8.5, stepW - 14); lines.forEach((line, lineIndex) => page.drawText(line, { x: x - fonts.bold.widthOfTextAtSize(line, 8.5) / 2, y: cy - 34 - lineIndex * 11, size: 8.5, font: fonts.bold, color: INK })); });
  page.drawRectangle({ x: MARGIN, y: 175, width: CONTENT_W, height: 72, color: LIGHT }); paragraph(page, `${input.company.name} acompaña las gestiones aplicables ante CNE, la distribuidora y DGII, sujeto al alcance contratado y a los tiempos de respuesta de cada institución.`, MARGIN + 20, 218, { font: fonts.regular, size: 9, width: CONTENT_W - 40, lineHeight: 13 });

  // 8. Contraportada
  page = pdf.addPage([PAGE_W, PAGE_H]); page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: INK });
  if (backImage) page.drawImage(backImage, { x: 0, y: 455, width: PAGE_W, height: 337 });
  page.drawText(input.company.name.toUpperCase(), { x: MARGIN, y: 410, size: 11, font: fonts.bold, color: WHITE });
  page.drawText("TRANSFORMAMOS SU ENERGÍA", { x: MARGIN, y: 338, size: 27, font: fonts.display, color: WHITE });
  page.drawText(input.company.slogan || "Ingeniería que transforma energía", { x: MARGIN, y: 302, size: 12, font: fonts.displayItalic, color: brand.accent });
  page.drawRectangle({ x: MARGIN, y: 190, width: CONTENT_W, height: 70, color: rgb(.12, .17, .26) });
  const contacts = [["TELÉFONO", input.company.phone || "N/D"], ["EMAIL", input.company.email || "N/D"], ["UBICACIÓN", input.company.address || "República Dominicana"]];
  contacts.forEach(([label, value], index) => { const x = MARGIN + index * CONTENT_W / 3 + 16; page.drawText(label, { x, y: 235, size: 7, font: fonts.bold, color: brand.accent }); page.drawText(fitText(value, fonts.regular, 9, CONTENT_W / 3 - 28), { x, y: 214, size: 9, font: fonts.regular, color: WHITE }); });
  footer(page, input, fonts, brand, 8, true);

  pdf.setTitle(`Propuesta energética - ${input.customer.name}`);
  pdf.setAuthor(input.company.name);
  pdf.setSubject("Propuesta solar fotovoltaica");
  return pdf.save();
}
