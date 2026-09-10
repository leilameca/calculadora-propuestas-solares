import { apiHandler } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { fileUrl, ownedFile, sha256 } from "@/lib/storage/files";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
async function handleGET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const file = await ownedFile(fileUrl((await context.params).id), session.companyId);
    const bytes = await getStorage(file.provider).read(file.key);
    if (bytes.length !== file.size || sha256(bytes) !== file.sha256) throw new Error("integrity");
    return new NextResponse(Buffer.from(bytes), { headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${file.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'",
    } });
  } catch { return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 }); }
}

export const GET = apiHandler(handleGET);
