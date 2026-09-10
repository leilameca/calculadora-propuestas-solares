import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiHandler<Context>(handler: (request: NextRequest, context: Context) => Promise<Response>) {
  return async (request: NextRequest, context: Context): Promise<Response> => {
    try { return await handler(request, context); }
    catch (error) {
      console.error("api.request_failed", { path: request.nextUrl.pathname, type: error instanceof Error ? error.name : "unknown" });
      return NextResponse.json({ error: error instanceof ZodError ? "Datos inválidos. Revise los campos, tipos y límites de la solicitud." : "No se pudo completar la solicitud. Revise los datos y archivos." }, { status: 400 });
    }
  };
}

export async function readForm(request: NextRequest): Promise<FormData> {
  const limit = 4 * 1024 * 1024 + 65536;
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Adjunte un archivo.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("El archivo excede 4 MB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
}
