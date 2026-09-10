import { z } from "zod";
import type { NextRequest } from "next/server";
import { persistMedia } from "./storage/files";

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Cuerpo requerido.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 24 * 1024 * 1024) { await reader.cancel(); throw new Error("Solicitud demasiado grande."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return z.record(z.string(), z.unknown()).parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

const text = z.string().max(1000);
const media = z.string().max(5_600_000).nullable().optional();
export const mutationSchema = z.object({
  id: text.nullable().optional(), companyId: text.optional(), name: text.optional(), customerName: text.optional(), projectName: text.optional(),
  customerId: text.nullable().optional(), customerNic: text.nullable().optional(), customerAddress: text.nullable().optional(),
  nic: text.nullable().optional(), rnc: text.nullable().optional(), email: text.nullable().optional(), phone: text.nullable().optional(), address: text.nullable().optional(),
  city: text.optional(), utility: text.optional(), tariff: text.optional(), systemType: text.optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(), version: z.number().int().positive().optional(),
  exchangeRate: z.number().finite().nonnegative().max(1_000_000).optional(),
  subtotalUsd: z.number().finite().nonnegative().max(1e10).optional(), taxUsd: z.number().finite().nonnegative().max(1e10).optional(), totalUsd: z.number().finite().nonnegative().max(1e10).optional(),
  monthlyConsumption: z.array(z.number().finite().nonnegative().max(1e8)).length(12).optional(),
  calculationInput: z.record(z.string(), z.unknown()).optional(), calculationResult: z.record(z.string(), z.unknown()).optional(),
  quoteItems: z.array(z.object({ name: text, description: z.string().max(10000).optional(), quantity: z.number().finite().nonnegative().optional(), amountUsd: z.number().finite().nonnegative().max(1e10) })).max(200).optional(),
  selectedInverterId: text.nullable().optional(), manualInverter: text.nullable().optional(), validUntil: z.iso.datetime().optional(), notes: z.string().max(30000).nullable().optional(),
  type: z.enum(["PANEL", "INVERTER", "BATTERY", "STRUCTURE", "PROTECTION", "OTHER"]).optional(), brand: text.optional(), model: text.optional(), description: text.nullable().optional(),
  powerWatts: z.number().int().positive().nullable().optional(), capacityKwh: z.number().nonnegative().nullable().optional(), unitCostUsd: z.number().nonnegative().max(1e10).optional(), quantity: z.number().int().nonnegative().optional(), warrantyYears: z.number().int().nonnegative().nullable().optional(),
  logoUrl: media, projectImageUrl: media, customerLogo: media, customerProjectImage: media, invoiceData: media,
  invoiceName: text.nullable().optional(), invoiceMimeType: text.nullable().optional(),
});

export async function persistBodyMedia<T extends Record<string, unknown>>(body: T, companyId: string): Promise<T> {
  const result: Record<string, unknown> = { ...body };
  for (const field of ["logoUrl", "projectImageUrl", "customerLogo", "customerProjectImage", "coverImageUrl", "backCoverImageUrl", "invoiceData"]) {
    const value = body[field];
    if (typeof value === "string") result[field] = await persistMedia(value, companyId, typeof body.invoiceName === "string" && field === "invoiceData" ? body.invoiceName : field, field !== "invoiceData");
  }
  if (Array.isArray(body.coverImages)) result.coverImages = await Promise.all(body.coverImages.map(value => persistMedia(String(value), companyId, "portada")));
  assertMetadataOnly(result);
  return result as T;
}

function assertMetadataOnly(value: unknown, depth = 0): void {
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Número inválido.");
  if (depth > 15) throw new Error("Datos demasiado anidados.");
  if (typeof value === "string" && /data:[^;,]+;base64,/i.test(value)) throw new Error("Los archivos deben cargarse mediante los campos de medios.");
  if (value && typeof value === "object") for (const child of Object.values(value)) assertMetadataOnly(child, depth + 1);
}
