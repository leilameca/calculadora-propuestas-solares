import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { buildProposalDocument, type ProposalDocumentInput } from "@/lib/docx-builder";

export const runtime = "nodejs";

export async function POST(request:NextRequest){
  try{
    const payload=await request.json() as ProposalDocumentInput;
    const document=await buildProposalDocument(payload);
    const buffer=await Packer.toBuffer(document);
    return new NextResponse(new Uint8Array(buffer),{status:200,headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","Content-Disposition":`attachment; filename="propuesta-solar.docx"`}});
  }catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"No se pudo generar el documento"},{status:400}); }
}
