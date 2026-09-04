import { MONTHS, type BilledConsumption } from "./solar-calculator";

const MONTH_ALIASES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6,
  jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

export interface InvoiceOcrResult {
  recognized: boolean;
  requiresManualEntry: boolean;
  customerName?: string;
  nic?: string;
  address?: string;
  tariff?: string;
  utility?: string;
  consumption: BilledConsumption[];
  rawText: string;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function cleanFieldValue(value: string): string {
  return value
    .split(/\s+(?:ITINER|MEDIDOR|RUTA|ENCF|NCF|REF\.?\s*PAGO|SUMINISTRO\s+NO|NO\.\s*FACTURA)\b/i)[0]
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractCustomerName(normalized: string): string | undefined {
  // Prioridad 1: "NOMBRE O RAZON SOCIAL" (con o sin acento)
  const match = normalized.match(/NOMBRE\s+O\s+RAZ[ÓO]N\s+SOCIAL\s*[:#-]?\s*([^\n]{3,80})/i);
  if (match?.[1]?.trim()) return cleanFieldValue(match[1]);

  // Prioridad 2: "NOMBRE" genérico (evitando TITULAR DE PAGO)
  const generic = normalized.match(/(?:^|\n)\s*NOMBRE\s*[:#-]?\s*([^\n]{3,80})/i);
  if (generic?.[1]?.trim()) return cleanFieldValue(generic[1]);

  return undefined;
}

function extractNic(normalized: string): string | undefined {
  const patterns = [
    /(?:NIC|CONTRATO|SUMINISTRO)\s*[:#-]?\s*([A-Z0-9-]{5,20})/i,
    /(?:NIC|CONTRATO|SUMINISTRO)\s*[:#-]?\s*([0-9]{5,15})/i,
    /\bNIC\s*[:#-]?\s*([0-9]{5,15})\b/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractTariff(normalized: string): string | undefined {
  const match = normalized.match(/\b(BTS[- ]?1|BTS[- ]?2|BTD|BTH|MTD[- ]?1N?|MTD[- ]?2N?|MTH)\b/i);
  const value = match?.[1]?.replace(/\s+/g, "-").toUpperCase();
  if (value?.startsWith("MTD1") || value?.startsWith("MTD-1")) return "MTD-1";
  if (value?.startsWith("MTD2") || value?.startsWith("MTD-2")) return "MTD-2";
  return value;
}

function extractAddress(normalized: string): string | undefined {
  const patterns = [
    /DIRECCI[ÓO]N\s+SUMINISTRO\s*[.:#-]*\s*([^\n]{5,120})/i,
    /(?:DIRECCI[ÓO]N|UBICACI[ÓO]N)\s*[.:#-]*\s*([^\n]{5,120})/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]?.trim()) return cleanFieldValue(match[1]);
  }
  return undefined;
}

function parseNumber(raw: string): number {
  if (raw.includes(",") && raw.includes(".")) {
    return raw.lastIndexOf(".") > raw.lastIndexOf(",")
      ? Number(raw.replace(/,/g, ""))
      : Number(raw.replace(/\./g, "").replace(",", "."));
  }
  if (raw.includes(",")) {
    const parts = raw.split(",");
    return parts.at(-1)?.length === 3 ? Number(raw.replace(/,/g, "")) : Number(raw.replace(",", "."));
  }
  return Number(raw);
}

function extractEdenorteHistory(normalized: string): BilledConsumption[] {
  const start = normalized.search(/HIST[ÓO]RICO\s+DE\s+CONSUMOS/i);
  if (start < 0) return [];
  const history = normalized.slice(start, normalized.search(/PAGUE\s+ANTES\s+DE/i) > start ? normalized.search(/PAGUE\s+ANTES\s+DE/i) : undefined);
  const records: BilledConsumption[] = [];
  let inferredYear: number | undefined;
  let previousMonth: number | undefined;

  for (const line of history.split("\n")) {
    const match = line.trim().match(/^(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(?:(20\d{2})\s+)?([\d.,]+)/i);
    if (!match) continue;
    const month = MONTH_ALIASES[match[1].toLowerCase()];
    if (!month) continue;
    const explicitYear = match[2] ? Number(match[2]) : undefined;
    if (explicitYear) inferredYear = explicitYear;
    else if (inferredYear && previousMonth && month < previousMonth) inferredYear += 1;
    const kwh = parseNumber(match[3]);
    if (inferredYear && Number.isFinite(kwh) && kwh > 0 && kwh < 1000000) {
      records.push({ month, year: inferredYear, kwh });
    }
    previousMonth = month;
  }
  return records;
}

function extractConsumption(normalized: string): BilledConsumption[] {
  const historyRecords = extractEdenorteHistory(normalized);
  if (historyRecords.length >= 3) {
    const uniqueHistory = [...new Map(historyRecords.map((item) => [`${item.year}-${item.month}`, item])).values()]
      .sort((a, b) => (a.year - b.year) || (a.month - b.month));
    return uniqueHistory.slice(-12);
  }

  const currentYear = new Date().getFullYear();
  const consumption: BilledConsumption[] = [];
  const lines = normalized.split("\n");

  for (const line of lines) {
    // Buscar nombre de mes en la línea
    const monthName = Object.keys(MONTH_ALIASES).find((alias) =>
      new RegExp(`\\b${alias}\\b`, "i").test(line)
    );
    if (!monthName) continue;

    // Buscar año (20XX)
    const yearMatch = line.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : currentYear;

    // Extraer todos los valores numéricos de la línea
    const values = [...line.matchAll(/\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+)\b/g)]
      .map((match) => parseNumber(match[1]))
      .filter((v) => Number.isFinite(v) && v > 0 && v !== year);

    // El último valor numérico suele ser el consumo kWh
    const kwh = values.at(-1);
    if (kwh && kwh > 0 && kwh < 100000) {
      consumption.push({ month: MONTH_ALIASES[monthName], year, kwh });
    }
  }

  // Eliminar duplicados por año-mes
  const unique = [...new Map(consumption.map((item) => [`${item.year}-${item.month}`, item])).values()];

  // Ordenar cronológicamente
  unique.sort((a, b) => (a.year - b.year) || (a.month - b.month));

  // Si hay 13+ meses, omitir el primer mes (mes base repetido del año anterior)
  // y tomar los 12 meses más recientes
  if (unique.length >= 13) {
    return unique.slice(unique.length - 12);
  }

  // Si hay menos de 13, tomar los últimos 12
  return unique.slice(-12);
}

export function parseElectricInvoice(text: string): InvoiceOcrResult {
  const normalized = normalizeText(text);
  const upper = normalized.toUpperCase();

  // Detectar distribuidora
  const utility = ["EDENORTE", "EDESUR", "EDEESTE"].find((name) => upper.includes(name));

  // Si no es EDENORTE, activar entrada manual
  if (utility !== "EDENORTE") {
    return { recognized: false, requiresManualEntry: true, utility, consumption: [], rawText: text };
  }

  const customerName = extractCustomerName(normalized);
  const nic = extractNic(normalized);
  const tariff = extractTariff(normalized);
  const address = extractAddress(normalized);
  const consumption = extractConsumption(normalized);

  return {
    recognized: true,
    requiresManualEntry: false,
    customerName,
    nic,
    address,
    tariff,
    utility,
    consumption,
    rawText: text,
  };
}

export function emptyConsumption() {
  return MONTHS.map((_, index) => ({ month: index + 1, year: new Date().getFullYear(), kwh: 0 }));
}
