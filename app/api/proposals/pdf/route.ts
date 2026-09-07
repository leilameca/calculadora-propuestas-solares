import { NextRequest, NextResponse } from "next/server";
import { buildProposalPdf } from "@/lib/pdf-builder";
import type { ProposalDocumentInput } from "@/lib/docx-builder";
import { sessionFromRequest } from "@/lib/auth";
import { addTenantEquipmentAttachments } from "@/lib/equipment-attachments";
import { loadSavedProposalForExport } from "@/lib/proposal-export";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session=await sessionFromRequest(request);
    if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});
    const body=await request.json() as ProposalDocumentInput&{proposalId?:string};
    const base=body.proposalId?await loadSavedProposalForExport(body.proposalId,session.companyId):body;
    const payload = await addTenantEquipmentAttachments(base,session.companyId);
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
