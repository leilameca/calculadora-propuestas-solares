import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { GetDocumentTextDetectionCommand, StartDocumentTextDetectionCommand, TextractClient } from "@aws-sdk/client-textract";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parseElectricInvoice } from "@/lib/ocr";
import { extractEmbeddedPdfText } from "@/lib/pdf-text";
import { sessionFromRequest } from "@/lib/auth";
import sharp from "sharp";
import { renderPdfPages } from "@/lib/pdf-images";
export const runtime="nodejs"; export const maxDuration=300;
async function prepareImage(bytes:Uint8Array){
  const source=sharp(Buffer.from(bytes),{failOn:"none"}).rotate();
  const metadata=await source.metadata();
  return source.resize({width:Math.max(1800,metadata.width||0),withoutEnlargement:false}).grayscale().normalize().sharpen().png().toBuffer();
}
async function recognizeImage(bytes:Uint8Array){
  const prepared=await prepareImage(bytes);
  const worker=await createWorker("spa");
  try{ return (await worker.recognize(prepared)).data.text; } finally { await worker.terminate(); }
}
async function recognizeScannedPdf(bytes:Uint8Array){
  const pages=await renderPdfPages(bytes);
  const worker=await createWorker("spa");
  try{
    const texts:string[]=[];
    for(const page of pages)texts.push((await worker.recognize(await prepareImage(page))).data.text);
    return texts.join("\n\n");
  }finally{await worker.terminate();}
}
async function recognizePdf(bytes:Uint8Array,fileName:string){
  const embeddedText=await extractEmbeddedPdfText(bytes).catch(()=>"");
  if(parseElectricInvoice(embeddedText).recognized) return embeddedText;
  const localText=await recognizeScannedPdf(bytes).catch(()=>"");
  if(parseElectricInvoice(localText).recognized)return localText;
  const bucket=process.env.AWS_TEXTRACT_S3_BUCKET; if(!bucket)return localText||embeddedText;
  const region=process.env.AWS_REGION||"us-east-1", key=`invoices/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g,"-")}`;
  const s3=new S3Client({region});
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:"application/pdf"}));
  const textract=new TextractClient({region}); const started=await textract.send(new StartDocumentTextDetectionCommand({DocumentLocation:{S3Object:{Bucket:bucket,Name:key}}}));
  if(!started.JobId) throw new Error("AWS Textract no inició el análisis.");
  try{
    for(let attempt=0;attempt<30;attempt++){ await new Promise((resolve)=>setTimeout(resolve,1500)); const result=await textract.send(new GetDocumentTextDetectionCommand({JobId:started.JobId})); if(result.JobStatus==="FAILED") throw new Error(result.StatusMessage||"AWS Textract no pudo leer el PDF."); if(result.JobStatus==="SUCCEEDED") return (result.Blocks||[]).filter((block)=>block.BlockType==="LINE").map((block)=>block.Text).filter(Boolean).join("\n"); }
    throw new Error("El OCR del PDF excedió el tiempo de espera.");
  } finally {
    await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key})).catch(()=>undefined);
  }
}
export async function POST(request:NextRequest){ try{ const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});const form=await request.formData(),file=form.get("file"); if(!(file instanceof File)) return NextResponse.json({error:"Adjunte una factura."},{status:400}); if(file.size>10*1024*1024) return NextResponse.json({error:"El archivo excede 10 MB."},{status:413}); const extension=file.name.toLowerCase().split(".").pop(),isPdf=file.type==="application/pdf"||extension==="pdf",isImage=file.type.startsWith("image/")||["png","jpg","jpeg","webp"].includes(extension||"");if(!isPdf&&!isImage)return NextResponse.json({error:"Formato no admitido. Use PDF, PNG o JPG."},{status:415}); const bytes=new Uint8Array(await file.arrayBuffer()); const text=isPdf?await recognizePdf(bytes,file.name):await recognizeImage(bytes); return NextResponse.json(parseElectricInvoice(text)); }catch(error){ const message=error instanceof Error?error.message:"OCR no disponible";return NextResponse.json({error:`No se pudo leer la factura: ${message}`},{status:422}); } }
