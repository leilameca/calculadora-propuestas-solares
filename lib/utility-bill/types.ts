export interface ParsedUtilityBill {
  utility: "EDENORTE" | "EDEESTE" | "EDESUR" | "UNKNOWN";
  customerName?: string;
  nic?: string;
  contractNumber?: string;
  tariff?: string;
  address?: string;
  billingPeriod?: { month: number; year: number };
  currentConsumptionKwh?: number;
  consumptionHistory: { month: number; year: number; kwh: number }[];
  confidence: number;
  warnings: string[];
  source?: "text" | "layout" | "ocr" | "textract" | "structured";
}

export interface StructuredBillExtractor {
  extract(input: { text: string; layoutText?: string; utility: ParsedUtilityBill["utility"] }): Promise<unknown>;
}
