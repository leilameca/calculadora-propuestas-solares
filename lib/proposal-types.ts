import type { SolarCalculationResult } from "./solar-calculator";
export interface ProposalDocumentInput {
  company: { name:string; rnc?:string; address?:string; phone?:string; email?:string; website?:string; slogan?:string; logoBase64?:string; coverImageBase64?:string; backCoverImageBase64?:string; primaryColor:string; secondaryColor:string; accentColor:string; proposalValidityDays?:number; itbisEnabled?:boolean; itbisRate?:number };
  customer: { name:string; nic?:string; address?:string; logoBase64?:string };
  project: { name:string; city:string; utility:string; tariff:string; systemType:string; panelWatts:number; inverter?:string; exchangeRate?:number };
  consumption: number[];
  result: SolarCalculationResult;
  quoteItems: Array<{ name:string; description?:string; quantity?:number; amountUsd:number }>;
  proposalNumber?: string;
  date?: string;
  selectedEquipmentIds?: string[];
  attachments?: Array<{ equipmentName:string; kind:"DATASHEET"|"CERTIFICATE"; fileName:string; mimeType:string; dataUrl:string }>;
  selectedEquipment?: Array<{name:string;type:string;brand?:string;model?:string;description?:string|null;powerWatts?:number|null;capacityKwh?:number|null;quantity?:number;warrantyYears?:number|null;logoUrl?:string|null}>;
  invoice?: {name:string;mimeType:string;dataUrl:string};
  proposalText?:string;
}
