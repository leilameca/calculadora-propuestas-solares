import { apiHandler } from "@/lib/api-handler";
import { normalizeProposal } from "@/lib/proposal-validation";
import { prepareProposalAssets } from "@/lib/proposal-assets";
import { readJson } from "@/lib/api-validation";
import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { buildProposalDocument } from "@/lib/docx-builder";
import { sessionFromRequest } from "@/lib/auth";
import { addTenantEquipmentAttachments } from "@/lib/equipment-attachments";
import { loadSavedProposalForExport } from "@/lib/proposal-export";

export const runtime = "nodejs";

async function handlePOST(request:NextRequest){
  try{
    const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});
    const body=await readJson(request);
    const base=typeof body.proposalId === "string"?await loadSavedProposalForExport(body.proposalId,session.companyId):normalizeProposal(body);
    const payload=await prepareProposalAssets(await addTenantEquipmentAttachments(base,session.companyId),session.companyId);
    const document=await buildProposalDocument(payload);
    const buffer=await Packer.toBuffer(document);
    return new NextResponse(new Uint8Array(buffer),{status:200,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition":`attachment; filename="propuesta-solar.docx"`}});
  }catch(error){ console.error("docx.export_failed",{type:error instanceof Error?error.name:"unknown"});return NextResponse.json({error:"No se pudo generar el documento. Revise los datos y archivos de la propuesta."},{status:400}); }
}

export const POST = apiHandler(handlePOST);
