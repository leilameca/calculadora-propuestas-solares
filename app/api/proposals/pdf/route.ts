import { apiHandler } from "@/lib/api-handler";
import { normalizeProposal } from "@/lib/proposal-validation";
import { prepareProposalAssets } from "@/lib/proposal-assets";
import { readJson } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { buildProposalPdf } from "@/lib/pdf-builder";
import { sessionFromRequest } from "@/lib/auth";
import { addTenantEquipmentAttachments } from "@/lib/equipment-attachments";
import { loadSavedProposalForExport } from "@/lib/proposal-export";

export const runtime = "nodejs";

async function handlePOST(request: NextRequest) {
  try {
    const session=await sessionFromRequest(request);
    if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});
    const body=await readJson(request);
    const base=typeof body.proposalId === "string"?await loadSavedProposalForExport(body.proposalId,session.companyId):normalizeProposal(body);
    const payload = await prepareProposalAssets(await addTenantEquipmentAttachments(base,session.companyId),session.companyId);
    const bytes = await buildProposalPdf(payload);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff",
        "Content-Disposition": 'attachment; filename="propuesta-solar.pdf"',
      },
    });
  } catch (error) {
    console.error("pdf.export_failed",{type:error instanceof Error?error.name:"unknown"});
    return NextResponse.json({ error: "No se pudo generar el PDF. Revise los datos y archivos de la propuesta." }, { status: 400 });
  }
}

export const POST = apiHandler(handlePOST);
