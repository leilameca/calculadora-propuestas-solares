import { z } from "zod";
import { parseUtilityBill, validateBill } from "./parser";
import type { ParsedUtilityBill, StructuredBillExtractor } from "./types";

export interface BillReaders {
  textLayers: () => Promise<{ text: string; layoutText: string }>;
  ocr: () => Promise<string>;
  textract?: () => Promise<string>;
  structured?: StructuredBillExtractor;
}

const structuredSchema = z.object({
  utility: z.enum(["EDENORTE", "EDEESTE", "EDESUR", "UNKNOWN"]),
  customerName: z.string().max(300).optional(), nic: z.string().max(30).optional(), contractNumber: z.string().max(30).optional(), tariff: z.string().max(30).optional(), address: z.string().max(1000).optional(),
  billingPeriod: z.object({ month: z.number(), year: z.number() }).optional(), currentConsumptionKwh: z.number().optional(),
  consumptionHistory: z.array(z.object({ month: z.number(), year: z.number(), kwh: z.number() })).max(36),
});
const sufficient = (bill: ParsedUtilityBill) => bill.confidence >= .8 && bill.consumptionHistory.length === 12;

function logStageFailure(stage: "text" | "ocr" | "textract" | "structured", error: unknown) {
  console.error("invoice_reader.stage_failed", { stage, type: error instanceof Error ? error.name : "unknown" });
}

export async function readUtilityBill(readers: BillReaders): Promise<ParsedUtilityBill> {
  let best = parseUtilityBill("");
  let text = "", layoutText = "";
  const warnings: string[] = [];
  const consider = (candidate: ParsedUtilityBill) => { if (candidate.confidence > best.confidence || (!best.consumptionHistory.length && candidate.consumptionHistory.length)) best = candidate; };
  try {
    ({ text, layoutText } = await readers.textLayers());
    consider({ ...parseUtilityBill(text), source: "text" });
    if (!sufficient(best)) consider({ ...parseUtilityBill(layoutText), source: "layout" });
  } catch (error) {
    logStageFailure("text", error);
    warnings.push("No se pudo extraer el texto del PDF.");
  }
  if (!sufficient(best)) {
    try { consider({ ...parseUtilityBill(await readers.ocr()), source: "ocr" }); }
    catch (error) {
      logStageFailure("ocr", error);
      warnings.push("OCR local no disponible o documento fuera de los límites.");
    }
  }
  if (!sufficient(best) && readers.textract) {
    try { consider({ ...parseUtilityBill(await readers.textract()), source: "textract" }); }
    catch (error) {
      logStageFailure("textract", error);
      warnings.push("Textract no pudo completar el análisis.");
    }
  }
  if (!sufficient(best) && readers.structured) {
    try {
      const parsed = structuredSchema.parse(await readers.structured.extract({ text, layoutText, utility: best.utility }));
      consider(validateBill({ ...parsed, confidence: 0, warnings: ["Extracción estructurada: confirme los datos."], source: "structured" }));
    } catch (error) {
      logStageFailure("structured", error);
      warnings.push("Extracción estructurada inválida.");
    }
  }
  return { ...best, warnings: [...new Set([...best.warnings, ...warnings])] };
}
