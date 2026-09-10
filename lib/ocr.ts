import { MONTHS } from "./solar-calculator";
import { parseUtilityBill } from "./utility-bill/parser";
import type { ParsedUtilityBill } from "./utility-bill/types";
export type InvoiceOcrResult = ParsedUtilityBill & { recognized: boolean; requiresManualEntry: boolean; consumption: ParsedUtilityBill["consumptionHistory"]; rawText: string };
/** Compatibility facade for existing consumers; all results still require review. */
export function parseElectricInvoice(text: string): InvoiceOcrResult {
  const bill = parseUtilityBill(text);
  const recognized = bill.consumptionHistory.length >= 3;
  return {...bill,recognized,requiresManualEntry:!recognized,consumption:bill.consumptionHistory,rawText:text};
}
export function emptyConsumption() { return MONTHS.map((_,index)=>({month:index+1,year:new Date().getFullYear(),kwh:0})); }
