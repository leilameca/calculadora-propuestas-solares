import { apiHandler, readForm } from "@/lib/api-handler";
import { uploadFile } from "@/lib/storage/files";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

async function handlePOST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await sessionFromRequest(request);
    if (!session?.companyId) return NextResponse.json({ error: "Falta tenant" }, { status: 401 });
    const { id } = await context.params;
    const form = await readForm(request);
    const kind = form.get("kind");
    const file = form.get("file");
    if ((kind !== "datasheet" && kind !== "certificate") || !(file instanceof File)) return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
    if (!ACCEPTED_TYPES.has(file.type)) return NextResponse.json({ error: "Use PDF, PNG o JPG." }, { status: 415 });
    if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: "Cada documento debe pesar 4 MB o menos." }, { status: 413 });
    const equipment = await prisma.equipmentInventory.findFirst({ where: { id, companyId: session.companyId }, select: { id: true } });
    if (!equipment) return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    const data = (await uploadFile(session.companyId, new Uint8Array(await file.arrayBuffer()), file.name, file.type)).url;
    await prisma.equipmentInventory.update({ where: { id }, data: kind === "datasheet"
      ? { datasheetName: file.name, datasheetMimeType: file.type, datasheetData: data }
      : { certificateName: file.name, certificateMimeType: file.type, certificateData: data }
    });
    return NextResponse.json({ ok: true, kind, name: file.name });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el documento." }, { status: 400 });
  }
}

export const POST = apiHandler(handlePOST);
