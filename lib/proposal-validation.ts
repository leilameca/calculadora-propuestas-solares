import { z } from "zod";
import type { ProposalDocumentInput } from "./proposal-types";

const string = z.string().max(1000);
const optional = string.nullish().transform(value => value || undefined);
const image = z.string().max(5_600_000).nullish().transform(value => value || undefined);
const number = z.number().finite().nonnegative().max(1e15).nullish().transform(value => value ?? 0);
const twelve = z.array(number).max(12).nullish().transform(values => Array.from({ length: 12 }, (_, index) => values?.[index] ?? 0));
const result = z.object({
  annualConsumption: number, averageMonthlyConsumption: number, requiredKwp: number, adjustedKwp: number, theoreticalPanelCount: number, panelCount: number, installedKwp: number, monthlyGenerationBase: number, annualGeneration: number, coveragePercent: number, co2AvoidedTons: number,
  monthlyGeneration: twelve, monthlyCoverage: twelve, costUsd: number, itbisUsd: number, totalUsd: number, totalDop: number, pricePerWpUsd: number, effectiveRate: number, monthlySavingsDop: number, annualSavingsDop: number, annualSavingsUsd: number, roiYears: number,
  projection25Years: z.array(z.object({ year: number, factor: number, generationKwh: number, savingsDop: number, accumulatedSavingsDop: number })).max(100).nullish().transform(value => value ?? []),
});
const media = z.object({ name: string, mimeType: string, dataUrl: image.transform(value => value ?? "") });
export const proposalSchema = z.object({
  company: z.object({ name: string.nullish().transform(value => value || "Empresa solar"), rnc: optional, address: optional, phone: optional, email: optional, website: optional, slogan: optional, logoBase64: image, coverImageBase64: image, backCoverImageBase64: image, primaryColor: optional.transform(value => value || "#0F4C5C"), secondaryColor: optional.transform(value => value || "#2F7D32"), accentColor: optional.transform(value => value || "#F2A900"), proposalValidityDays: z.number().int().min(1).max(365).optional(), itbisEnabled: z.boolean().optional(), itbisRate: z.number().min(0).max(1).optional() }),
  customer: z.object({ name: string.nullish().transform(value => value || "Cliente"), nic: optional, address: optional, logoBase64: image }),
  project: z.object({ name: optional.transform(value => value || "Sistema solar"), city: optional.transform(value => value || ""), utility: optional.transform(value => value || ""), tariff: optional.transform(value => value || ""), systemType: optional.transform(value => value || "On-Grid"), panelWatts: number, inverter: optional, exchangeRate: number }),
  consumption: twelve, result,
  quoteItems: z.array(z.object({ name: string, description: z.string().max(10000).nullish().transform(value => value || undefined), quantity: number.optional(), amountUsd: number })).max(200).nullish().transform(value => value ?? []),
  proposalNumber: optional, date: optional, proposalText: z.string().max(30000).nullish().transform(value => value || undefined),
  invoice: media.nullish().transform(value => value ?? undefined), selectedEquipmentIds: z.array(z.string().max(100)).max(100).optional(),
  selectedEquipment: z.array(z.object({ name: string, type: string, warrantyYears: number.optional(), logoUrl: image })).max(100).optional(),
  attachments: z.array(z.object({ equipmentName: string, kind: z.enum(["DATASHEET", "CERTIFICATE"]), fileName: string, mimeType: string, dataUrl: image.transform(value => value ?? "") })).max(100).optional(),
});

export function normalizeProposal(value: unknown): ProposalDocumentInput { return proposalSchema.parse(value); }
