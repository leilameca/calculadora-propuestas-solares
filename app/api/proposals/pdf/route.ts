import { NextRequest, NextResponse } from "next/server";
import { buildProposalPdf } from "@/lib/pdf-builder";
import type { ProposalDocumentInput } from "@/lib/docx-builder";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as ProposalDocumentInput;
    const bytes = await buildProposalPdf(payload);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="propuesta-solar.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar el PDF" }, { status: 400 });
  }
}
