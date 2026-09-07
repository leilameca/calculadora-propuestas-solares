import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { buildProposalDocument, type ProposalDocumentInput } from "@/lib/docx-builder";
import { sessionFromRequest } from "@/lib/auth";
import { addTenantEquipmentAttachments } from "@/lib/equipment-attachments";
import { loadSavedProposalForExport } from "@/lib/proposal-export";

export const runtime = "nodejs";

export async function POST(request:NextRequest){
  try{
    const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});
    const body=await request.json() as ProposalDocumentInput&{proposalId?:string};
    const base=body.proposalId?await loadSavedProposalForExport(body.proposalId,session.companyId):body;
    const payload=await addTenantEquipmentAttachments(base,session.companyId);
    const document=await buildProposalDocument(payload);
    const buffer=await Packer.toBuffer(document);
    return new NextResponse(new Uint8Array(buffer),{status:200,headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition":`attachment; filename="propuesta-solar.docx"`}});
  }catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"No se pudo generar el documento"},{status:400}); }
}
