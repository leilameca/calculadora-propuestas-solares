import type { ParsedUtilityBill } from "./types";

const aliases: Record<string, number> = { ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12 };
const months = Object.keys(aliases).sort((a, b) => b.length - a.length).join("|");
const monthToken = `(?:${months}|\\d{1,2})`;
const numeric = /-?\d+(?:[.,]\d+)*/g;
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const monthOf = (value: string) => aliases[fold(value)] ?? Number(value);

export function parseKwh(raw: string): number {
  const value = raw.replace(/\s/g, "");
  if (!/^-?\d+(?:[.,]\d+)*$/.test(value)) return NaN;
  if (value.includes(",") && value.includes(".")) {
    const decimal = value.lastIndexOf(",") > value.lastIndexOf(".") ? "," : ".";
    return Number(value.replace(decimal === "," ? /\./g : /,/g, "").replace(",", "."));
  }
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(value)) return Number(value.replace(/[.,]/g, ""));
  return Number(value.replace(",", "."));
}

export function validateBill(bill: ParsedUtilityBill, now = new Date()): ParsedUtilityBill {
  const warnings = [...bill.warnings];
  const maxYear = now.getFullYear() + 1;
  const validPeriod = (month: number, year: number) => Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= maxYear;
  const validKwh = (kwh: number) => Number.isFinite(kwh) && kwh > 0 && kwh <= 10_000_000;
  const records = new Map<string, ParsedUtilityBill["consumptionHistory"][number]>();
  const conflicts = new Set<string>();
  for (const record of bill.consumptionHistory) {
    if (!validPeriod(record.month, record.year) || !validKwh(record.kwh)) { warnings.push("Se descartó un período o consumo inválido."); continue; }
    const key = `${record.year}-${record.month}`;
    if (conflicts.has(key)) continue;
    const previous = records.get(key);
    if (previous) {
      warnings.push(`Mes duplicado: ${key}${previous.kwh !== record.kwh ? "; valores en conflicto, complete este mes manualmente" : ""}.`);
      if (previous.kwh !== record.kwh) { records.delete(key); conflicts.add(key); }
    } else records.set(key, { ...record });
  }
  const history = [...records.values()].sort((a, b) => a.year - b.year || a.month - b.month).slice(-12);
  if (history.length < 12) warnings.push(`Histórico incompleto: ${history.length} de 12 meses.`);
  const sortedValues = history.map(row => row.kwh).sort((a, b) => a - b);
  const median = sortedValues[Math.floor(sortedValues.length / 2)] ?? 0;
  if (history.some(row => row.kwh > 1_000_000 || (median > 0 && (row.kwh > median * 5 || row.kwh < median / 5)))) warnings.push("Consumo sospechoso: revise valores extremos y separadores numéricos.");
  for (let i = 1; i < history.length; i++) if (history[i].year * 12 + history[i].month - (history[i - 1].year * 12 + history[i - 1].month) !== 1) { warnings.push("Hay meses ausentes en el histórico."); break; }
  let currentConsumptionKwh = bill.currentConsumptionKwh, billingPeriod = bill.billingPeriod;
  if (currentConsumptionKwh !== undefined && !validKwh(currentConsumptionKwh)) { warnings.push("Consumo actual inválido."); currentConsumptionKwh = undefined; }
  if (billingPeriod && !validPeriod(billingPeriod.month, billingPeriod.year)) { warnings.push("Período facturado inválido."); billingPeriod = undefined; }
  const uniqueWarnings = [...new Set(warnings)];
  const score = (bill.utility !== "UNKNOWN" ? .15 : 0) + (bill.customerName ? .1 : 0) + (bill.nic || bill.contractNumber ? .1 : 0) + (bill.tariff ? .05 : 0) + (billingPeriod ? .05 : 0) + (currentConsumptionKwh ? .05 : 0) + Math.min(history.length / 12, 1) * .5;
  return { ...bill, billingPeriod, currentConsumptionKwh, consumptionHistory: history, warnings: uniqueWarnings, confidence: Math.max(0, Math.min(1, Math.round((score - Math.min(uniqueWarnings.length * .04, .3)) * 100) / 100)) };
}

export function parseUtilityBill(text: string, now = new Date()): ParsedUtilityBill {
  const normalized = text.normalize("NFC").replace(/\r/g, "").replace(/[|\t]/g, " ").replace(/[ ]+/g, " ").trim();
  const lower = fold(normalized);
  const utility = (["EDENORTE", "EDEESTE", "EDESUR"] as const).find(name => new RegExp(`\\b${name}\\b`, "i").test(lower)) ?? "UNKNOWN";
  const result: ParsedUtilityBill = { utility, consumptionHistory: [], confidence: 0, warnings: [] };
  if (!normalized) { result.warnings.push("PDF sin texto legible; necesita OCR o entrada manual."); return validateBill(result, now); }
  if (utility === "UNKNOWN") { result.warnings.push("Distribuidora no reconocida; no se infieren consumos."); return validateBill(result, now); }
  if (utility !== "EDENORTE") result.warnings.push(`Formato ${utility}: lectura genérica, revise todos los campos.`);

  const field = (label: string) => {
    const match = new RegExp(`(?:^|\\n|\\s)${label}[ .:#-]*([^\\n]+)`, "i").exec(lower);
    if (!match) return undefined;
    const start = match.index + match[0].length - match[1].length;
    return normalized.slice(start, start + match[1].length).split(/\s+(?:ITINER|MEDIDOR|RUTA|ENCF|NCF|NIC|CONTRATO|TARIFA|DIRECCI[ÓO]N|OFICINA|NO\.\s*FACTURA)\b/i)[0].trim() || undefined;
  };
  result.customerName = field("nombre(?: o razon social)?") ?? field("cliente");
  if (result.customerName && /^(oficina|no\. factura|fecha emision)/i.test(result.customerName)) result.customerName = undefined;
  result.address = field("direccion(?: suministro)?") ?? field("ubicacion");
  result.nic = /\bnic[ .:#-]*(\d{5,15})\b/i.exec(lower)?.[1];
  result.contractNumber = /\bcontrato[ .:#-]*([a-z0-9-]*\d[a-z0-9-]*)\b/i.exec(lower)?.[1];
  const tariff = /\b(bts[ -]?[12]|btd|bth|mtd[ -]?[12]n?|mth)\b/i.exec(lower)?.[1];
  result.tariff = tariff?.toUpperCase().replace(/^(BTS|MTD)[ -]?([12])N?$/, "$1-$2");
  const horizontalCustomer = /Mes\s+Mes\s+Csmo\s+Pot\.?\s+kWh\s+([^\n]{3,80}?)\s+(\d{6,10})\s/i.exec(normalized);
  if (horizontalCustomer) {
    result.customerName ??= horizontalCustomer[1].trim();
    result.contractNumber ??= horizontalCustomer[2];
    result.warnings.push("Identificador obtenido de layout horizontal: confirme si corresponde a NIC o contrato.");
  }
  result.address ??= /\b((?:CALLE|AV(?:ENIDA|DA)?|CARRETERA|AUTOPISTA)\s+.{4,100}?)\s+(?:Baja|Media)\b/i.exec(normalized)?.[1];
  const period = new RegExp(`(?:periodo(?: facturado| de facturacion)?|mes facturado)[ .:#-]*(${monthToken})[ .\\/-]+(\\d{4})\\b`, "i").exec(lower);
  const fullDate = /(?:periodo(?: facturado)?|fecha emision)[ .:#-]*\d{1,2}[/-](\d{1,2})[/-](\d{4})/i.exec(lower);
  if (period || fullDate) { const value = period ?? fullDate!; result.billingPeriod = { month: monthOf(value[1]), year: Number(value[2]) }; }
  const current = /(?:consumo actual|consumo facturado|energia consumida)[ .:#]*(?:kwh\s*)?(-?\d+(?:[.,]\d+)*)/i.exec(lower);
  if (current) result.currentConsumptionKwh = parseKwh(current[1]);

  const start = lower.search(/historico\s+de\s+consum/);
  const history = (start >= 0 ? lower.slice(start) : lower).split(/pague\s+antes|detalle\s+de\s+cargos|total\s+a\s+pagar/)[0];
  const lines = history.split("\n").map(line => line.trim()).filter(Boolean);
  let inferredYear: number | undefined, previousMonth: number | undefined;
  for (let i = 0; i < lines.length; i++) {
    const tokens = [...lines[i].matchAll(new RegExp(`\\b(${months})\\.?(?:[ /-]+(\\d{4}))?\\b`, "gi"))];
    // A row of month headings followed by one row of values is a column table.
    if (tokens.length >= 3 && lines[i].replace(new RegExp(`\\b(${months})\\.?(?:[ /-]+\\d{4})?\\b`, "gi"), "").trim().replace(/[ ,;-]/g, "") === "") {
      const values = lines[i + 1]?.match(numeric) ?? [];
      if (values.length !== tokens.length) { result.warnings.push("Tabla horizontal ambigua: cantidad de meses y valores distinta."); continue; }
      for (let j = 0; j < tokens.length; j++) {
        const m = monthOf(tokens[j][1]);
        if (tokens[j][2]) inferredYear = Number(tokens[j][2]);
        else if (inferredYear && previousMonth === 12 && m === 1) inferredYear++;
        if (inferredYear) result.consumptionHistory.push({ month: m, year: inferredYear, kwh: parseKwh(values[j]) });
        else result.warnings.push("Año ausente: complete el período manualmente.");
        previousMonth = m;
      }
      i++;
      continue;
    }
    const row = new RegExp(`^(${monthToken})\\.?[ /-]+(?:(\\d{4})(?:\\s+|[/:]\\s*))?(-?\\d+(?:[.,]\\d+)*)(?:\\s|$)`, "i").exec(lines[i]);
    if (!row || (start < 0 && !/kwh\b/i.test(lines[i]))) continue;
    const month = monthOf(row[1]);
    if (row[2]) inferredYear = Number(row[2]);
    else if (inferredYear && previousMonth === 12 && month === 1) inferredYear++;
    if (!inferredYear) { result.warnings.push("Año ausente: complete el período manualmente."); continue; }
    result.consumptionHistory.push({ month, year: inferredYear, kwh: parseKwh(row[3]) });
    previousMonth = month;
  }
  return validateBill(result, now);
}
